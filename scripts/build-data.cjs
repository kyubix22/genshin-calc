#!/usr/bin/env node
/*
 * Genera app/data/gamedata.js a partir de genshin-db (datos extraídos del cliente
 * del juego: estadísticas base por nivel, multiplicadores de talentos, armas con
 * sus refinamientos y sets de artefactos). Ejecutar con: npm run build:data
 */
const fs = require('fs');
const path = require('path');
const g = require('genshin-db');

const OUT = path.join(__dirname, '..', 'app', 'data', 'gamedata.js');

// Niveles con su estado de ascensión: "20+" significa nivel 20 ya ascendido.
const LEVELS = ['1', '20', '20+', '40', '40+', '50', '50+', '60', '60+', '70', '70+', '80', '80+', '90', '95', '100'];
const WEAPON_LEVELS = ['1', '20', '20+', '40', '40+', '50', '50+', '60', '60+', '70', '70+', '80', '80+', '90'];

const clean = (t) => (t || '').replace(/\{NON_BREAK_SPACE\}/g, '\u00a0').replace(/<\/?color[^>]*>/g, '').replace(/^#/, '');
const round = (v, d = 6) => (typeof v === 'number' ? Number(v.toPrecision(d)) : v);

const ELEMENTS = {
  ELEMENT_PYRO: 'Pyro', ELEMENT_HYDRO: 'Hydro', ELEMENT_ANEMO: 'Anemo', ELEMENT_ELECTRO: 'Electro',
  ELEMENT_DENDRO: 'Dendro', ELEMENT_CRYO: 'Cryo', ELEMENT_GEO: 'Geo',
};
const WEAPONS = {
  WEAPON_SWORD_ONE_HAND: 'Espada ligera', WEAPON_CLAYMORE: 'Mandoble', WEAPON_POLE: 'Lanza',
  WEAPON_BOW: 'Arco', WEAPON_CATALYST: 'Catalizador',
};
const STAT_KEYS = {
  FIGHT_PROP_HP_PERCENT: 'hpPct', FIGHT_PROP_ATTACK_PERCENT: 'atkPct', FIGHT_PROP_DEFENSE_PERCENT: 'defPct',
  FIGHT_PROP_CRITICAL: 'cr', FIGHT_PROP_CRITICAL_HURT: 'cd', FIGHT_PROP_CHARGE_EFFICIENCY: 'er',
  FIGHT_PROP_ELEMENT_MASTERY: 'em', FIGHT_PROP_HEAL_ADD: 'heal', FIGHT_PROP_PHYSICAL_ADD_HURT: 'physDmg',
  FIGHT_PROP_FIRE_ADD_HURT: 'pyroDmg', FIGHT_PROP_WATER_ADD_HURT: 'hydroDmg', FIGHT_PROP_WIND_ADD_HURT: 'anemoDmg',
  FIGHT_PROP_ELEC_ADD_HURT: 'electroDmg', FIGHT_PROP_GRASS_ADD_HURT: 'dendroDmg', FIGHT_PROP_ICE_ADD_HURT: 'cryoDmg',
  FIGHT_PROP_ROCK_ADD_HURT: 'geoDmg', FIGHT_PROP_BASE_ATTACK: 'atk',
};

// Región para quienes el juego no asigna nación en sus datos.
const REGION_FIX = {
  Aloy: 'Otros', Alyosha: 'Snezhnaya', Nicole: 'Otros', Odette: 'Nod-Krai', Sandrone: 'Snezhnaya',
  Skirk: 'Otros', Vesna: 'Nod-Krai', Vodyanitsa: 'Nod-Krai', Zibai: 'Liyue',
};

// Roles habituales en el meta (el juego no los expone en sus datos).
const ROLES = {
  Albedo: ['Sub-DPS', 'Soporte'], Alhaitham: ['DPS Principal'], Aloy: ['DPS Principal'], Amber: ['Sub-DPS'],
  'Arataki Itto': ['DPS Principal'], Arlecchino: ['DPS Principal'], Baizhu: ['Sanador', 'Soporte'],
  Barbara: ['Sanador'], Beidou: ['Sub-DPS', 'Escudo'], Bennett: ['Soporte', 'Sanador'], Candace: ['Soporte'],
  Charlotte: ['Sanador'], Chasca: ['DPS Principal'], Chevreuse: ['Soporte', 'Sanador'], Chiori: ['Sub-DPS'],
  Chongyun: ['Sub-DPS', 'Soporte'], Citlali: ['Soporte', 'Escudo'], Clorinde: ['DPS Principal'],
  Collei: ['Sub-DPS'], Cyno: ['DPS Principal'], Dehya: ['Sub-DPS'], Diluc: ['DPS Principal'],
  Diona: ['Escudo', 'Sanador'], Dori: ['Sanador', 'Soporte'], Emilie: ['Sub-DPS'],
  Escoffier: ['Sub-DPS', 'Sanador', 'Soporte'], Eula: ['DPS Principal'], Faruzan: ['Soporte'],
  Fischl: ['Sub-DPS'], Freminet: ['DPS Principal'], Furina: ['Sub-DPS', 'Soporte'], Gaming: ['DPS Principal'],
  Ganyu: ['DPS Principal'], Gorou: ['Soporte'], 'Hu Tao': ['DPS Principal'], Kachina: ['Sub-DPS'],
  'Kaedehara Kazuha': ['Soporte', 'Sub-DPS'], Kaeya: ['Sub-DPS'], 'Kamisato Ayaka': ['DPS Principal'],
  'Kamisato Ayato': ['DPS Principal'], Kaveh: ['DPS Principal', 'Sanador'], Keqing: ['DPS Principal'],
  Kinich: ['DPS Principal'], Kirara: ['Escudo'], Klee: ['DPS Principal'], 'Kujou Sara': ['Soporte'],
  'Kuki Shinobu': ['Sanador', 'Sub-DPS'], 'Lan Yan': ['Escudo', 'Soporte'], Layla: ['Escudo'],
  Lisa: ['Sub-DPS', 'Soporte'], Lynette: ['Soporte'], Lyney: ['DPS Principal'],
  Mavuika: ['DPS Principal', 'Soporte'], Mika: ['Sanador', 'Soporte'], Mona: ['Soporte', 'Sub-DPS'],
  Mualani: ['DPS Principal'], Nahida: ['Sub-DPS', 'Soporte'], Navia: ['DPS Principal'],
  Neuvillette: ['DPS Principal'], Nilou: ['Soporte'], Ningguang: ['DPS Principal'],
  Noelle: ['DPS Principal', 'Escudo'], Ororon: ['Sub-DPS'], Qiqi: ['Sanador'],
  'Raiden Shogun': ['DPS Principal', 'Soporte'], Razor: ['DPS Principal'], Rosaria: ['Soporte', 'Sub-DPS'],
  'Sangonomiya Kokomi': ['Sanador', 'Sub-DPS'], Sayu: ['Sanador', 'Soporte'], Sethos: ['DPS Principal'],
  Shenhe: ['Soporte'], 'Shikanoin Heizou': ['DPS Principal'], Sigewinne: ['Sanador', 'Sub-DPS'],
  Skirk: ['DPS Principal'], Sucrose: ['Soporte'], Tartaglia: ['DPS Principal'], Thoma: ['Escudo'],
  Tighnari: ['DPS Principal'], Varesa: ['DPS Principal'], Venti: ['Soporte', 'Sub-DPS'],
  Wanderer: ['DPS Principal'], Wriothesley: ['DPS Principal'], Xiangling: ['Sub-DPS'],
  Xianyun: ['Soporte', 'Sanador'], Xiao: ['DPS Principal'], Xilonen: ['Soporte', 'Sanador'],
  Xingqiu: ['Sub-DPS'], Xinyan: ['Escudo'], 'Yae Miko': ['Sub-DPS'], Yanfei: ['DPS Principal'],
  Yaoyao: ['Sanador'], Yelan: ['Sub-DPS'], Yoimiya: ['DPS Principal'],
  'Yumemizuki Mizuki': ['DPS Principal', 'Sanador'], 'Yun Jin': ['Soporte'], Zhongli: ['Escudo', 'Soporte'],
  Iansan: ['Soporte'], Ifa: ['Sanador', 'Soporte'], Ineffa: ['Sub-DPS', 'Escudo'], Lauma: ['Soporte', 'Sub-DPS'],
  Flins: ['DPS Principal'], Aino: ['Soporte', 'Sub-DPS'], Nefer: ['DPS Principal'], Dahlia: ['Escudo', 'Soporte'],
  Jean: ['Sanador', 'Soporte'], Varka: ['DPS Principal'], Columbina: ['Sub-DPS', 'Soporte'],
};

function guessRoles(talents) {
  const text = ['combat2', 'combat3'].map((k) => talents[k]?.description || '').join(' ').toLowerCase();
  const roles = [];
  if (/cura|recupera.*vida/.test(text)) roles.push('Sanador');
  if (/escudo/.test(text)) roles.push('Escudo');
  roles.push(/aumenta|otorga a .*personajes/.test(text) ? 'Soporte' : 'Sub-DPS');
  return roles;
}

function attrs(combat) {
  if (!combat?.attributes) return null;
  const { labels, parameters } = combat.attributes;
  const p = {};
  for (const [k, arr] of Object.entries(parameters)) p[k.replace('param', '')] = arr.map((v) => round(v));
  return { l: labels, p };
}

function talentBlock(t) {
  const out = {};
  for (const key of ['combat1', 'combat2', 'combat3']) {
    const c = t[key];
    if (!c) continue;
    out[key] = { n: c.name, d: clean(c.description), a: attrs(c), i: t.images?.[`filename_${key}`] };
  }
  out.passives = ['passive1', 'passive2', 'passive3', 'passive4']
    .filter((k) => t[k])
    .map((k) => ({ n: t[k].name, d: clean(t[k].description) }));
  return out;
}

function charStats(c) {
  const stats = {};
  for (const lv of LEVELS) {
    const asc = lv.endsWith('+') ? '+' : '-';
    const s = c.stats(parseInt(lv, 10), asc);
    stats[lv] = [round(s.hp), round(s.attack), round(s.defense), round(s.specialized)];
  }
  return stats;
}

function buildCharacters() {
  const en = (n) => { g.setOptions({ resultLanguage: 'English' }); const r = g.characters(n); g.setOptions({ resultLanguage: 'Spanish' }); return r; };
  g.setOptions({ queryLanguages: ['English'], resultLanguage: 'English' });
  const names = g.characters('names', { matchCategories: true });
  g.setOptions({ queryLanguages: ['English'], resultLanguage: 'Spanish' });
  const list = [];
  for (const name of names) {
    if (/^Manekin/.test(name)) continue;
    const c = g.characters(name);
    if (name === 'Aether') continue; // Viajero: se genera una entrada por elemento usando a Lumine.
    if (name === 'Lumine') {
      for (const el of ['Anemo', 'Geo', 'Electro', 'Dendro', 'Hydro', 'Pyro', 'Cryo']) {
        const t = g.talents(`Traveler (${el})`);
        const cons = g.constellations(`Traveler (${el})`);
        if (!t) continue;
        list.push({
          id: `traveler-${el.toLowerCase()}`, en: `Traveler (${el})`, name: `Viajero (${el})`, title: 'Viajero de otro mundo',
          rarity: 5, element: el, weapon: WEAPONS[c.weaponType], region: 'Otros', roles: ['Sub-DPS'],
          sub: STAT_KEYS[c.substatType] || 'atkPct', subText: c.substatText,
          icon: c.images.mihoyo_icon, iconFile: c.images.filename_icon, version: c.version,
          stats: charStats(c), talents: talentBlock(t), cons: consBlock(cons),
        });
      }
      continue;
    }
    const t = g.talents(name);
    if (!t) { console.warn('Sin talentos:', name); continue; }
    const cons = g.constellations(name);
    const enName = en(name).name;
    list.push({
      id: enName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), en: enName, name: c.name, title: c.title,
      rarity: c.rarity > 5 ? 5 : c.rarity, element: ELEMENTS[c.elementType], weapon: WEAPONS[c.weaponType],
      region: (c.region || REGION_FIX[enName] || 'Otros').replace('Nod Krai', 'Nod-Krai'), affiliation: c.affiliation,
      roles: ROLES[enName] || guessRoles(t), rolesGuessed: !ROLES[enName],
      sub: STAT_KEYS[c.substatType], subText: c.substatText, constellation: c.constellation,
      icon: c.images.mihoyo_icon, iconFile: c.images.filename_icon, version: c.version,
      stats: charStats(c), talents: talentBlock(t), cons: consBlock(cons),
    });
  }
  return list;
}

