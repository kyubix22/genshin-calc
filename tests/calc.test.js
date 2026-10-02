const test = require('node:test');
const assert = require('node:assert');
global.window = globalThis;
['../app/data/gamedata.js', '../app/js/calc.js', '../app/js/effects.js', '../app/js/model.js', '../app/js/advisor.js'].forEach((f) => require(f));
const { GC } = globalThis;
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('multiplicadores de DEF y RES', () => {
  close(GC.defMultiplier(90, 90), 0.5);
  close(GC.defMultiplier(90, 100), 190 / 390);
  close(GC.resMultiplier(0.1), 0.9);
  close(GC.resMultiplier(-0.2), 1.1);
  close(GC.resMultiplier(1), 0.2);
});

test('reacciones', () => {
  close(GC.levelMultiplier(90), 1446.85);
  close(GC.emAmplifying(0), 0);
  const s = GC.applyMods({ hp: 1, atk: 1000, def: 1, em: 0, cr: 0, cd: 0.5, er: 1, dmg: { pyro: 0 } }, { hp: 1, atk: 1, def: 1 }, []);
  const hit = { terms: [{ stat: 'atk', mult: 1 }], flat: 0, hits: 1, element: 'Pyro', category: 'skill', kind: 'dmg' };
  const base = GC.computeHit(hit, s, { charLevel: 90, enemy: { level: 90, res: 0.1 }, reaction: 'none' });
  close(base.nonCrit, 1000 * 0.5 * 0.9);
  const vape = GC.computeHit(hit, s, { charLevel: 90, enemy: { level: 90, res: 0.1 }, reaction: 'vaporize' });
  close(vape.nonCrit, base.nonCrit * 1.5);
});

test('datos del juego completos', () => {
  assert.ok(GAMEDATA.characters.length >= 120);
  assert.ok(GAMEDATA.weapons.length >= 200);
  const raiden = GC.charByEn('Raiden Shogun');
  close(GC.charBase(raiden, '90').atk, 337.242, 1e-2);
  close(GC.weaponBase(GC.weapon('engulfing-lightning'), '90').atk, 608.075, 1e-2);
});

test('lectura de talentos (Bennett Q nivel 13 = 119% ATQ base)', () => {
  const b = GC.charByEn('Bennett');
  close(GC.talentValue(b.talents.combat3.a, /Bono de ATQ/, 13), 1.19, 1e-3);
  const rows = GC.parseTalent(b.talents.combat3.a, 10);
  const heal = rows.find((r) => r.kind === 'heal');
  assert.ok(heal && heal.terms[0].stat === 'hp' && heal.flat > 1000);
});

test('todos los personajes producen filas de daño y el consejero funciona', () => {
  for (const c of GAMEDATA.characters) {
    const prof = GC.newProfile(c);
    const ev = GC.evaluate(c, prof, { enemy: { level: 90, res: 0.1 }, reaction: 'none' });
    const dmg = Object.values(ev.talents).flatMap((t) => t.rows).filter((r) => r.kind === 'dmg');
    assert.ok(dmg.length > 0, c.en);
    dmg.forEach((r) => assert.ok(Number.isFinite(r.result.avg) && r.result.avg >= 0, `${c.en} ${r.name}`));
  }
  const r = GC.charByEn('Raiden Shogun');
  const p = GC.newProfile(r);
  const opts = { enemy: { level: 90, res: 0.1 }, reaction: 'none' };
  const a = GC.advise(r, p, opts, GC.defaultTarget(r, p, opts));
  assert.ok(a.weapons.length > 10 && a.subs.length === 10);
});
