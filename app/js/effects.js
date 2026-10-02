/*
 * Efectos condicionales que NO aparecen en el panel de atributos del juego:
 * pasivas de armas, bonos de 4 piezas de artefactos, buffs de apoyo entre
 * personajes y resonancias elementales. Los bonos estáticos (p. ej. 2 piezas
 * o la subestadística del arma) ya están incluidos en el panel del juego.
 */
(function (root) {
  const GC = (root.GC = root.GC || {});
  const ek = (el) => GC.ELEMENT_KEYS[el] || 'phys';
  const mod = (key, value, label) => ({ key, value, label });

  /** Valor de refinamiento: "8/16/28%" toma el último tramo (máximo). */
  GC.refineValue = function (weapon, refine, i, pick = 'max') {
    const arr = weapon?.refs?.[Math.max(0, Math.min(weapon.refs.length - 1, refine - 1))];
    if (!arr || arr[i] === undefined) return 0;
    const raw = String(arr[i]);
    const parts = raw.split('/');
    const sel = pick === 'max' ? parts[parts.length - 1] : parts[Math.min(parts.length - 1, pick)];
    const n = parseFloat(sel);
    return raw.includes('%') ? n / 100 : n;
  };

  /* ===================== ARMAS ===================== */
  // self(v, ctx) → modificadores propios; dep(v, ctx, stats) → dependen de atributos; team(v, ctx) → al equipo.
  const W = {
    'Mistsplitter Reforged': { self: (v, c) => [mod('dmg:elemental', v(0)), mod(`dmg:${ek(c.char.element)}`, v(1), '3 emblemas')] },
    'Primordial Jade Cutter': { self: (v) => [mod('hpPct', v(0))], dep: (v, c, s) => [mod('atkFlat', v(1) * s.hp)] },
    'Haran Geppaku Futsu': { self: (v) => [mod('dmg:elemental', v(0)), mod('dmg:normal', 2 * v(1), '2 cargas')] },
    'Freedom-Sworn': { self: (v) => [mod('dmg:all', v(0))], team: (v) => [mod('dmg:normal', v(1)), mod('dmg:charged', v(1)), mod('dmg:plunge', v(1)), mod('atkPct', v(2))] },
    'Light of Foliar Incision': { self: (v) => [mod('cr', v(0))], dep: (v, c, s) => [mod('flat:normal', v(1) * s.em), mod('flat:skill', v(1) * s.em)] },
    'Key of Khaj-Nisut': { self: (v) => [mod('hpPct', v(0))], dep: (v, c, s) => [mod('em', 3 * v(1) * s.hp)], teamDep: (v, s) => [mod('em', v(2) * s.hp)] },
    'Splendor of Tranquil Waters': { self: (v) => [mod('dmg:skill', 3 * v(0)), mod('hpPct', 2 * v(1))] },
    'Uraku Misugiri': { self: (v) => [mod('dmg:normal', 2 * v(0)), mod('dmg:skill', 2 * v(1)), mod('defPct', v(2))] },
    Absolution: { self: (v) => [mod('cd', v(0)), mod('dmg:all', 3 * v(1))] },
    'Aquila Favonia': { self: (v) => [mod('atkPct', v(0))] },
    'The Black Sword': { self: (v) => [mod('dmg:normal', v(0)), mod('dmg:charged', v(0))] },
    "Wolf's Gravestone": { self: (v) => [mod('atkPct', v(0))] },
    'Redhorn Stonethresher': { self: (v) => [mod('defPct', v(0))], dep: (v, c, s) => [mod('flat:normal', v(1) * s.def), mod('flat:charged', v(1) * s.def)] },
    'Song of Broken Pines': { self: (v) => [mod('atkPct', v(0))], team: (v) => [mod('atkPct', v(2))] },
    'Beacon of the Reed Sea': { self: (v) => [mod('atkPct', v(0)), mod('hpPct', v(2))] },
    Verdict: { self: (v) => [mod('atkPct', v(0)), mod('dmg:skill', 2 * v(1))] },
    'Fang of the Mountain King': { self: (v) => [mod('dmg:skill', 6 * v(0)), mod('dmg:burst', 6 * v(0))] },
    'Serpent Spine': { self: (v) => [mod('dmg:all', 5 * v(0))] },
    'Staff of Homa': { self: (v) => [mod('hpPct', v(0))], dep: (v, c, s) => [mod('atkFlat', v(1) * s.hp)] },
    'Engulfing Lightning': { self: (v) => [mod('er', v(2), 'tras Definitiva')], dep: (v, c, s, base) => [mod('atkPct', Math.min(v(1), v(0) * Math.max(0, s.er - 1)))] },
    'Staff of the Scarlet Sands': { dep: (v, c, s) => [mod('atkFlat', (v(0) + 3 * v(1)) * s.em)] },
    'Calamity Queller': { self: (v) => [mod('dmg:elemental', v(0)), mod('atkPct', 6 * v(1))] },
    'Primordial Jade Winged-Spear': { self: (v) => [mod('atkPct', 7 * v(0)), mod('dmg:all', v(1))] },
    '"The Catch"': { self: (v) => [mod('dmg:burst', v(0)), mod('cr:burst', v(1))] },
    "Crimson Moon's Semblance": { self: (v) => [mod('dmg:all', v(0), 'con pacto vital')] },
    'Lumidouce Elegy': { self: (v, c) => [mod('atkPct', v(0)), ...(['Dendro', 'Pyro'].includes(c.char.element) ? [mod('dmg:all', 2 * v(1), 'enemigo quemado')] : [])] },
    'Aqua Simulacra': { self: (v) => [mod('hpPct', v(0)), mod('dmg:all', v(1))] },
    'Elegy for the End': { self: (v) => [mod('em', v(0))], team: (v) => [mod('em', v(1)), mod('atkPct', v(2))] },
    'Polar Star': { self: (v) => [mod('dmg:skill', v(0)), mod('dmg:burst', v(0)), mod('atkPct', v(1))] },
    'Thundering Pulse': { self: (v) => [mod('atkPct', v(0)), mod('dmg:normal', v(1))] },
    'The First Great Magic': { self: (v, c) => [mod('dmg:charged', v(0)), mod('atkPct', v(1, Math.min(3, c.sameElementCount) - 1))] },
    "Hunter's Path": { self: (v) => [mod('dmg:elemental', v(0))], dep: (v, c, s) => [mod('flat:charged', v(1) * s.em)] },
    "Astral Vulture's Crimson Plumage": { self: (v) => [mod('atkPct', v(0)), mod('dmg:charged', v(1)), mod('dmg:burst', v(2))] },
    'Skyward Harp': { self: (v) => [mod('cd', v(0))] },
    "Kagura's Verity": { self: (v) => [mod('dmg:skill', 3 * v(0)), mod('dmg:elemental', v(1))] },
    'Lost Prayer to the Sacred Winds': { self: (v) => [mod('dmg:elemental', 4 * v(0))] },
    'A Thousand Floating Dreams': {
      self: (v, c) => [mod('em', v(0) * c.sameOthers), mod(`dmg:${ek(c.char.element)}`, v(1) * Math.min(3, c.diffOthers))],
      teamOthers: (v) => [mod('em', v(2))],
    },
    "Tulaytullah's Remembrance": { self: (v) => [mod('dmg:normal', v(3))] },
    'Tome of the Eternal Flow': { self: (v) => [mod('hpPct', v(0)), mod('dmg:charged', 3 * v(1))] },
    'Cashflow Supervision': { self: (v) => [mod('atkPct', v(0)), mod('dmg:normal', 3 * v(1)), mod('dmg:charged', 3 * v(2))] },
    "Surf's Up": { self: (v) => [mod('hpPct', v(0)), mod('dmg:normal', 4 * v(1))] },
    "Starcaller's Watch": { self: (v) => [mod('em', v(0))], team: (v) => [mod('dmg:all', v(1))] },
    'Vivid Notions': { self: (v) => [mod('atkPct', v(0)), mod('cd:plunge', v(1) + v(2))] },
    'Thrilling Tales of Dragon Slayers': { teamOthers: (v) => [mod('atkPct', v(0))] },
    "Wavebreaker's Fin": { self: (v, c) => [mod('dmg:burst', Math.min(v(1), v(0) * c.teamEnergy))] },
    'Mailed Flower': { self: (v) => [mod('atkPct', v(0)), mod('em', v(1))] },
    'Skyward Atlas': { self: (v) => [mod('dmg:elemental', v(0))] },
    'Skyward Blade': { self: (v) => [mod('cr', v(0))] },
    'Skyward Pride': { self: (v) => [mod('dmg:all', v(0))] },
    'Skyward Spine': { self: (v) => [mod('cr', v(0))] },
    "Lion's Roar": { self: (v) => [mod('dmg:all', v(0), 'enemigo afectado por Pyro/Electro')] },
    Rainslasher: { self: (v) => [mod('dmg:all', v(0), 'enemigo afectado por Hydro/Electro')] },
    "Dragon's Bane": { self: (v) => [mod('dmg:all', v(0), 'enemigo afectado por Hydro/Pyro')] },
    Deathmatch: { self: (v) => [mod('atkPct', v(1), 'un solo enemigo')] },
    'Blackcliff Longsword': { self: (v) => [mod('atkPct', 3 * v(0))] },
    'Iron Sting': { self: (v) => [mod('dmg:all', 2 * v(0))] },
    'Fleuve Cendre Ferryman': { self: (v) => [mod('cr:skill', v(0)), mod('er', v(1))] },
    Slingshot: { self: (v) => [mod('dmg:normal', v(0)), mod('dmg:charged', v(0))] },
    'The Stringless': { self: (v) => [mod('dmg:skill', v(0)), mod('dmg:burst', v(0))] },
    Rust: { self: (v) => [mod('dmg:normal', v(0)), mod('dmg:charged', -0.1)] },
    'Solar Pearl': { self: (v) => [mod('dmg:skill', v(0)), mod('dmg:burst', v(0)), mod('dmg:normal', v(1))] },
    'Kitain Cross Spear': { self: (v) => [mod('dmg:skill', v(0))] },
    'Wolf-Fang': { self: (v) => [mod('dmg:skill', v(0)), mod('dmg:burst', v(0)), mod('cr:skill', 4 * v(1)), mod('cr:burst', 4 * v(2))] },
    'Mountain-Bracing Bolt': { self: (v) => [mod('dmg:skill', v(0) + v(1))] },
    'Peak Patrol Song': { self: (v) => [mod('defPct', 2 * v(0)), mod('dmg:elemental', 2 * v(1))] },
    'Fractured Halo': { self: (v) => [mod('atkPct', v(0))] },
    'Symphonist of Scents': { self: (v) => [mod('atkPct', v(0))] },
    Azurelight: { self: (v) => [mod('atkPct', v(0) + v(1)), mod('cd', v(2), 'con 0 de Energía')] },
    "Moonweaver's Dawn": { self: (v, c) => [mod('dmg:burst', v(0) + (c.energy <= 40 ? v(1, 1) : c.energy <= 60 ? v(1, 0) : 0))] },
    "Sacrificer's Staff": { self: (v) => [mod('atkPct', 3 * v(0)), mod('er', 3 * v(1))] },
    'Etherlight Spindlelute': { self: (v) => [mod('em', v(0))] },
    'Dawning Frost': { self: (v) => [mod('em', v(0) + v(1))] },
    'Master Key': { self: (v) => [mod('em', v(0))] },
    'Snare Hook': { self: (v) => [mod('em', v(0))] },
    'Flame-Forged Insight': { self: (v) => [mod('em', v(1))] },
    'The Daybreak Chronicles': { self: (v) => [mod('dmg:normal', v(3)), mod('dmg:skill', v(3)), mod('dmg:burst', v(3))] },
    'Gest of the Mighty Wolf': { self: (v) => [mod('dmg:all', 4 * v(0))] },
    'Footprint of the Rainbow': { self: (v) => [mod('defPct', v(0))] },
    'Earth Shaker': { self: (v) => [mod('dmg:skill', v(0))] },
    'Vortex Vanquisher': { self: (v) => [mod('shield', v(0)), mod('atkPct', 10 * v(1), '5 cargas con escudo')] },
    'Summit Shaper': { self: (v) => [mod('shield', v(0)), mod('atkPct', 10 * v(1), '5 cargas con escudo')] },
    'Memory of Dust': { self: (v) => [mod('shield', v(0)), mod('atkPct', 10 * v(1), '5 cargas con escudo')] },
    'Everlasting Moonglow': { self: (v) => [mod('heal', v(0))], dep: (v, c, s) => [mod('flat:normal', v(1) * s.hp)] },
    "Jadefall's Splendor": { dep: (v, c, s) => [mod(`dmg:${ek(c.char.element)}`, Math.min(v(2), (v(1) * s.hp) / 1000))] },
    'Kagotsurube Isshin': { self: () => [mod('atkPct', 0.15)] },
  };
  GC.WEAPON_EFFECTS = W;

  /* ===================== ARTEFACTOS ===================== */
  // two: bono estático de 2 piezas (ya incluido en el panel; se usa al comparar sets).
  const A = {
    'Emblem of Severed Fate': { two: [mod('er', 0.2)], dep: (c, s) => [mod('dmg:burst', Math.min(0.75, 0.25 * s.er))] },
    'Crimson Witch of Flames': {
      two: [mod('dmg:pyro', 0.15)],
      four: () => [mod('dmg:pyro', 0.075, '1 carga'), mod('rx:overloaded', 0.4), mod('rx:burning', 0.4), mod('rx:burgeon', 0.4), mod('rx:vaporize', 0.15), mod('rx:melt', 0.15)],
    },
    "Gladiator's Finale": { two: [mod('atkPct', 0.18)], four: (c) => (['Espada ligera', 'Mandoble', 'Lanza'].includes(c.char.weapon) ? [mod('dmg:normal', 0.35)] : []) },
    "Shimenawa's Reminiscence": { two: [mod('atkPct', 0.18)], four: () => [mod('dmg:normal', 0.5), mod('dmg:charged', 0.5), mod('dmg:plunge', 0.5)] },
    "Wanderer's Troupe": { two: [mod('em', 80)], four: (c) => (['Catalizador', 'Arco'].includes(c.char.weapon) ? [mod('dmg:charged', 0.35)] : []) },
    'Blizzard Strayer': { two: [mod('dmg:cryo', 0.15)], four: () => [mod('cr', 0.4, 'enemigo congelado')] },
    'Heart of Depth': { two: [mod('dmg:hydro', 0.15)], four: () => [mod('dmg:normal', 0.3), mod('dmg:charged', 0.3)] },
    'Thundering Fury': {
      two: [mod('dmg:electro', 0.15)],
      four: () => [mod('rx:overloaded', 0.4), mod('rx:electrocharged', 0.4), mod('rx:superconduct', 0.4), mod('rx:hyperbloom', 0.4), mod('rx:aggravate', 0.2)],
    },
    'Viridescent Venerer': { two: [mod('dmg:anemo', 0.15)], four: () => [mod('rx:swirl', 0.6)], team: (c) => [mod(`res:${ek(c.swirlElement)}`, 0.4, `RES ${c.swirlElement} −40%`)] },
    'Noblesse Oblige': { two: [mod('dmg:burst', 0.2)], team: () => [mod('atkPct', 0.2)] },
    'Pale Flame': { two: [mod('dmg:phys', 0.25)], four: () => [mod('atkPct', 0.18), mod('dmg:phys', 0.25)] },
    'Tenacity of the Millelith': { two: [mod('hpPct', 0.2)], team: () => [mod('atkPct', 0.2), mod('shield', 0.3)] },
    'Husk of Opulent Dreams': { two: [mod('defPct', 0.3)], four: () => [mod('defPct', 0.24), mod('dmg:geo', 0.24)] },
    'Gilded Dreams': { two: [mod('em', 80)], four: (c) => [mod('atkPct', 0.14 * Math.min(3, c.sameOthers)), mod('em', 50 * Math.min(3, c.diffOthers))] },
    'Deepwood Memories': { two: [mod('dmg:dendro', 0.15)], team: () => [mod('res:dendro', 0.3)] },
    'Echoes of an Offering': { two: [mod('atkPct', 0.18)], dep: (c, s) => [mod('flat:normal', 0.7 * s.atk * 0.5, 'promedio ~50% de activación')] },
    'Vermillion Hereafter': { two: [mod('atkPct', 0.18)], four: () => [mod('atkPct', 0.48)] },
    'Flower of Paradise Lost': { two: [mod('em', 80)], four: () => [mod('rx:bloom', 0.8), mod('rx:hyperbloom', 0.8), mod('rx:burgeon', 0.8)] },
    'Desert Pavilion Chronicle': { two: [mod('dmg:anemo', 0.15)], four: () => [mod('dmg:normal', 0.4), mod('dmg:charged', 0.4), mod('dmg:plunge', 0.4)] },
    "Nymph's Dream": { two: [mod('dmg:hydro', 0.15)], four: () => [mod('atkPct', 0.25), mod('dmg:hydro', 0.15)] },
    'Marechaussee Hunter': { two: [mod('dmg:normal', 0.15), mod('dmg:charged', 0.15)], four: () => [mod('cr', 0.36)] },
    'Golden Troupe': { two: [mod('dmg:skill', 0.2)], four: () => [mod('dmg:skill', 0.5, 'fuera de campo')] },
    'Nighttime Whispers in the Echoing Woods': { two: [mod('atkPct', 0.18)], four: () => [mod('dmg:geo', 0.2)] },
    'Fragment of Harmonic Whimsy': { two: [mod('atkPct', 0.18)], four: () => [mod('dmg:all', 0.54)] },
    'Unfinished Reverie': { two: [mod('cd', 0.24)], four: () => [mod('dmg:all', 0.5)] },
    'Obsidian Codex': { two: [mod('dmg:all', 0.15)], four: () => [mod('cr', 0.4)] },
    'Scroll of the Hero of Cinder City': { two: [], team: () => [mod('dmg:elemental', 0.12)] },
    "Long Night's Oath": { two: [mod('dmg:plunge', 0.25)], four: () => [mod('dmg:plunge', 0.75)] },
    'Finale of the Deep Galleries': { two: [mod('dmg:cryo', 0.15)], four: () => [mod('dmg:normal', 0.6), mod('dmg:burst', 0.6)] },
    Lavawalker: { two: [], four: () => [mod('dmg:all', 0.35, 'enemigo afectado por Pyro')] },
    Thundersoother: { two: [], four: () => [mod('dmg:all', 0.35, 'enemigo afectado por Electro')] },
    'Retracing Bolide': { two: [mod('shield', 0.35)], four: () => [mod('dmg:normal', 0.4), mod('dmg:charged', 0.4)] },
    'Bloodstained Chivalry': { two: [mod('dmg:phys', 0.25)], four: () => [mod('dmg:charged', 0.5)] },
    'Archaic Petra': { two: [mod('dmg:geo', 0.15)], team: (c) => [mod('dmg:elemental', 0.35, 'elemento cristalizado')] },
    Instructor: { two: [mod('em', 80)], team: () => [mod('em', 120)] },
    'Ocean-Hued Clam': { two: [mod('heal', 0.15)] },
    'Maiden Beloved': { two: [mod('heal', 0.15)] },
    'Song of Days Past': { two: [mod('heal', 0.15)] },
    "Vourukasha's Glow": { two: [mod('hpPct', 0.2)], four: () => [mod('dmg:skill', 0.1), mod('dmg:burst', 0.1)] },
  };
  GC.ARTIFACT_EFFECTS = A;

  /* ============ BUFFS DE APOYO ENTRE PERSONAJES ============ */
  // fn(sup, tgt, ctx) → modificadores aplicados al objetivo. sup: { char, stats, base, talent:{normal,skill,burst}, cons }
  const tv = (sup, key, re, lvKey, i = 0) => GC.talentValue(sup.char.talents[key]?.a, re, sup.talent[lvKey], i);
  const self = (fn) => (sup, tgt, ctx) => (tgt === sup.char ? fn(sup, tgt, ctx) : []);
  const S = {
    'Raiden Shogun': [
      {
        label: 'Ojo del castigo (E): Daño de Definitiva según Energía',
        fn: (sup, tgt, ctx) => [mod('dmg:burst', tv(sup, 'combat2', /Hab\. Definitiva/, 'skill') * (ctx.energyOf(tgt) || 60))],
      },
      {
        label: 'Cargas de ambición (60): aumenta el daño de su Definitiva',
        fn: self((sup) => [
          { key: 'rowAdd', category: 'burst', re: /corte on[íi]rico/i, stat: 'atk', value: 60 * tv(sup, 'combat3', /ambici[óo]n por carga/, 'burst', 0) },
          { key: 'rowAdd', category: 'burst', re: /golpe|Cargado|ca[íi]da/i, stat: 'atk', value: 60 * tv(sup, 'combat3', /ambici[óo]n por carga/, 'burst', 1) },
        ]),
      },
    ],
    'Hu Tao': [{ label: 'Paramita Papilio (E): ATQ según su Vida Máx. (máx. 400% ATQ base)', fn: self((sup) => [mod('atkFlat', Math.min(4 * sup.base.atk, tv(sup, 'combat2', /Aumento de ATQ/, 'skill') * sup.stats.hp))]) }],
    'Arataki Itto': [{ label: 'Rey Oni (Q): ATQ según su DEF', fn: self((sup) => [mod('atkFlat', tv(sup, 'combat3', /Aumento de ATQ/, 'burst') * sup.stats.def)]) }],
    Noelle: [{ label: 'Barrido (Q): ATQ según su DEF', fn: self((sup) => [mod('atkFlat', tv(sup, 'combat3', /Aumento de ATQ/, 'burst') * sup.stats.def)]) }],
    Xiao: [{ label: 'Yaksha (Q): aumento de daño de Ataques Normales/Cargados/Descendentes', fn: self((sup) => { const v = tv(sup, 'combat3', /Aumento de daño/, 'burst'); return [mod('dmg:normal', v), mod('dmg:charged', v), mod('dmg:plunge', v)]; }) }],
    Yoimiya: [{ label: 'Niwabi Fire-Dance (E): multiplica el daño de Ataque Normal', fn: self((sup) => [mod('mult:normal', tv(sup, 'combat2', /flecha flam/, 'skill') - 1)]) }],
    Cyno: [{ label: 'Licencia sacra (Q): +Maestría Elemental', fn: self((sup) => [mod('em', tv(sup, 'combat3', /Maestr[íi]a/, 'burst'))]) }],
    'Kamisato Ayato': [{ label: 'Kyouka Fuushi (Q): aumento de daño de Ataque Normal', fn: (sup) => [mod('dmg:normal', tv(sup, 'combat3', /Aumento de daño de ATQ Normal/, 'burst'))] }],
    Bennett: [{
      label: 'Aventura maravillosa (Q): ATQ plano según su ATQ base',
      fn: (sup) => [mod('atkFlat', sup.base.atk * (tv(sup, 'combat3', /Bono de ATQ/, 'burst') + (sup.cons >= 1 ? 0.2 : 0)))],
    }],
    'Kaedehara Kazuha': [{
      label: 'Mente veloz (pasiva): +0.04% Bono de Daño por punto de Maestría',
      fn: (sup, tgt) => (['Pyro', 'Hydro', 'Electro', 'Cryo'].includes(tgt.element) ? [mod(`dmg:${ek(tgt.element)}`, 0.0004 * sup.stats.em)] : []),
    }],
    Sucrose: [{ label: 'Catálisis (pasiva): 20% de su Maestría al equipo', fn: (sup, tgt) => (tgt === sup.char ? [] : [mod('em', 0.2 * sup.stats.em)]) }],
    Zhongli: [{ label: 'Escudo de jade: −20% a todas las RES', fn: () => [mod('res:all', 0.2)] }],
    Furina: [{
      label: 'Universal Revelry (Q): Bono de Daño por algarabía (300 pts.)',
      fn: (sup) => [mod('dmg:all', 300 * tv(sup, 'combat3', /Aumento de daño por conversi/, 'burst'))],
    }],
    Nahida: [{ label: 'Compasión (pasiva): +25% de su Maestría al personaje en uso (máx. 250)', fn: (sup) => [mod('em', Math.min(250, 0.25 * sup.stats.em))] }],
    Shenhe: [
      { label: 'Plumas heladas (E): Daño Cryo plano según su ATQ', fn: (sup, tgt) => (tgt.element === 'Cryo' ? [mod('flat:cryo', tv(sup, 'combat2', /Aumento de daño/, 'skill') * sup.stats.atk)] : []) },
      { label: 'Talismán (Q): reduce RES Cryo y Física', fn: (sup) => { const r = tv(sup, 'combat3', /Reducci[óo]n de RES/, 'burst'); return [mod('res:cryo', r), mod('res:phys', r)]; } },
      { label: 'Ritual de purificación (pasiva): +15% Daño Cryo', fn: () => [mod('dmg:cryo', 0.15)] },
    ],
    'Yun Jin': [{ label: 'Bandera nebulosa (Q): daño plano de Ataque Normal según su DEF', fn: (sup) => [mod('flat:normal', tv(sup, 'combat3', /Aumento de daño/, 'burst') * sup.stats.def)] }],
    'Kujou Sara': [{ label: 'Plumas del tengu (E/Q): ATQ plano según su ATQ base', fn: (sup) => [mod('atkFlat', tv(sup, 'combat2', /Bono de ATQ/, 'skill') * sup.base.atk)] }],
    Mona: [{ label: 'Presagio (Q): Bono de Daño', fn: (sup) => [mod('dmg:all', tv(sup, 'combat3', /Bono de daño/, 'burst'))] }],
    Faruzan: [{
      label: 'Bendición vientosacro (Q): Daño Anemo, −RES Anemo y daño plano',
      fn: (sup, tgt) => [mod('dmg:anemo', tv(sup, 'combat3', /Bono de Daño Anemo/, 'burst')), mod('res:anemo', tv(sup, 'combat3', /RES Anemo/, 'burst')), ...(tgt.element === 'Anemo' ? [mod('flat:anemo', 0.32 * sup.base.atk)] : [])],
    }],
    Xianyun: [{ label: 'Ataque descendente (pasiva): daño plano de caída (200% ATQ)', fn: (sup) => [mod('flat:plunge', Math.min(9000, 2 * sup.stats.atk))] }],
    Chevreuse: [{ label: 'Sobrecarga coordinada (pasiva): +20% ATQ, −40% RES Pyro/Electro', fn: () => [mod('atkPct', 0.2), mod('res:pyro', 0.4), mod('res:electro', 0.4)] }],
    Gorou: [{ label: 'Estandarte (E): DEF plana y Bono Geo', fn: (sup) => [mod('defFlat', tv(sup, 'combat2', /Aumento de DEF/, 'skill')), mod('dmg:geo', tv(sup, 'combat2', /Bono de Daño Geo/, 'skill'))] }],
    Citlali: [{ label: 'Pasiva: −20% RES Pyro e Hydro', fn: () => [mod('res:pyro', 0.2), mod('res:hydro', 0.2)] }],
    Xilonen: [{ label: 'Muestra musical (E): reduce RES elemental', fn: (sup, tgt) => [mod(`res:${ek(tgt.element)}`, tv(sup, 'combat2', /Reducci[óo]n de RES/, 'skill'))] }],
    Rosaria: [{ label: 'Sombra de la noche (pasiva): 15% de su Prob. CRIT al equipo', fn: (sup, tgt) => (tgt === sup.char ? [] : [mod('cr', Math.min(0.15, 0.15 * sup.stats.cr))]) }],
    Lisa: [{ label: 'Electrocución estática (pasiva): −15% DEF enemiga', fn: () => [mod('defRed', 0.15)] }],
    Escoffier: [{
      label: 'Pasiva: −RES Hydro/Cryo según miembros Hydro/Cryo',
      fn: (sup, tgt, ctx) => { const n = ctx.countElements(['Hydro', 'Cryo']); const r = [0, 0.05, 0.1, 0.15, 0.55][Math.min(4, n)]; return [mod('res:hydro', r), mod('res:cryo', r)]; },
    }],
    Yelan: [{ label: 'Bendición (pasiva): Bono de Daño creciente (promedio 25%)', fn: () => [mod('dmg:all', 0.25)] }],
    Candace: [{ label: 'Oración (Q): +20% daño de Ataque Normal elemental', fn: () => [mod('dmg:normal', 0.2)] }],
    Lynette: [{ label: 'Pasiva: ATQ según elementos del equipo', fn: (sup, tgt, ctx) => [mod('atkPct', [0, 0.08, 0.12, 0.16, 0.2][Math.min(4, ctx.distinctElements)])] }],
    Albedo: [{ label: 'Pasiva: +125 Maestría tras su Definitiva', fn: () => [mod('em', 125)] }],
    'Sangonomiya Kokomi': [],
  };
  GC.SUPPORT_BUFFS = S;

  GC.resonances = function (elements) {
    const count = {};
    elements.forEach((e) => { count[e] = (count[e] || 0) + 1; });
    const list = [];
    if (elements.length < 4) return list;
    if (count.Pyro >= 2) list.push({ id: 'res-pyro', label: 'Resonancia: Fervor Piro (+25% ATQ)', mods: [mod('atkPct', 0.25)] });
    if (count.Hydro >= 2) list.push({ id: 'res-hydro', label: 'Resonancia: Corazón tranquilo (+25% Vida)', mods: [mod('hpPct', 0.25)] });
    if (count.Cryo >= 2) list.push({ id: 'res-cryo', label: 'Resonancia: Escudo de hielo (+15% Prob. CRIT vs. Cryo)', mods: [mod('cr', 0.15)] });
    if (count.Geo >= 2) list.push({ id: 'res-geo', label: 'Resonancia: Voluntad firme (+15% daño, −20% RES Geo)', mods: [mod('dmg:all', 0.15), mod('res:geo', 0.2)] });
    if (count.Dendro >= 2) list.push({ id: 'res-dendro', label: 'Resonancia: Vegetación pródiga (+50 a +100 Maestría)', mods: [mod('em', 100)] });
    if (count.Electro >= 2) list.push({ id: 'res-electro', label: 'Resonancia: Energía elevada (regenera partículas)', mods: [] });
    if (count.Anemo >= 2) list.push({ id: 'res-anemo', label: 'Resonancia: Inmortalidad (−5% TdE, +10% Vel. movimiento)', mods: [] });
    if (Object.keys(count).length === 4) list.push({ id: 'res-protect', label: 'Resonancia: Protección de los elementos (+15% RES)', mods: [] });
    return list;
  };
})(typeof window !== 'undefined' ? window : globalThis);
