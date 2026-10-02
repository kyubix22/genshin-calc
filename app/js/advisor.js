/*
 * Consejero: análisis experto local (cálculos marginales reales con el motor)
 * y Oráculo IA opcional mediante la API de Claude (clave del usuario).
 */
(function (root) {
  const GC = (root.GC = root.GC || {});

  // Recarga de Energía orientativa (la comunidad la ajusta según equipo y rotación).
  const ER_TARGETS = {
    'Raiden Shogun': [2.5, 2.7], Xiangling: [1.8, 2.0], Xingqiu: [1.6, 1.8], Bennett: [1.8, 2.2], Yelan: [1.6, 1.8],
    Furina: [1.6, 2.0], 'Kaedehara Kazuha': [1.6, 1.8], Sucrose: [1.4, 1.6], Venti: [1.6, 1.8], Fischl: [1.1, 1.3],
    Beidou: [1.8, 2.0], Eula: [1.2, 1.3], 'Hu Tao': [1.0, 1.1], Ganyu: [1.0, 1.2], 'Kamisato Ayaka': [1.2, 1.4],
    Nahida: [1.0, 1.2], Zhongli: [1.0, 1.1], 'Sangonomiya Kokomi': [1.1, 1.3], Neuvillette: [1.1, 1.2], Shenhe: [1.5, 1.7],
    Mona: [1.8, 2.0], 'Yun Jin': [1.6, 1.8], Rosaria: [1.4, 1.6], Chongyun: [1.6, 1.8], 'Kujou Sara': [2.0, 2.2],
    Faruzan: [2.2, 2.6], Albedo: [1.0, 1.2], 'Arataki Itto': [1.3, 1.4], Diona: [1.6, 1.8], Layla: [1.0, 1.3],
    Xiao: [1.2, 1.4], Tartaglia: [1.2, 1.3], 'Yae Miko': [1.15, 1.3], Wanderer: [1.0, 1.15], Arlecchino: [1.0, 1.1],
    Navia: [1.2, 1.4], Clorinde: [1.0, 1.2], Mavuika: [1.0, 1.1], Citlali: [1.4, 1.6], Xilonen: [1.4, 1.6],
    Escoffier: [1.6, 1.8], Chevreuse: [1.6, 2.0], Candace: [1.6, 2.0], Gorou: [1.8, 2.0], Lynette: [1.4, 1.6],
  };

  const MAINS = {
    sands: [['atkPct', 0.466, 'ATQ%'], ['hpPct', 0.466, 'Vida%'], ['defPct', 0.583, 'DEF%'], ['em', 186.5, 'Maestría Elemental'], ['er', 0.518, 'Recarga de Energía']],
    goblet: [['elem', 0.466, 'Bono de Daño Elemental'], ['phys', 0.583, 'Bono de Daño Físico'], ['atkPct', 0.466, 'ATQ%'], ['hpPct', 0.466, 'Vida%'], ['defPct', 0.583, 'DEF%'], ['em', 186.5, 'Maestría Elemental']],
    circlet: [['cr', 0.311, 'Prob. CRIT'], ['cd', 0.622, 'Daño CRIT'], ['atkPct', 0.466, 'ATQ%'], ['hpPct', 0.466, 'Vida%'], ['defPct', 0.583, 'DEF%'], ['em', 186.5, 'Maestría Elemental'], ['heal', 0.359, 'Bono de Curación']],
  };

  function addToPanel(panel, base, key, value, element) {
    const p = { ...panel, dmg: { ...panel.dmg } };
    if (key === 'atkFlat') p.atk += value;
    else if (key === 'hpFlat') p.hp += value;
    else if (key === 'defFlat') p.def += value;
    else if (key === 'elem') p.dmg[GC.ELEMENT_KEYS[element] || 'phys'] += value;
    else if (key === 'phys') p.dmg.phys += value;
    else GC.addStat(p, key, value, base.hp, base.atk, base.def);
    return p;
  }

  /** Métrica a optimizar: valor medio de la fila elegida (daño, curación o escudo). */
  function metric(ev, target) {
    const t = ev.talents[target.talentKey];
    const row = t && t.rows[target.rowIndex];
    if (!row || !row.result) return 0;
    return row.result.avg * (row.hits || 1);
  }

  GC.defaultTarget = function (char, prof, opts) {
    const ev = GC.evaluate(char, prof, opts);
    let best = null;
    for (const key of ['combat3', 'combat2', 'combat1']) {
      (ev.talents[key]?.rows || []).forEach((r, i) => {
        if (r.kind !== 'dmg' || !r.result || r.category === 'plunge') return;
        const v = r.result.avg * (r.hits || 1);
        if (!best || v > best.v) best = { talentKey: key, rowIndex: i, v };
      });
    }
    return best || { talentKey: 'combat1', rowIndex: 0 };
  };

  GC.advise = function (char, prof, opts, target) {
    const ev = GC.evaluate(char, prof, opts);
    const row = ev.talents[target.talentKey]?.rows[target.rowIndex];
    const base = GC.baseOf(char, prof);
    const panel = GC.panelOf(char, prof);
    const baseValue = metric(ev, target);
    const element = row?.element || char.element;
    const evalWith = (p, extra = {}) => metric(GC.evaluate(char, { ...prof, ...extra, panel: p }, opts), target);
    const pct = (v) => (baseValue > 0 ? (v / baseValue - 1) * 100 : 0);

    // 1) Prioridad de subestadísticas (una tirada media de 5★).
    const subs = Object.entries(GC.SUBSTAT_ROLL)
      .map(([key, r]) => ({ key, label: r.label, gain: pct(evalWith(addToPanel(panel, base, key, r.value, element))) }))
      .sort((a, b) => b.gain - a.gain);

    // 2) Estadística principal por pieza.
    const mains = {};
    for (const [slot, list] of Object.entries(MAINS)) {
      mains[slot] = list
        .map(([key, val, label]) => ({ key, label, gain: pct(evalWith(addToPanel(panel, base, key, val, element))) }))
        .sort((a, b) => b.gain - a.gain);
    }

    // 3) Ranking de armas del mismo tipo (5★ R1, 4★/3★ R5, nivel 90).
    const weapons = root.GAMEDATA.weapons
      .filter((w) => w.type === char.weapon && w.rarity >= 3 && w.stats['90'])
      .map((w) => {
        const refine = w.rarity >= 5 ? 1 : 5;
        const p = GC.swapWeaponPanel(char, prof, w.id);
        const v = metric(GC.evaluate(char, { ...prof, weaponId: w.id, weaponLevel: '90', refine, panel: p, toggles: { ...prof.toggles, weapon: true } }, opts), target);
        return { w, refine, value: v, gain: pct(v), modeled: !!GC.WEAPON_EFFECTS[w.en] };
      })
      .sort((a, b) => b.value - a.value);

    // 4) Ranking de sets de artefactos modelados.
    const sets = root.GAMEDATA.artifacts
      .filter((a) => GC.ARTIFACT_EFFECTS[a.en] && a.rarity >= 4)
      .map((a) => {
        const p = GC.swapSetPanel(char, prof, a.id);
        const v = metric(GC.evaluate(char, { ...prof, setId: a.id, set2Id: null, panel: p, toggles: { ...prof.toggles, set: true } }, opts), target);
        return { a, value: v, gain: pct(v) };
      })
      .sort((a, b) => b.value - a.value);

    // 5) Diagnósticos.
    const s = ev.stats;
    const tips = [];
    const cr = s.cr + (s.crCat[row?.category] || 0);
    const cd = s.cd + (s.cdCat[row?.category] || 0);
    const cv = (cr * 2 + cd) * 100;
    let critMsg;
    if (row?.kind !== 'dmg') critMsg = 'Esta fila no puede ser crítica: prioriza el atributo con el que escala.';
    else if (cr > 1) critMsg = `Tu Prob. CRIT efectiva es ${(cr * 100).toFixed(1)}%: el exceso sobre 100% se desperdicia. Cambia tirada de Prob. CRIT por Daño CRIT.`;
    else if (cr * 2 < cd - 0.4) critMsg = `Ratio 1:${(cd / cr).toFixed(2)}. Tienes demasiado Daño CRIT para tu Prob. CRIT; sube la Prob. CRIT (ideal cercano a 1:2).`;
    else if (cr * 2 > cd + 0.4) critMsg = `Ratio 1:${(cd / cr).toFixed(2)}. Te falta Daño CRIT; considera una diadema de Daño CRIT si tu Prob. CRIT ya ronda el 60-70%.`;
    else critMsg = `Ratio 1:${(cd / cr).toFixed(2)}: equilibrado. Valor CRIT total ≈ ${cv.toFixed(0)}.`;

    const erT = ER_TARGETS[char.en];
    let erMsg;
    if (erT) {
      const [lo, hi] = erT;
      if (s.er < lo) erMsg = `Recomendado ${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}% de Recarga para tener la Definitiva en cada rotación; tienes ${(s.er * 100).toFixed(0)}%. Prioriza Recarga hasta alcanzarlo.`;
      else if (s.er > hi + 0.2 && char.en !== 'Raiden Shogun') erMsg = `Tienes ${(s.er * 100).toFixed(0)}% de Recarga, por encima de lo habitual (${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%). Puedes cambiar parte por estadísticas de daño.`;
      else erMsg = `Recarga en rango (${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%). Bien.`;
    } else {
      erMsg = `Sin objetivo específico registrado; como regla general 120–140% para personajes que dependen de su Definitiva. Tienes ${(s.er * 100).toFixed(0)}%.`;
    }

    if (row?.kind === 'dmg' && ['Pyro', 'Hydro', 'Cryo'].includes(element) && opts.reaction === 'none') {
      const reacts = GC.reactionsForElement(element).filter((r) => r.key !== 'none');
      const best = reacts.map((r) => ({ r, v: metric(GC.evaluate(char, prof, { ...opts, reaction: r.key }), target) })).sort((a, b) => b.v - a.v)[0];
      if (best && best.v > baseValue) tips.push(`Provocar ${best.r.name} en este golpe multiplicaría su daño medio por ×${(best.v / baseValue).toFixed(2)} (${Math.round(best.v).toLocaleString('es')}).`);
    }
    if (row?.kind === 'dmg' && ['Electro', 'Dendro'].includes(element) && opts.reaction === 'none') {
      const key = element === 'Electro' ? 'aggravate' : 'spread';
      const v = metric(GC.evaluate(char, prof, { ...opts, reaction: key }), target);
      if (v > baseValue) tips.push(`Con ${GC.HIT_REACTIONS[key].name} (Catálisis) este golpe sube un +${pct(v).toFixed(1)}%.`);
    }
    const curW = weapons.findIndex((x) => x.w.id === prof.weaponId);
    if (curW > 2) tips.push(`Tu arma actual ocupa el puesto ${curW + 1} de ${weapons.length} para este golpe. La mejor opción calculada es ${weapons[0].w.name} (+${(weapons[0].gain).toFixed(1)}%).`);

    return { baseValue, row, element, subs, mains, weapons, sets, critMsg, erMsg, tips, stats: s, cr, cd };
  };

  /* ---------------- Oráculo IA (API de Claude) ---------------- */

  const SYSTEM_PROMPT = `Eres un theorycrafter veterano de Genshin Impact (estilo KQM) que asesora en español.
Recibes la build real del jugador (personaje, constelación, talentos, arma, artefactos, atributos de panel, equipo y enemigo) y los resultados del motor de daño de la app.
Responde con recomendaciones concretas y priorizadas para lo que el jugador quiere mejorar: subestadísticas, estadísticas principales, armas alternativas (incluidas 4★ accesibles), sets de artefactos, compañeros de equipo, rotación y reacciones.
Apóyate en los números del contexto; si sugieres un cambio, explica por qué aumenta el daño, la curación o la supervivencia. No inventes mecánicas: si algo depende de la versión del juego, dilo.
Sé breve y útil: viñetas cortas, como mucho unas 300 palabras salvo que el jugador pida más detalle.`;

  let sdkPromise = null;
  function loadSdk() {
    if (!sdkPromise) sdkPromise = import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@latest/+esm');
    return sdkPromise;
  }

  /**
   * Pregunta al Oráculo. onText recibe el texto a medida que llega.
   * La clave se usa sólo desde este navegador (dangerouslyAllowBrowser).
   */
  GC.askOracle = async function ({ apiKey, question, context, onText }) {
    const mod = await loadSdk();
    const Anthropic = mod.default || mod.Anthropic;
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const stream = client.beta.messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Contexto de mi build (JSON):\n${JSON.stringify(context)}\n\nMi pregunta: ${question}`,
      }],
    });
    stream.on('text', (t) => onText && onText(t));
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') throw new Error('El modelo declinó responder a esta consulta. Prueba a reformularla.');
    return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