function consBlock(cons) {
  if (!cons) return [];
  return ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((k) => ({ n: cons[k]?.name, d: clean(cons[k]?.description) }));
}

function buildWeapons() {
  g.setOptions({ queryLanguages: ['English'], resultLanguage: 'English' });
  const names = g.weapons('names', { matchCategories: true });
  g.setOptions({ queryLanguages: ['English'], resultLanguage: 'Spanish' });
  const list = [];
  for (const name of names) {
    const w = g.weapons(name);
    if (!w || !w.stats) continue;
    const stats = {};
    for (const lv of WEAPON_LEVELS) {
      const asc = lv.endsWith('+') ? '+' : '-';
      const lvl = parseInt(lv, 10);
      if (w.rarity <= 2 && lvl > 70) continue;
      const s = w.stats(lvl, asc);
      stats[lv] = [round(s.attack), round(s.specialized || 0)];
    }
    const refs = ['r1', 'r2', 'r3', 'r4', 'r5'].filter((r) => w[r]).map((r) => w[r].values);
    list.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), en: name, name: w.name, type: WEAPONS[w.weaponType],
      rarity: w.rarity, sub: STAT_KEYS[w.mainStatType] || null, subText: w.mainStatText || '',
      effectName: w.effectName || '', effect: clean(w.effectTemplateRaw),
      refs, icon: w.images?.mihoyo_icon || w.images?.icon, iconFile: w.images?.filename_icon,
      stats, version: w.version,
    });
  }
  return list;
}

function buildArtifacts() {
  g.setOptions({ queryLanguages: ['English'], resultLanguage: 'English' });
  const names = g.artifacts('names', { matchCategories: true });
  g.setOptions({ queryLanguages: ['English'], resultLanguage: 'Spanish' });
  return names.map((name) => {
    const a = g.artifacts(name);
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), en: name, name: a.name,
      rarity: Math.max(...(a.rarityList || [5])), e1: clean(a.effect1Pc), e2: clean(a.effect2Pc), e4: clean(a.effect4Pc),
      icon: a.images?.mihoyo_flower || a.images?.mihoyo_circlet || '',
    };
  });
}

const data = {
  generated: new Date().toISOString().slice(0, 10),
  source: `genshin-db ${require('genshin-db/package.json').version}`,
  characters: buildCharacters(),
  weapons: buildWeapons(),
  artifacts: buildArtifacts(),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `/* Generado por scripts/build-data.cjs — no editar a mano */\nwindow.GAMEDATA=${JSON.stringify(data)};\n`);
console.log(`Personajes: ${data.characters.length}, armas: ${data.weapons.length}, artefactos: ${data.artifacts.length}`);
console.log(`Tamaño: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
