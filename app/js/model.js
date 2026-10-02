/*
 * Une datos + motor: perfiles de personaje, panel por defecto, ensamblado de
 * modificadores (propios, de equipo y resonancias) y evaluación completa.
 */
(function (root) {
  const GC = (root.GC = root.GC || {});
  const D = () => root.GAMEDATA;

  GC.byId = (list, id) => list.find((x) => x.id === id);
  GC.char = (id) => GC.byId(D().characters, id);
  GC.weapon = (id) => GC.byId(D().weapons, id);
  GC.artifact = (id) => GC.byId(D().artifacts, id);
  GC.charByEn = (en) => D().characters.find((c) => c.en === en);

  const DEFAULT_WEAPON = {
    'Espada ligera': 'favonius-sword', Mandoble: 'favonius-greatsword', Lanza: 'favonius-lance',
    Arco: 'favonius-warbow', Catalizador: 'favonius-codex',
  };
  const PANEL_SUB = { hpPct: 'hp', atkPct: 'atk', defPct: 'def' };

  GC.energyOf = function (char) {
    return GC.talentValue(char?.talents?.combat3?.a, /^Energía Elemental/, 1) || 60;
  };

  GC.newProfile = function (char) {
    return {
      level: '90', cons: 0, talent: { normal: 9, skill: 9, burst: 9 },
      weaponId: DEFAULT_WEAPON[char.weapon], weaponLevel: '90', refine: 1,
      setId: null, set2Id: null, panel: null, infusion: false,
      toggles: { weapon: true, set: true }, manual: {},
    };
  };

  /** Atributos que el juego mostraría sin artefactos (personaje + arma + ascensión). */
  GC.defaultPanel = function (char, prof) {
    const cb = GC.charBase(char, prof.level);
    const w = GC.weapon(prof.weaponId);
    const wb = GC.weaponBase(w, prof.weaponLevel);
    const p = {
      hp: cb.hp, atk: cb.atk + wb.atk, def: cb.def, em: 0, cr: 0.05, cd: 0.5, er: 1, heal: 0,
      dmg: { pyro: 0, hydro: 0, anemo: 0, electro: 0, dendro: 0, cryo: 0, geo: 0, phys: 0 },
    };
    addStat(p, char.sub, cb.asc, cb.hp, cb.atk + wb.atk, cb.def);
    if (w?.sub) addStat(p, w.sub, wb.sub, cb.hp, cb.atk + wb.atk, cb.def);
    return p;
  };

  function addStat(p, key, value, baseHp, baseAtk, baseDef) {
    if (!key || !value) return;
    if (key === 'hpPct') p.hp += baseHp * value;
    else if (key === 'atkPct') p.atk += baseAtk * value;
    else if (key === 'defPct') p.def += baseDef * value;
    else if (key === 'atk') p.atk += value;
    else if (key.endsWith('Dmg')) p.dmg[key.replace('Dmg', '')] += value;
    else p[key] = (p[key] || 0) + value;
  }
  GC.addStat = addStat;

  /** Build de artefactos típica (5★ +20, ~20 tiradas útiles). */
  GC.typicalBuild = function (char, prof) {
    const p = GC.defaultPanel(char, prof);
    const cb = GC.charBase(char, prof.level);
    const w = GC.weapon(prof.weaponId);
    const baseAtk = cb.atk + GC.weaponBase(w, prof.weaponLevel).atk;
    const scale = GC.mainScaling(char, prof);
    p.hp += 4780; p.atk += 311;
    const pctKey = scale === 'hp' ? 'hpPct' : scale === 'def' ? 'defPct' : scale === 'em' ? 'em' : 'atkPct';
    if (pctKey === 'em') p.em += 187; else addStat(p, pctKey, pctKey === 'defPct' ? 0.583 : 0.466, cb.hp, baseAtk, cb.def);
    p.dmg[GC.ELEMENT_KEYS[char.element]] += 0.466;
    if (p.cr * 2 < p.cd - 0.3) p.cr += 0.311; else p.cd += 0.622;
    p.cr += 0.033 * 7; p.cd += 0.066 * 7; p.er += 0.055 * 3;
    addStat(p, pctKey === 'em' ? 'atkPct' : pctKey, pctKey === 'em' ? 0.0496 * 2 : 0.0496 * 3, cb.hp, baseAtk, cb.def);
    p.em += pctKey === 'em' ? 40 * 2 : 20;
    return roundPanel(p);
  };

  function roundPanel(p) {
    const r = { ...p, dmg: { ...p.dmg } };
    ['hp', 'atk', 'def', 'em'].forEach((k) => { r[k] = Math.round(r[k]); });
    ['cr', 'cd', 'er', 'heal'].forEach((k) => { r[k] = Math.round(r[k] * 1000) / 1000; });
    Object.keys(r.dmg).forEach((k) => { r.dmg[k] = Math.round(r.dmg[k] * 1000) / 1000; });
    return r;
  }

  /** Atributo con el que escala principalmente el personaje (mayor suma de multiplicadores). */
  GC.mainScaling = function (char, prof) {
    const sum = { atk: 0, hp: 0, def: 0, em: 0 };
    ['combat1', 'combat2', 'combat3'].forEach((k) => {
      GC.parseTalent(char.talents[k]?.a, 9).filter((r) => r.kind === 'dmg').forEach((r) => r.terms.forEach((t) => { sum[t.stat] += t.mult * (k === 'combat1' ? 0.4 : 1); }));
    });
    return Object.entries(sum).sort((a, b) => b[1] - a[1])[0][0];
  };

  GC.panelOf = (char, prof) => prof.panel || GC.defaultPanel(char, prof);

  GC.baseOf = function (char, prof) {
    const cb = GC.charBase(char, prof.level);
    const wb = GC.weaponBase(GC.weapon(prof.weaponId), prof.weaponLevel);
    return { hp: cb.hp, atk: cb.atk + wb.atk, def: cb.def };
  };

  function teamContext(char, teamChars) {
    const others = teamChars.filter((c) => c && c.id !== char.id);
    const all = [char, ...others];
    return {
      char,
      sameElementCount: all.filter((c) => c.element === char.element).length,
      sameOthers: others.filter((c) => c.element === char.element).length,
      diffOthers: others.filter((c) => c.element !== char.element).length,
      teamEnergy: all.reduce((a, c) => a + GC.energyOf(c), 0),
      energy: GC.energyOf(char),
      distinctElements: new Set(all.map((c) => c.element)).size,
      countElements: (els) => all.filter((c) => els.includes(c.element)).length,
      energyOf: (c) => GC.energyOf(c),
      swirlElement: (others.find((c) => ['Pyro', 'Hydro', 'Electro', 'Cryo'].includes(c.element)) || char).element,
    };
  }

  function weaponValues(prof) {
    const w = GC.weapon(prof.weaponId);
    return { w, v: (i, pick = 'max') => GC.refineValue(w, prof.refine, i, pick) };
  }

  /** Modificadores propios (arma + set) y dependientes de atributos. */
  function selfMods(char, prof, ctx) {
    const out = { mods: [], deps: [] };
    const { w, v } = weaponValues(prof);
    const we = w && GC.WEAPON_EFFECTS[w.en];
    if (we && prof.toggles.weapon !== false) {
      if (we.self) out.mods.push(...tag(we.self(v, ctx), `Arma: ${w.name}`));
      if (we.dep) out.deps.push((s) => tag(we.dep(v, ctx, s), `Arma: ${w.name}`));
    }
    const set = GC.artifact(prof.setId);
    const ae = set && GC.ARTIFACT_EFFECTS[set.en];
    if (ae && prof.toggles.set !== false && !prof.set2Id) {
      if (ae.four) out.mods.push(...tag(ae.four(ctx), `4p ${set.name}`));
      if (ae.dep) out.deps.push((s) => tag(ae.dep(ctx, s), `4p ${set.name}`));
    }
    const m = prof.manual || {};
    const manual = [
      ['atkPct', m.atkPct], ['dmg:all', m.dmg], ['cr', m.cr], ['cd', m.cd], ['em', m.em],
      ['res:all', m.res], ['defRed', m.defRed], ['flat:all', m.flat],
    ].filter(([, val]) => val).map(([key, val]) => ({ key, value: key === 'em' || key === 'flat:all' ? +val : +val / 100, label: 'Bono manual', source: 'Manual' }));
    out.mods.push(...manual);
    return out;
  }

  function tag(mods, source) { return (mods || []).filter((x) => x && x.value).map((x) => ({ ...x, source })); }

  /** Atributos de un miembro sólo con sus propios efectos (para calcular los buffs que da). */
  GC.selfStats = function (char, prof, teamChars) {
    const ctx = teamContext(char, teamChars);
    const panel = GC.panelOf(char, prof);
    const base = GC.baseOf(char, prof);
    const sm = selfMods(char, prof, ctx);
    let s = GC.applyMods(panel, base, sm.mods);
    const dm = sm.deps.flatMap((f) => f(s));
    s = GC.applyMods(panel, base, [...sm.mods, ...dm]);
    return { stats: s, base };
  };

  /** Lista de buffs disponibles en el equipo para el objetivo, con su id de interruptor. */
  GC.teamBuffs = function (target, team, profiles) {
    const chars = team.map((id) => GC.char(id)).filter(Boolean);
    if (!chars.find((c) => c.id === target.id)) chars.unshift(target);
    const ctx = teamContext(target, chars);
    const buffs = [];
    for (const sup of chars) {
      const prof = profiles[sup.id] || GC.newProfile(sup);
      const lazy = () => {
        const { stats, base } = GC.selfStats(sup, prof, chars);
        return { char: sup, stats, base, talent: prof.talent, cons: prof.cons };
      };
      (GC.SUPPORT_BUFFS[sup.en] || []).forEach((b, i) => {
        buffs.push({ id: `${sup.id}:sup:${i}`, from: sup, label: b.label, mods: () => tag(b.fn(lazy(), target, ctx), sup.name) });
      });
      const { w, v } = weaponValues(prof);
      const we = w && GC.WEAPON_EFFECTS[w.en];
      if (we && (we.team || we.teamDep || (we.teamOthers && sup.id !== target.id))) {
        buffs.push({
          id: `${sup.id}:wteam`, from: sup, label: `${w.name} (R${prof.refine}): efecto de equipo`,
          mods: () => tag([
            ...(we.team ? we.team(v, ctx) : []),
            ...(we.teamDep ? we.teamDep(v, lazy().stats) : []),
            ...(we.teamOthers && sup.id !== target.id ? we.teamOthers(v, ctx) : []),
          ], `${sup.name} · ${w.name}`),
        });
      }
      const set = GC.artifact(prof.setId);
      const ae = set && GC.ARTIFACT_EFFECTS[set.en];
      if (ae?.team && !prof.set2Id) {
        buffs.push({ id: `${sup.id}:ateam`, from: sup, label: `4p ${set.name}: efecto de equipo`, mods: () => tag(ae.team(ctx), `${sup.name} · ${set.name}`) });
      }
    }
    if (chars.length >= 4) {
      GC.resonances(chars.map((c) => c.element)).forEach((r) => buffs.push({ id: r.id, from: null, label: r.label, mods: () => tag(r.mods, 'Resonancia') }));
    }
    return buffs;
  };

  /**
   * Evalúa a un personaje: atributos finales y daño de cada fila de talento.
   * opts: { team:[ids], profiles, toggles:{id:bool}, enemy:{level,res}, reaction, useTeam }
   */
  GC.evaluate = function (char, prof, opts) {
    const team = opts.useTeam ? opts.team || [] : [char.id];
    const chars = team.map((id) => GC.char(id)).filter(Boolean);
    if (!chars.find((c) => c.id === char.id)) chars.unshift(char);
    const ctx = teamContext(char, chars);
    const panel = GC.panelOf(char, prof);
    const base = GC.baseOf(char, prof);
    const sm = selfMods(char, prof, ctx);
    const profiles = { ...(opts.profiles || {}), [char.id]: prof };
    const buffs = GC.teamBuffs(char, chars.map((c) => c.id), profiles);
    const active = buffs.filter((b) => (opts.toggles || {})[b.id] !== false);
    const teamMods = active.flatMap((b) => b.mods());
    let s = GC.applyMods(panel, base, [...sm.mods, ...teamMods]);
    const depMods = sm.deps.flatMap((f) => f(s));
    const mods = [...sm.mods, ...teamMods, ...depMods];
    s = GC.applyMods(panel, base, mods);

    const lvl = GC.levelNumber(prof.level);
    const enemy = opts.enemy || { level: 90, res: 0.1 };
    const talents = {};
    const lvKey = { combat1: 'normal', combat2: 'skill', combat3: 'burst' };
    for (const key of ['combat1', 'combat2', 'combat3']) {
      const t = char.talents[key];
      if (!t) continue;
      const rows = GC.parseTalent(t.a, prof.talent[lvKey[key]]);
      talents[key] = {
        name: t.n, desc: t.d,
        rows: rows.map((r) => {
          if (r.kind === 'info') return { ...r };
          const element = GC.hitElement(char, key, r.name, prof.infusion);
          const category = GC.hitCategory(key, r.name);
          const reaction = r.kind === 'dmg' && GC.reactionsForElement(element).some((x) => x.key === opts.reaction) ? opts.reaction : 'none';
          const res = GC.computeHit({ ...r, element, category }, s, { charLevel: lvl, enemy, reaction });
          return { ...r, element, category, reaction, result: res };
        }),
      };
    }
    const transformative = Object.keys(GC.TRANSFORMATIVE)
      .filter((k) => GC.TRANSFORMATIVE[k].triggers.includes(char.element))
      .map((k) => ({ key: k, ...GC.computeTransformative(k, s, { charLevel: lvl, enemy }, ctx.swirlElement) }));
    return { stats: s, base, panel, mods, buffs, talents, transformative, ctx };
  };

  /* ---------- Utilidades para el consejero ---------- */

  /** Devuelve una copia del panel al cambiar de arma (aprox.: pluma de 311 ATQ plano). */
  GC.swapWeaponPanel = function (char, prof, newWeaponId) {
    const panel = GC.panelOf(char, prof);
    const cb = GC.charBase(char, prof.level);
    const oldW = GC.weapon(prof.weaponId);
    const newW = GC.weapon(newWeaponId);
    const ob = GC.weaponBase(oldW, prof.weaponLevel);
    const nb = GC.weaponBase(newW, '90');
    const p = { ...panel, dmg: { ...panel.dmg } };
    const oldBase = cb.atk + ob.atk;
    let pct = Math.max(0, (panel.atk - 311) / oldBase - 1);
    const fullOld = oldBase * (1 + pct);
    if (oldW?.sub === 'atkPct') pct -= ob.sub;
    if (newW?.sub === 'atkPct') pct += nb.sub;
    p.atk = panel.atk - fullOld + (cb.atk + nb.atk) * (1 + pct);
    const subAdj = (w, val, sign) => {
      if (!w?.sub || w.sub === 'atkPct') return;
      if (w.sub === 'hpPct') p.hp += sign * cb.hp * val;
      else if (w.sub === 'defPct') p.def += sign * cb.def * val;
      else if (w.sub.endsWith('Dmg')) p.dmg[w.sub.replace('Dmg', '')] += sign * val;
      else p[w.sub] = (p[w.sub] || 0) + sign * val;
    };
    subAdj(oldW, ob.sub, -1);
    subAdj(newW, nb.sub, +1);
    return p;
  };

  /** Copia del panel cambiando el bono estático de 2 piezas. */
  GC.swapSetPanel = function (char, prof, newSetId) {
    const panel = GC.panelOf(char, prof);
    const base = GC.baseOf(char, prof);
    const p = { ...panel, dmg: { ...panel.dmg } };
    const apply = (setId, sign) => {
      const ae = setId && GC.ARTIFACT_EFFECTS[GC.artifact(setId)?.en];
      (ae?.two || []).forEach((m) => applyStatic(p, base, m, sign));
    };
    apply(prof.setId, -1);
    if (prof.set2Id) apply(prof.set2Id, -1);
    apply(newSetId, +1);
    return p;
  };

  function applyStatic(p, base, m, sign) {
    const [k, sub] = m.key.split(':');
    const v = sign * m.value;
    if (k === 'atkPct') p.atk += base.atk * v;
    else if (k === 'hpPct') p.hp += base.hp * v;
    else if (k === 'defPct') p.def += base.def * v;
    else if (k === 'dmg' && p.dmg[sub] !== undefined) p.dmg[sub] += v;
    else if (k === 'dmg') { p.dmgCat = { ...(p.dmgCat || {}) }; p.dmgCat[sub] = (p.dmgCat[sub] || 0) + v; }
    else p[k] = (p[k] || 0) + v;
  }
  GC.applyStatic = applyStatic;
})(typeof window !== 'undefined' ? window : globalThis);
