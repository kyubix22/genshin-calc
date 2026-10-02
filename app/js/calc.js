/*
 * Motor de cálculo de daño de Genshin Impact.
 * Fórmulas según la mecánica oficial del juego (documentada por la comunidad
 * en Genshin Impact Wiki / KQM Theorycrafting Library):
 *
 *   Daño = (Σ Multiplicador × Atributo + Daño plano) × (1 + Bono de Daño)
 *          × Crítico × Multiplicador DEF × Multiplicador RES × Reacción amplificadora
 */
(function (root) {
  const GC = (root.GC = root.GC || {});

  // Multiplicador de nivel para reacciones (nivel del personaje).
  const LEVEL_MULT_POINTS = [
    [1, 17.17], [10, 34.14], [20, 80.58], [30, 136.29], [40, 207.38], [50, 323.6], [60, 492.88], [70, 765.64],
    [80, 1077.44], [81, 1110.0], [82, 1142.98], [83, 1176.37], [84, 1210.18], [85, 1253.84], [86, 1288.95],
    [87, 1325.48], [88, 1363.46], [89, 1405.1], [90, 1446.85], [95, 1561.47], [100, 1674.81],
  ];
  GC.levelMultiplier = function (level) {
    const pts = LEVEL_MULT_POINTS;
    if (level <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (level <= pts[i][0]) {
        const [l0, v0] = pts[i - 1];
        const [l1, v1] = pts[i];
        return v0 + ((v1 - v0) * (level - l0)) / (l1 - l0);
      }
    }
    return pts[pts.length - 1][1];
  };

  GC.ELEMENTS = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'];
  GC.ELEMENT_KEYS = { Pyro: 'pyro', Hydro: 'hydro', Anemo: 'anemo', Electro: 'electro', Dendro: 'dendro', Cryo: 'cryo', Geo: 'geo', Físico: 'phys' };

  // Reacciones transformativas: multiplicador base y elemento del daño.
  GC.TRANSFORMATIVE = {
    overloaded: { name: 'Sobrecarga', base: 2.75, element: 'Pyro', triggers: ['Pyro', 'Electro'] },
    electrocharged: { name: 'Electrocargado', base: 2.0, element: 'Electro', triggers: ['Hydro', 'Electro'] },
    superconduct: { name: 'Superconductor', base: 1.5, element: 'Cryo', triggers: ['Cryo', 'Electro'] },
    swirl: { name: 'Torbellino', base: 0.6, element: 'swirled', triggers: ['Anemo'] },
    shatter: { name: 'Fragmentación', base: 3.0, element: 'Físico', triggers: ['Geo'] },
    bloom: { name: 'Florecimiento', base: 2.0, element: 'Dendro', triggers: ['Hydro', 'Dendro'] },
    hyperbloom: { name: 'Hiperflorecimiento', base: 3.0, element: 'Dendro', triggers: ['Electro'] },
    burgeon: { name: 'Quemadura florida', base: 3.0, element: 'Dendro', triggers: ['Pyro'] },
    burning: { name: 'Quemadura (por tick)', base: 0.25, element: 'Pyro', triggers: ['Pyro', 'Dendro'] },
  };

  // Reacciones que modifican el golpe del propio personaje.
  GC.HIT_REACTIONS = {
    none: { name: 'Sin reacción' },
    vaporize: { name: 'Vaporizar', amp: { Pyro: 1.5, Hydro: 2.0 } },
    melt: { name: 'Derretir', amp: { Pyro: 2.0, Cryo: 1.5 } },
    aggravate: { name: 'Intensificar', add: { Electro: 1.15 } },
    spread: { name: 'Propagación', add: { Dendro: 1.25 } },
  };
  GC.reactionsForElement = function (el) {
    return Object.entries(GC.HIT_REACTIONS)
      .filter(([k, r]) => k === 'none' || (r.amp && r.amp[el]) || (r.add && r.add[el]))
      .map(([k, r]) => ({ key: k, name: r.name }));
  };

  // Bono de Maestría Elemental.
  GC.emAmplifying = (em) => (2.78 * em) / (em + 1400);
  GC.emAdditive = (em) => (5 * em) / (em + 1200);
  GC.emTransformative = (em) => (16 * em) / (em + 2000);
  GC.emCrystallize = (em) => (4.44 * em) / (em + 1400);

  GC.resMultiplier = function (res) {
    if (res < 0) return 1 - res / 2;
    if (res < 0.75) return 1 - res;
    return 1 / (4 * res + 1);
  };
  GC.defMultiplier = function (charLevel, enemyLevel, defReduction = 0, defIgnore = 0) {
    const k = (enemyLevel + 100) * (1 - Math.min(defReduction, 0.9)) * (1 - defIgnore);
    return (charLevel + 100) / (charLevel + 100 + k);
  };

  /* ---------- Lectura de las filas de talentos ---------- */

  const STAT_PATTERNS = [
    [/vida m[áa]x/i, 'hp'],
    [/maestr[íi]a elemental/i, 'em'],
    [/\bDEF\b/, 'def'],
    [/\bATQ\b/, 'atk'],
  ];
  const UNSCALED = /pacto vital|vida actual|cantidad curada|daño de ATQ Normal|personaje correspondiente|por pt\.|\/pt\.|por carga|\/carga|cargas/i;

  function splitTop(str, sep) {
    const out = [];
    let depth = 0;
    let cur = '';
    for (const ch of str) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function classify(name) {
    const n = name.toLowerCase();
    if (/curaci[óo]n|regeneraci[óo]n|recuperaci[óo]n de vida|cura(?!d)/.test(n)) return 'heal';
    if (/absorci[óo]n|escudo/.test(n) && !/daño de/.test(n)) return 'shield';
    if (/bono|aumento|reducci|coste|consumo|intervalo|duraci|conversi|incremento|% de daño|vida perdida|energ/.test(n)) return 'info';
    if (/da[ñn]o|disparo|ataque cargado|golpe|tajo|corte/.test(n)) return 'dmg';
    return 'info';
  }

  /**
   * Convierte las etiquetas de un talento en filas calculables para un nivel de talento.
   * Cada fila: { name, kind, terms:[{stat,mult}], flat, hits, text }
   */
  GC.parseTalent = function (attrs, talentLevel) {
    if (!attrs) return [];
    const idx = Math.max(0, Math.min(14, talentLevel - 1));
    const rows = [];
    for (const label of attrs.l) {
      const [rawName, fmt = ''] = label.split('|');
      // Separa variantes "a/b" sólo cuando cada lado contiene un parámetro.
      const variants = [];
      for (const seg of splitTop(fmt, '/')) {
        if (variants.length && !/\{param/.test(seg)) variants[variants.length - 1] += `/${seg}`;
        else variants.push(seg);
      }
      let names = [rawName];
      if (variants.length > 1) {
        const m = rawName.match(/(\S+\/\S+)/);
        const opts = m ? m[1].split('/') : null;
        names = variants.map((_, i) => (opts && opts.length === variants.length ? rawName.replace(m[1], opts[i]) : `${rawName} (${i + 1})`));
      }
      variants.forEach((variant, vi) => {
        const name = names[vi];
        let kind = classify(name);
        const parts = splitTop(variant, '+');
        const terms = [];
        let flat = 0;
        let hits = 1;
        let text = variant;
        let hasPct = false;
        let unscaled = false;
        for (const part of parts) {
          const m = part.match(/\{param(\d+):([A-Z0-9]+)\}(.*)/);
          if (!m) continue;
          const values = attrs.p[m[1]];
          const v = values ? values[Math.min(idx, values.length - 1)] : 0;
          const fmtCode = m[2];
          const suffix = m[3] || '';
          const mh = suffix.match(/[×x]\s*(\d+)/);
          if (mh) hits = parseInt(mh[1], 10);
          text = text.replace(m[0].slice(0, m[0].length - suffix.length), fmtValue(v, fmtCode));
          if (fmtCode.includes('P')) {
            hasPct = true;
            if (UNSCALED.test(suffix)) { unscaled = true; continue; }
            let stat = 'atk';
            for (const [re, s] of STAT_PATTERNS) if (re.test(suffix)) { stat = s; break; }
            terms.push({ stat, mult: v });
          } else if (/^I$|^F\d$/.test(fmtCode) && !/^(s\b|s\.|seg|pts|cargas)/.test(suffix.trim()) && (kind === 'heal' || kind === 'shield' || (kind === 'dmg' && terms.length))) {
            flat += v;
          }
        }
        if (kind !== 'info' && (!hasPct || !terms.length)) kind = 'info';
        if (unscaled && !terms.length) kind = 'info';
        rows.push({ name, kind, terms, flat, hits, text: text.trim() });
      });
    }
    return rows;
  };

  function fmtValue(v, code) {
    if (code.includes('P')) {
      const d = code.match(/F(\d)/);
      return `${(v * 100).toFixed(d ? +d[1] : 0)}%`;
    }
    const d = code.match(/F(\d)/);
    return d ? v.toFixed(+d[1]) : Math.round(v).toString();
  }
  GC.fmtValue = fmtValue;

  /** Busca el valor de una fila de talento (por coincidencia de nombre) al nivel indicado. */
  GC.talentValue = function (attrs, labelRegex, talentLevel, termIndex = 0) {
    if (!attrs) return 0;
    const idx = Math.max(0, Math.min(14, talentLevel - 1));
    for (const label of attrs.l) {
      const [name, fmt = ''] = label.split('|');
      if (!labelRegex.test(name)) continue;
      const params = [...fmt.matchAll(/\{param(\d+):/g)].map((x) => x[1]);
      const p = attrs.p[params[termIndex]];
      if (p) return p[Math.min(idx, p.length - 1)];
    }
    return 0;
  };

  /* ---------- Categoría y elemento de cada golpe ---------- */

  GC.hitCategory = function (talentKey, rowName) {
    if (talentKey === 'combat2') return 'skill';
    if (talentKey === 'combat3') return 'burst';
    const n = rowName.toLowerCase();
    if (/ca[íi]da|descendente/.test(n)) return 'plunge';
    if (/cargad|disparo preciso|apuntado|flecha|carga/.test(n)) return 'charged';
    return 'normal';
  };

  GC.hitElement = function (char, talentKey, rowName, infusion) {
    if (talentKey !== 'combat1') return char.element;
    if (char.weapon === 'Catalizador') return char.element;
    if (infusion) return char.element;
    if (char.weapon === 'Arco') {
      const n = rowName.toLowerCase();
      if (/disparo preciso|apuntado/.test(n) && /carg|completa|nivel/.test(n)) return char.element;
      if (/flecha|explosi|florecillas|bala|lluvia/.test(n) && !/^daño de \d/.test(n)) return char.element;
    }
    return 'Físico';
  };

  /* ---------- Estadísticas base ---------- */

  GC.charBase = function (char, levelKey) {
    const s = char.stats[levelKey] || char.stats['90'];
    return { hp: s[0], atk: s[1], def: s[2], asc: s[3] };
  };
  GC.weaponBase = function (weapon, levelKey) {
    if (!weapon) return { atk: 0, sub: 0 };
    const s = weapon.stats[levelKey] || weapon.stats['90'] || Object.values(weapon.stats).pop();
    return { atk: s[0], sub: s[1] };
  };
  GC.levelNumber = (key) => parseInt(key, 10);

  /**
   * Aplica modificadores sobre las estadísticas del panel.
   * panel: { hp, atk, def, em, cr, cd, er, heal, dmg:{pyro,...,phys} } (valores tal como en el juego, % como fracción)
   * base:  { hp, atk, def } — Vida/ATQ/DEF base (personaje + arma) para los bonos porcentuales.
   * mods:  [{ key, value, label, source }]
   */
  GC.applyMods = function (panel, base, mods) {
    const s = {
      hp: panel.hp, atk: panel.atk, def: panel.def, em: panel.em, cr: panel.cr, cd: panel.cd, er: panel.er,
      heal: panel.heal || 0, shield: panel.shield || 0, dmg: { ...panel.dmg }, cat: { ...(panel.dmgCat || {}) }, crCat: {}, cdCat: {}, flat: {},
      res: {}, defRed: 0, defIgn: 0, rx: {}, mult: {}, rowAdd: [],
    };
    for (const m of mods) {
      const v = m.value;
      const [k, sub] = m.key.split(':');
      switch (k) {
        case 'atkPct': s.atk += base.atk * v; break;
        case 'atkFlat': s.atk += v; break;
        case 'hpPct': s.hp += base.hp * v; break;
        case 'hpFlat': s.hp += v; break;
        case 'defPct': s.def += base.def * v; break;
        case 'defFlat': s.def += v; break;
        case 'em': s.em += v; break;
        case 'cr': if (sub) s.crCat[sub] = (s.crCat[sub] || 0) + v; else s.cr += v; break;
        case 'cd': if (sub) s.cdCat[sub] = (s.cdCat[sub] || 0) + v; else s.cd += v; break;
        case 'er': s.er += v; break;
        case 'heal': s.heal += v; break;
        case 'shield': s.shield += v; break;
        case 'dmg':
          if (['pyro', 'hydro', 'anemo', 'electro', 'dendro', 'cryo', 'geo', 'phys', 'all', 'elemental'].includes(sub)) s.dmg[sub] = (s.dmg[sub] || 0) + v;
          else s.cat[sub] = (s.cat[sub] || 0) + v;
          break;
        case 'flat': s.flat[sub || 'all'] = (s.flat[sub || 'all'] || 0) + v; break;
        case 'res': s.res[sub || 'all'] = (s.res[sub || 'all'] || 0) + v; break;
        case 'defRed': s.defRed += v; break;
        case 'defIgn': s.defIgn += v; break;
        case 'rx': s.rx[sub] = (s.rx[sub] || 0) + v; break;
        case 'mult': s.mult[sub] = (s.mult[sub] || 0) + v; break;
        case 'rowAdd': s.rowAdd.push(m); break;
        default: break;
      }
    }
    return s;
  };

  /**
   * Calcula un golpe.
   * hit: { terms, flat, hits, element, category, kind }
   * s: estadísticas finales (de applyMods)
   * opts: { charLevel, enemy:{level, res}, reaction }
   */
  GC.computeHit = function (hit, s, opts) {
    let scaled = hit.terms.reduce((acc, t) => acc + t.mult * (s[t.stat] || 0), 0);
    for (const r of s.rowAdd || []) if (r.category === hit.category && r.re.test(hit.name)) scaled += r.value * (s[r.stat] || 0);
    if (hit.kind === 'heal') {
      const v = (scaled + hit.flat) * (1 + s.heal);
      return { nonCrit: v, crit: v, avg: v, hits: hit.hits };
    }
    if (hit.kind === 'shield') {
      const v = (scaled + hit.flat) * (1 + s.shield);
      return { nonCrit: v, crit: v, avg: v, hits: hit.hits };
    }
    const el = hit.element;
    const ek = GC.ELEMENT_KEYS[el] || 'phys';
    const cat = hit.category;
    const reaction = GC.HIT_REACTIONS[opts.reaction] || GC.HIT_REACTIONS.none;
    let baseDmg = scaled * (1 + (s.mult[cat] || 0)) + hit.flat + (s.flat.all || 0) + (s.flat[cat] || 0) + (s.flat[ek] || 0);
    let additive = 0;
    if (reaction.add && reaction.add[el]) {
      additive = reaction.add[el] * GC.levelMultiplier(opts.charLevel) * (1 + GC.emAdditive(s.em) + (s.rx[opts.reaction] || 0));
      baseDmg += additive;
    }
    const dmgBonus = (s.dmg[ek] || 0) + (s.dmg.all || 0) + (ek !== 'phys' ? s.dmg.elemental || 0 : 0) + (s.cat[cat] || 0);
    const cr = Math.max(0, Math.min(1, s.cr + (s.crCat[cat] || 0)));
    const cd = s.cd + (s.cdCat[cat] || 0);
    const res = (opts.enemy.res ?? 0.1) - (s.res[ek] || 0) - (s.res.all || 0);
    const defMult = GC.defMultiplier(opts.charLevel, opts.enemy.level, s.defRed, s.defIgn);
    const resMult = GC.resMultiplier(res);
    let amp = 1;
    if (reaction.amp && reaction.amp[el]) amp = reaction.amp[el] * (1 + GC.emAmplifying(s.em) + (s.rx[opts.reaction] || 0));
    const nonCrit = baseDmg * (1 + dmgBonus) * defMult * resMult * amp;
    return {
      nonCrit, crit: nonCrit * (1 + cd), avg: nonCrit * (1 + cr * cd), hits: hit.hits,
      detail: { scaled, baseDmg, additive, dmgBonus, cr, cd, res, defMult, resMult, amp },
    };
  };

  /** Daño de reacción transformativa (no crítico, ignora DEF). */
  GC.computeTransformative = function (key, s, opts, swirlElement) {
    const r = GC.TRANSFORMATIVE[key];
    const el = r.element === 'swirled' ? swirlElement || 'Pyro' : r.element;
    const ek = GC.ELEMENT_KEYS[el] || 'phys';
    const res = (opts.enemy.res ?? 0.1) - (s.res[ek] || 0) - (s.res.all || 0);
    const v = r.base * GC.levelMultiplier(opts.charLevel) * (1 + GC.emTransformative(s.em) + (s.rx[key] || 0)) * GC.resMultiplier(res);
    return { name: r.name, element: el, value: v };
  };

  /** Valor medio de una mejora de subestadística en artefactos 5★ (tirada media). */
  GC.SUBSTAT_ROLL = {
    atkPct: { label: 'ATQ%', value: 0.0496 }, hpPct: { label: 'Vida%', value: 0.0496 }, defPct: { label: 'DEF%', value: 0.062 },
    cr: { label: 'Prob. CRIT', value: 0.033 }, cd: { label: 'Daño CRIT', value: 0.066 }, em: { label: 'Maestría Elemental', value: 19.82 },
    er: { label: 'Recarga de Energía', value: 0.0551 }, atkFlat: { label: 'ATQ plano', value: 16.54 }, hpFlat: { label: 'Vida plana', value: 253.94 },
    defFlat: { label: 'DEF plana', value: 19.68 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
