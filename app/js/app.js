/* Crónica de Teyvat — interfaz */
(function () {
  const GD = window.GAMEDATA;
  const GC = window.GC;
  const view = document.getElementById('view');

  /* ===================== Estado persistente ===================== */
  const STORE_KEY = 'cronica-teyvat:v1';
  const state = Object.assign({
    tab: 'personajes',
    selected: null,
    profiles: {},
    team: { name: 'Equipo 1', ids: [] },
    teamToggles: {},
    enemy: { level: 90, res: 0.1 },
    reaction: 'none',
    useTeam: true,
    filters: { q: '', element: null, region: null, weapon: null, role: null, rarity: null, sort: 'rarity' },
    wfilters: { q: '', type: null, rarity: null, expanded: null, refine: 1 },
    calcTab: 'combat3',
    advisorTarget: null,
    apiKey: '',
  }, load());

  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* almacenamiento no disponible */ }
  }

  function profile(char) {
    if (!state.profiles[char.id]) state.profiles[char.id] = GC.newProfile(char);
    const p = state.profiles[char.id];
    p.toggles = p.toggles || { weapon: true, set: true };
    p.manual = p.manual || {};
    return p;
  }

  /* ===================== Utilidades ===================== */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n0 = (v) => Math.round(v).toLocaleString('es');
  const pc = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
  const ELC = { Pyro: 'var(--pyro)', Hydro: 'var(--hydro)', Anemo: 'var(--anemo)', Electro: 'var(--electro)', Dendro: 'var(--dendro)', Cryo: 'var(--cryo)', Geo: 'var(--geo)', Físico: 'var(--phys)' };
  const EL_ES = { Pyro: 'Pyro', Hydro: 'Hydro', Anemo: 'Anemo', Electro: 'Electro', Dendro: 'Dendro', Cryo: 'Cryo', Geo: 'Geo', Físico: 'Físico' };
  const ELEMENT_PATHS = {
    Pyro: '<path d="M12 2c1.2 4.2 5.5 6.3 5.5 11.3a5.5 5.5 0 0 1-11 0c0-3.2 1.8-4.5 2.2-7.3 1.4 1.1 2 2.8 1.9 4.4 1.3-1.4 1.9-4.6 1.4-8.4z"/>',
    Hydro: '<path d="M12 2.5C9.2 7.2 5.5 10.2 5.5 14.5a6.5 6.5 0 0 0 13 0c0-4.3-3.7-7.3-6.5-12z"/>',
    Anemo: '<path d="M12 3a9 9 0 1 0 9 9h-3a6 6 0 1 1-6-6V3z"/><circle cx="12" cy="12" r="2.4"/>',
    Electro: '<path d="M12 2 21 12 12 22 3 12z" opacity=".45"/><path d="M13.5 5 8.5 13h3.2L10.5 19l5-8h-3.2z"/>',
    Dendro: '<path d="M4.5 19.5C4.5 9.5 10.5 4 20 4c0 9.5-5.5 15.5-15.5 15.5z"/><path d="M5 19 14 10" stroke="#0006" stroke-width="1.3"/>',
    Cryo: '<g stroke-width="2.2" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/></g><circle cx="12" cy="12" r="2.8"/>',
    Geo: '<path d="M12 2 20.5 7.5v9L12 22l-8.5-5.5v-9z" opacity=".5"/><path d="M12 6l5 3.3v5.4L12 18l-5-3.3V9.3z"/>',
    Físico: '<circle cx="12" cy="12" r="7"/>',
  };
  const elIcon = (el) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="${ELC[el]}" stroke="${ELC[el]}" stroke-width="0">${ELEMENT_PATHS[el] || ''}</svg>`;
  const stars = (n) => '★'.repeat(n);

  function imgTag(url, file, fallbackText, cls = '') {
    const alt = file ? `https://enka.network/ui/${file}.png` : '';
    return `<img loading="lazy" class="${cls}" src="${esc(url || alt)}" data-alt="${esc(alt)}" data-fb="${esc(fallbackText)}" alt="" onerror="window.__imgErr(this)">`;
  }
  window.__imgErr = function (img) {
    if (img.dataset.alt && img.src !== img.dataset.alt) { img.src = img.dataset.alt; return; }
    const d = document.createElement('div');
    d.className = 'img-fallback';
    d.textContent = (img.dataset.fb || '?').slice(0, 2);
    img.replaceWith(d);
  };
  const charImg = (c) => imgTag(c.icon, c.iconFile, c.name);
  const weaponImg = (w) => (w ? imgTag(w.icon, w.iconFile, w.name) : '');

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function sheet(html, onMount) {
    const back = document.createElement('div');
    back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet"><button class="gbtn dark sm close" data-close><span class="dot x"></span>Cerrar</button>${html}</div>`;
    const close = () => back.remove();
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(back);
    if (onMount) onMount(back.querySelector('.sheet'), close);
    return close;
  }

  /* ===================== Navegación ===================== */
  const TAB_NAMES = { personajes: 'Personajes', calculadora: 'Calculadora de daño', equipos: 'Equipos', armas: 'Catálogo de armas', consejero: 'Consejero' };
  function go(tab) {
    state.tab = tab;
    save();
    document.querySelectorAll('#navbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('section-name').textContent = TAB_NAMES[tab];
    render();
    window.scrollTo(0, 0);
  }
  document.getElementById('navbar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) go(b.dataset.tab);
  });
  document.getElementById('about-btn').addEventListener('click', aboutSheet);

  function render() {
    ({ personajes: renderCharacters, calculadora: renderCalc, equipos: renderTeam, armas: renderWeapons, consejero: renderAdvisor }[state.tab] || renderCharacters)();
  }

  /* ===================== PERSONAJES ===================== */
  const REGIONS = ['Mondstadt', 'Liyue', 'Inazuma', 'Sumeru', 'Fontaine', 'Natlan', 'Nod-Krai', 'Snezhnaya', 'Otros'];
  const WEAPON_TYPES = ['Espada ligera', 'Mandoble', 'Lanza', 'Arco', 'Catalizador'];
  const ROLES = ['DPS Principal', 'Sub-DPS', 'Soporte', 'Sanador', 'Escudo'];

  function filteredChars() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase();
    let list = GD.characters.filter((c) =>
      (!q || c.name.toLowerCase().includes(q) || c.en.toLowerCase().includes(q) || c.element.toLowerCase().includes(q))
      && (!f.element || c.element === f.element)
      && (!f.region || c.region === f.region)
      && (!f.weapon || c.weapon === f.weapon)
      && (!f.role || c.roles.includes(f.role))
      && (!f.rarity || c.rarity === f.rarity));
    const byName = (a, b) => a.name.localeCompare(b.name, 'es');
    if (f.sort === 'name') list.sort(byName);
    else if (f.sort === 'element') list.sort((a, b) => GC.ELEMENTS.indexOf(a.element) - GC.ELEMENTS.indexOf(b.element) || byName(a, b));
    else if (f.sort === 'version') list.sort((a, b) => parseFloat(b.version) - parseFloat(a.version) || byName(a, b));
    else list.sort((a, b) => b.rarity - a.rarity || byName(a, b));
    return list;
  }

  function chipRow(label, key, values, render = (v) => esc(v)) {
    const cur = state.filters[key];
    return `<div class="filter-label">${label}</div><div class="chips">
      <button class="chip ${cur == null ? 'active' : ''}" data-filter="${key}" data-value="">Todos</button>
      ${values.map((v) => `<button class="chip ${cur === v ? 'active' : ''}" data-filter="${key}" data-value="${esc(v)}">${render(v)}</button>`).join('')}
    </div>`;
  }

  function renderCharacters() {
    const f = state.filters;
    view.innerHTML = `
      <div class="search mb">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input id="q" placeholder="Buscar personaje…" value="${esc(f.q)}" autocomplete="off">
      </div>
      <div class="panel" style="padding:10px 12px">
        ${chipRow('Elemento', 'element', GC.ELEMENTS, (v) => `${elIcon(v)}${v}`)}
        ${chipRow('Nación', 'region', REGIONS)}
        ${chipRow('Arma', 'weapon', WEAPON_TYPES)}
        ${chipRow('Rol', 'role', ROLES)}
        <div class="row between mt">
          <div class="seg" id="rarity-seg">
            <button class="${!f.rarity ? 'active' : ''}" data-rarity="">Todas</button>
            <button class="${f.rarity === 5 ? 'active' : ''}" data-rarity="5">5★</button>
            <button class="${f.rarity === 4 ? 'active' : ''}" data-rarity="4">4★</button>
          </div>
          <select class="input" id="sort" style="width:auto">
            <option value="rarity" ${f.sort === 'rarity' ? 'selected' : ''}>Rareza</option>
            <option value="name" ${f.sort === 'name' ? 'selected' : ''}>Nombre</option>
            <option value="element" ${f.sort === 'element' ? 'selected' : ''}>Elemento</option>
            <option value="version" ${f.sort === 'version' ? 'selected' : ''}>Más recientes</option>
          </select>
        </div>
      </div>
      <div class="title">Archivo de personajes <span class="right" id="count"></span></div>
      <div class="char-grid" id="grid"></div>`;
    drawGrid();
    view.querySelector('#q').addEventListener('input', (e) => { f.q = e.target.value; save(); drawGrid(); });
    view.querySelector('#sort').addEventListener('change', (e) => { f.sort = e.target.value; save(); drawGrid(); });
    view.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      f[b.dataset.filter] = b.dataset.value || null;
      save();
      renderCharacters();
    }));
    view.querySelectorAll('[data-rarity]').forEach((b) => b.addEventListener('click', () => {
      f.rarity = b.dataset.rarity ? +b.dataset.rarity : null;
      save();
      renderCharacters();
    }));
  }

  function charCard(c, extra = '') {
    const inTeam = state.team.ids.includes(c.id);
    return `<div class="ccard r${c.rarity}" data-char="${c.id}">
      <div class="art">${charImg(c)}<span class="el">${elIcon(c.element)}</span><span class="stars">${stars(c.rarity)}</span>${inTeam ? '<span class="badge-team">EQ</span>' : ''}${extra}</div>
      <div class="name">${esc(c.name)}</div>
    </div>`;
  }

  function drawGrid() {
    const list = filteredChars();
    const grid = view.querySelector('#grid');
    view.querySelector('#count').textContent = `${list.length} de ${GD.characters.length}`;
    grid.innerHTML = list.length ? list.map((c) => charCard(c)).join('') : '<div class="empty" style="grid-column:1/-1"><div class="serif">Sin resultados</div>Prueba con otros filtros.</div>';
    grid.querySelectorAll('[data-char]').forEach((el) => el.addEventListener('click', () => charSheet(GC.char(el.dataset.char))));
  }

  function charSheet(c) {
    const inTeam = state.team.ids.includes(c.id);
    const t = c.talents;
    sheet(`
      <div class="hero mb">
        <div class="avatar r${c.rarity}" style="width:84px;height:84px">${charImg(c)}</div>
        <div class="grow">
          <h2>${esc(c.name)}</h2>
          <div class="muted small">${esc(c.title || '')}</div>
          <div class="row wrap mt" style="gap:5px">
            <span class="tag">${elIcon(c.element)}${c.element}</span>
            <span class="tag">${esc(c.weapon)}</span>
            <span class="tag">${esc(c.region)}</span>
            <span class="tag" style="color:#ffd75a">${stars(c.rarity)}</span>
          </div>
        </div>
      </div>
      <div class="row wrap mb" style="gap:5px">${c.roles.map((r) => `<span class="tag cream">${esc(r)}</span>`).join('')}</div>
      <div class="grid2 mb">
        <button class="gbtn" data-act="calc"><span class="dot"></span>Calcular daño</button>
        <button class="gbtn dark" data-act="team"><span class="dot"></span>${inTeam ? 'Quitar del equipo' : 'Añadir al equipo'}</button>
      </div>
      <div class="title">Talentos</div>
      ${['combat1', 'combat2', 'combat3'].filter((k) => t[k]).map((k) => `<details class="fold mb"><summary>${esc(t[k].n)}</summary><div class="desc">${esc(t[k].d)}</div></details>`).join('')}
      ${(t.passives || []).length ? `<div class="title">Talentos pasivos</div>${t.passives.map((p) => `<details class="fold mb"><summary>${esc(p.n)}</summary><div class="desc">${esc(p.d)}</div></details>`).join('')}` : ''}
      ${(c.cons || []).length ? `<div class="title">Constelación${c.constellation ? `: ${esc(c.constellation)}` : ''}</div>${c.cons.map((p, i) => `<details class="fold mb"><summary>C${i + 1} · ${esc(p.n)}</summary><div class="desc">${esc(p.d)}</div></details>`).join('')}` : ''}
    `, (el, close) => {
      el.querySelector('[data-act="calc"]').addEventListener('click', () => { state.selected = c.id; close(); go('calculadora'); });
      el.querySelector('[data-act="team"]').addEventListener('click', () => {
        toggleTeam(c.id);
        close();
        render();
      });
    });
  }

  function toggleTeam(id) {
    const ids = state.team.ids;
    if (ids.includes(id)) state.team.ids = ids.filter((x) => x !== id);
    else if (ids.length >= 4) { toast('El equipo ya tiene 4 personajes'); return; }
    else ids.push(id);
    save();
    toast(state.team.ids.includes(id) ? 'Añadido al equipo' : 'Quitado del equipo');
  }

  /* ===================== CALCULADORA ===================== */
  const LEVEL_OPTIONS = ['1', '20', '20+', '40', '40+', '50', '50+', '60', '60+', '70', '70+', '80', '80+', '90', '95', '100'];

  function calcOptions(char) {
    const inTeam = state.team.ids.includes(char.id);
    return {
      useTeam: state.useTeam && inTeam,
      team: state.team.ids,
      profiles: state.profiles,
      toggles: state.teamToggles,
      enemy: state.enemy,
      reaction: state.reaction,
    };
  }

  function pickCharacterPrompt(title, onPick) {
    sheet(`<div class="title">${esc(title)}</div>
      <div class="search mb"><input id="pq" placeholder="Buscar…" autocomplete="off"></div>
      <div class="char-grid" id="pgrid"></div>`, (el, close) => {
      const draw = (q = '') => {
        const list = GD.characters.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name, 'es'));
        el.querySelector('#pgrid').innerHTML = list.map((c) => charCard(c)).join('');
        el.querySelectorAll('[data-char]').forEach((d) => d.addEventListener('click', () => { close(); onPick(GC.char(d.dataset.char)); }));
      };
      draw();
      el.querySelector('#pq').addEventListener('input', (e) => draw(e.target.value));
    });
  }

  function renderCalc() {
    const char = state.selected && GC.char(state.selected);
    if (!char) {
      view.innerHTML = `<div class="panel empty"><div class="serif">Elige un personaje</div><p>Selecciona a quién quieres calcular el daño.</p>
        <button class="gbtn" id="pick"><span class="dot"></span>Elegir personaje</button></div>`;
      view.querySelector('#pick').addEventListener('click', () => pickCharacterPrompt('Elegir personaje', (c) => { state.selected = c.id; save(); renderCalc(); }));
      return;
    }
    const prof = profile(char);
    const w = GC.weapon(prof.weaponId);
    const set = GC.artifact(prof.setId);
    const set2 = GC.artifact(prof.set2Id);
    const inTeam = state.team.ids.includes(char.id);
    const weModeled = w && GC.WEAPON_EFFECTS[w.en];
    const setModeled = set && (GC.ARTIFACT_EFFECTS[set.en]?.four || GC.ARTIFACT_EFFECTS[set.en]?.dep || GC.ARTIFACT_EFFECTS[set.en]?.team);
    const wb = GC.weaponBase(w, prof.weaponLevel);
    const panel = GC.panelOf(char, prof);
    const elKey = GC.ELEMENT_KEYS[char.element];

    view.innerHTML = `
      <div class="panel">
        <div class="hero">
          <div class="avatar r${char.rarity}">${charImg(char)}</div>
          <div class="grow">
            <div class="row between"><h2 class="ellipsis">${esc(char.name)}</h2><button class="gbtn dark sm" id="change-char"><span class="dot"></span>Cambiar</button></div>
            <div class="row wrap" style="gap:5px;margin-top:4px">
              <span class="tag">${elIcon(char.element)}${char.element}</span><span class="tag">${esc(char.weapon)}</span><span class="tag" style="color:#ffd75a">${stars(char.rarity)}</span>
            </div>
          </div>
        </div>
        <div class="grid2 mt">
          <div class="field"><label>Nivel</label><select class="input" data-prof="level">${LEVEL_OPTIONS.map((l) => `<option ${prof.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>Constelación</label><select class="input" data-prof="cons" data-num>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<option value="${i}" ${prof.cons === i ? 'selected' : ''}>C${i}</option>`).join('')}</select></div>
        </div>
        <div class="grid3 mt">
          ${[['normal', 'At. Normal'], ['skill', 'Habilidad'], ['burst', 'Definitiva']].map(([k, l]) => `
            <div class="field"><label>${l}</label><div class="stepper"><button data-step="${k}" data-d="-1">−</button><span>${prof.talent[k]}</span><button data-step="${k}" data-d="1">+</button></div></div>`).join('')}
        </div>
        <div class="tiny muted mt">Usa el nivel de talento que ves en el juego (incluyendo +3 de constelaciones). Los efectos de constelación no se aplican automáticamente: añádelos en «Bonos manuales».</div>
      </div>

      <div class="panel">
        <div class="title">Arma equipada</div>
        <div class="witem selected" id="open-weapons">
          <div class="wicon r${w?.rarity || 3}">${weaponImg(w)}</div>
          <div class="grow">
            <div class="row between"><b class="gold ellipsis">${esc(w?.name || 'Sin arma')}</b><span class="tag cream">R${prof.refine}</span></div>
            <div class="small muted">${w ? `${stars(w.rarity)} · ATQ base ${n0(wb.atk)}${w.sub ? ` · ${esc(w.subText)} ${fmtSub(w.sub, wb.sub)}` : ''}` : ''}</div>
            <div class="tiny" style="margin-top:3px">${weModeled ? '<span class="badge">Pasiva calculada</span>' : '<span class="badge warn">Pasiva informativa</span>'}</div>
          </div>
        </div>
        <div class="grid2 mt">
          <div class="field"><label>Nivel del arma</label><select class="input" data-prof="weaponLevel">${Object.keys(w?.stats || {}).map((l) => `<option ${prof.weaponLevel === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>Refinamiento</label><select class="input" data-prof="refine" data-num>${[1, 2, 3, 4, 5].map((r) => `<option value="${r}" ${prof.refine === r ? 'selected' : ''}>R${r}</option>`).join('')}</select></div>
        </div>
        ${w ? `<div class="wpassive"><b>${esc(w.effectName)}</b><br>${weaponPassive(w, prof.refine)}</div>
        <label class="row between mt"><span class="small">Aplicar pasiva (condiciones cumplidas)</span><span class="switch"><input type="checkbox" data-toggle="weapon" ${prof.toggles.weapon !== false ? 'checked' : ''}><span></span></span></label>` : ''}
      </div>

      <div class="panel">
        <div class="title">Artefactos</div>
        <div class="grid2">
          <button class="witem" id="open-set" style="text-align:left">
            <div class="wicon r5" style="width:44px;height:44px">${set ? imgTag(set.icon, '', set.name) : ''}</div>
            <div class="grow"><div class="tiny muted">${set2 ? 'Set A (2p)' : 'Set (4p)'}</div><b class="small">${esc(set?.name || 'Elegir set')}</b></div>
          </button>
          <button class="witem" id="open-set2" style="text-align:left">
            <div class="wicon r5" style="width:44px;height:44px">${set2 ? imgTag(set2.icon, '', set2.name) : ''}</div>
            <div class="grow"><div class="tiny muted">Set B (2p) opcional</div><b class="small">${esc(set2?.name || 'Ninguno')}</b></div>
          </button>
        </div>
        ${set ? `<div class="wpassive"><b>2 piezas:</b> ${esc(set.e2)}${set.e4 && !set2 ? `<br><b>4 piezas:</b> ${esc(set.e4)}` : ''}${set2 ? `<br><b>${esc(set2.name)} (2p):</b> ${esc(set2.e2)}` : ''}</div>
        ${!set2 ? `<label class="row between mt"><span class="small">Aplicar efecto de 4 piezas ${setModeled ? '<span class="badge">calculado</span>' : '<span class="badge warn">informativo</span>'}</span><span class="switch"><input type="checkbox" data-toggle="set" ${prof.toggles.set !== false ? 'checked' : ''}><span></span></span></label>` : ''}` : ''}
        <div class="tiny muted mt">Los bonos de 2 piezas ya aparecen en los atributos del panel del juego.</div>
      </div>

      <div class="panel">
        <div class="title">Atributos del panel <span class="right">${prof.panel ? 'introducidos' : 'base sin artefactos'}</span></div>
        <div class="subtitle">Copia los valores de la pantalla «Atributos» del juego (con arma y artefactos).</div>
        <div class="stat-list">
          ${statInput('hp', 'Vida Máx.', panel.hp)}
          ${statInput('atk', 'ATQ', panel.atk)}
          ${statInput('def', 'DEF', panel.def)}
          ${statInput('em', 'Maestría Elemental', panel.em)}
          ${statInput('cr', 'Prob. CRIT', panel.cr, true)}
          ${statInput('cd', 'Daño CRIT', panel.cd, true)}
          ${statInput('er', 'Recarga de Energía', panel.er, true)}
          ${statInput('heal', 'Bono de Curación', panel.heal, true)}
          ${statInput(`dmg.${elKey}`, `Bono de Daño ${char.element}`, panel.dmg[elKey], true)}
          ${statInput('dmg.phys', 'Bono de Daño Físico', panel.dmg.phys, true)}
        </div>
        <details class="fold mt"><summary class="small">Otros bonos de daño elemental</summary>
          <div class="stat-list mt">${GC.ELEMENTS.filter((e) => e !== char.element).map((e) => statInput(`dmg.${GC.ELEMENT_KEYS[e]}`, `Bono de Daño ${e}`, panel.dmg[GC.ELEMENT_KEYS[e]], true)).join('')}</div>
        </details>
        <div class="grid2 mt">
          <button class="gbtn dark sm" id="reset-panel"><span class="dot"></span>Base sin artefactos</button>
          <button class="gbtn sm" id="typical"><span class="dot"></span>Build típica</button>
        </div>
      </div>

      <div class="panel">
        <details class="fold"><summary>Bonos manuales (constelaciones, comida, etc.)</summary>
          <div class="grid2 mt">
            ${manualInput('atkPct', 'ATQ % extra', prof.manual.atkPct)}
            ${manualInput('dmg', 'Bono de Daño % extra', prof.manual.dmg)}
            ${manualInput('cr', 'Prob. CRIT % extra', prof.manual.cr)}
            ${manualInput('cd', 'Daño CRIT % extra', prof.manual.cd)}
            ${manualInput('em', 'Maestría extra', prof.manual.em)}
            ${manualInput('flat', 'Daño plano extra', prof.manual.flat)}
            ${manualInput('res', 'Reducción RES enemiga %', prof.manual.res)}
            ${manualInput('defRed', 'Reducción DEF enemiga %', prof.manual.defRed)}
          </div>
        </details>
      </div>

      <div class="panel">
        <div class="title">Combate</div>
        <div class="grid2">
          <div class="field"><label>Nivel del enemigo</label><input class="input" type="number" min="1" max="200" id="enemy-level" value="${state.enemy.level}"></div>
          <div class="field"><label>RES elemental del enemigo %</label><input class="input" type="number" step="1" id="enemy-res" value="${Math.round(state.enemy.res * 100)}"></div>
        </div>
        <div class="grid2 mt">
          <div class="field"><label>Reacción en los golpes</label><select class="input" id="reaction">${Object.entries(GC.HIT_REACTIONS).map(([k, r]) => `<option value="${k}" ${state.reaction === k ? 'selected' : ''}>${r.name}</option>`).join('')}</select></div>
          <div class="field"><label>Infusión elemental en At. Normal</label><label class="row" style="height:38px"><span class="switch"><input type="checkbox" id="infusion" ${prof.infusion ? 'checked' : ''}><span></span></span><span class="small muted">${char.weapon === 'Catalizador' ? 'Siempre elemental' : 'Convierte físico en ' + char.element}</span></label></div>
        </div>
        ${inTeam ? `<label class="row between mt"><span class="small">Aplicar buffs de «${esc(state.team.name)}»</span><span class="switch"><input type="checkbox" id="use-team" ${state.useTeam ? 'checked' : ''}><span></span></span></label>` : '<div class="tiny muted mt">Añade este personaje a tu equipo para aplicar los bonos de sus compañeros.</div>'}
      </div>

      <div id="calc-results"></div>`;

    bindCalc(char, prof);
    drawResults(char, prof);
  }

  function fmtSub(key, v) {
    if (!key) return '';
    if (key === 'em') return n0(v);
    return pc(v, 1);
  }

  function weaponPassive(w, refine) {
    const vals = w.refs[Math.max(0, Math.min(w.refs.length - 1, refine - 1))] || [];
    return esc(w.effect).replace(/\{(\d+)\}/g, (_, i) => `<b>${esc(vals[+i] ?? '?')}</b>`);
  }

  function statInput(key, label, value, pct = false) {
    const v = pct ? +(value * 100).toFixed(1) : Math.round(value);
    return `<div class="stat-row"><span class="k">${esc(label)}</span><span class="row"><input class="input stat-input" type="number" inputmode="decimal" step="${pct ? '0.1' : '1'}" data-stat="${key}" data-pct="${pct ? 1 : ''}" value="${v}">${pct ? '<span class="muted small">%</span>' : '<span style="width:12px"></span>'}</span></div>`;
  }
  function manualInput(key, label, value) {
    return `<div class="field"><label>${esc(label)}</label><input class="input" type="number" inputmode="decimal" step="0.1" data-manual="${key}" value="${value ?? ''}" placeholder="0"></div>`;
  }

  function bindCalc(char, prof) {
    const persist = () => { save(); };
    view.querySelector('#change-char').addEventListener('click', () => pickCharacterPrompt('Elegir personaje', (c) => { state.selected = c.id; save(); renderCalc(); }));
    view.querySelectorAll('[data-prof]').forEach((el) => el.addEventListener('change', () => {
      const key = el.dataset.prof;
      prof[key] = el.dataset.num !== undefined ? +el.value : el.value;
      if (key === 'level' || key === 'weaponLevel') {
        if (!prof.panel) { /* el panel por defecto se recalcula solo */ } else toast('Recuerda actualizar los atributos del panel');
      }
      persist();
      renderCalc();
    }));
    view.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.step;
      prof.talent[k] = Math.max(1, Math.min(15, prof.talent[k] + +b.dataset.d));
      b.parentElement.querySelector('span').textContent = prof.talent[k];
      persist();
      drawResults(char, prof);
    }));
    view.querySelectorAll('[data-toggle]').forEach((el) => el.addEventListener('change', () => {
      prof.toggles[el.dataset.toggle] = el.checked;
      persist();
      drawResults(char, prof);
    }));
    view.querySelectorAll('[data-stat]').forEach((el) => el.addEventListener('input', () => {
      if (!prof.panel) prof.panel = JSON.parse(JSON.stringify(GC.panelOf(char, prof)));
      const val = parseFloat(el.value) || 0;
      const v = el.dataset.pct ? val / 100 : val;
      const [a, b] = el.dataset.stat.split('.');
      if (b) prof.panel[a][b] = v; else prof.panel[a] = v;
      persist();
      drawResults(char, prof);
    }));
    view.querySelectorAll('[data-manual]').forEach((el) => el.addEventListener('input', () => {
      prof.manual[el.dataset.manual] = el.value === '' ? undefined : parseFloat(el.value);
      persist();
      drawResults(char, prof);
    }));
    view.querySelector('#reset-panel').addEventListener('click', () => { prof.panel = null; persist(); renderCalc(); });
    view.querySelector('#typical').addEventListener('click', () => { prof.panel = GC.typicalBuild(char, prof); persist(); renderCalc(); toast('Build típica aplicada: ajústala a tus valores'); });
    view.querySelector('#open-weapons').addEventListener('click', () => weaponPicker(char, prof));
    view.querySelector('#open-set').addEventListener('click', () => setPicker(prof, 'setId'));
    view.querySelector('#open-set2').addEventListener('click', () => setPicker(prof, 'set2Id', true));
    view.querySelector('#enemy-level').addEventListener('input', (e) => { state.enemy.level = +e.target.value || 90; persist(); drawResults(char, prof); });
    view.querySelector('#enemy-res').addEventListener('input', (e) => { state.enemy.res = (parseFloat(e.target.value) || 0) / 100; persist(); drawResults(char, prof); });
    view.querySelector('#reaction').addEventListener('change', (e) => { state.reaction = e.target.value; persist(); drawResults(char, prof); });
    view.querySelector('#infusion').addEventListener('change', (e) => { prof.infusion = e.target.checked; persist(); drawResults(char, prof); });
    const ut = view.querySelector('#use-team');
    if (ut) ut.addEventListener('change', (e) => { state.useTeam = e.target.checked; persist(); drawResults(char, prof); });
  }

  function weaponPicker(char, prof) {
    const list = GD.weapons.filter((w) => w.type === char.weapon).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name, 'es'));
    sheet(`<div class="title">Catálogo: ${esc(char.weapon)}</div>
      <div class="search mb"><input id="wq" placeholder="Buscar arma…" autocomplete="off"></div>
      <div class="wlist" id="wl"></div>`, (el, close) => {
      const draw = (q = '') => {
        el.querySelector('#wl').innerHTML = list.filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase())).map((w) => {
          const s = GC.weaponBase(w, '90');
          return `<div class="witem ${w.id === prof.weaponId ? 'selected' : ''}" data-w="${w.id}">
            <div class="wicon r${w.rarity}">${weaponImg(w)}</div>
            <div class="grow"><b class="small">${esc(w.name)}</b>
              <div class="tiny muted">${stars(w.rarity)} · ATQ ${n0(s.atk)}${w.sub ? ` · ${esc(w.subText)} ${fmtSub(w.sub, s.sub)}` : ''}</div>
              ${GC.WEAPON_EFFECTS[w.en] ? '<span class="badge">calculada</span>' : ''}</div></div>`;
        }).join('');
        el.querySelectorAll('[data-w]').forEach((d) => d.addEventListener('click', () => {
          prof.weaponId = d.dataset.w;
          const nw = GC.weapon(prof.weaponId);
          if (!nw.stats[prof.weaponLevel]) prof.weaponLevel = Object.keys(nw.stats).pop();
          if (prof.refine > nw.refs.length) prof.refine = Math.max(1, nw.refs.length);
          save();
          close();
          renderCalc();
          if (prof.panel) toast('Arma cambiada: actualiza ATQ y subestadística del panel');
        }));
      };
      draw();
      el.querySelector('#wq').addEventListener('input', (e) => draw(e.target.value));
    });
  }

  function setPicker(prof, field, allowNone) {
    const list = GD.artifacts.filter((a) => a.rarity >= 4).sort((a, b) => (GC.ARTIFACT_EFFECTS[b.en] ? 1 : 0) - (GC.ARTIFACT_EFFECTS[a.en] ? 1 : 0) || a.name.localeCompare(b.name, 'es'));
    sheet(`<div class="title">Sets de artefactos</div>
      ${allowNone ? '<button class="gbtn dark sm mb" data-a=""><span class="dot"></span>Sin segundo set (4 piezas)</button>' : ''}
      <div class="wlist">${list.map((a) => `<div class="witem ${prof[field] === a.id ? 'selected' : ''}" data-a="${a.id}">
        <div class="wicon r5">${imgTag(a.icon, '', a.name)}</div>
        <div class="grow"><b class="small">${esc(a.name)}</b> ${GC.ARTIFACT_EFFECTS[a.en] ? '<span class="badge">calculado</span>' : ''}
        <div class="tiny muted">2p: ${esc(a.e2)}</div></div></div>`).join('')}</div>`, (el, close) => {
      el.querySelectorAll('[data-a]').forEach((d) => d.addEventListener('click', () => {
        prof[field] = d.dataset.a || null;
        save();
        close();
        renderCalc();
      }));
    });
  }

  const TALENT_TABS = [['combat1', 'At. Normal'], ['combat2', 'Habilidad'], ['combat3', 'Definitiva']];

  function drawResults(char, prof) {
    const box = view.querySelector('#calc-results');
    if (!box) return;
    const ev = GC.evaluate(char, prof, calcOptions(char));
    const s = ev.stats;
    const tab = state.calcTab;
    const t = ev.talents[tab];
    const rows = (t?.rows || []).filter((r) => r.kind !== 'info');
    const info = (t?.rows || []).filter((r) => r.kind === 'info' && r.text);
    const top = rows.filter((r) => r.kind === 'dmg').sort((a, b) => b.result.avg * b.hits - a.result.avg * a.hits)[0];
    const elKey = GC.ELEMENT_KEYS[char.element];
    const delta = (a, b) => (Math.abs(a - b) > 0.5 ? `<small>+${n0(a - b)}</small>` : '');
    const deltaP = (a, b) => (Math.abs(a - b) > 0.0005 ? `<small>+${pc(a - b)}</small>` : '');

    box.innerHTML = `
      <div class="panel">
        <div class="title">Atributos finales</div>
        <div class="stat-list">
          <div class="stat-row"><span class="k">Vida Máx.</span><span class="v">${n0(s.hp)}${delta(s.hp, ev.panel.hp)}</span></div>
          <div class="stat-row"><span class="k">ATQ</span><span class="v">${n0(s.atk)}${delta(s.atk, ev.panel.atk)}</span></div>
          <div class="stat-row"><span class="k">DEF</span><span class="v">${n0(s.def)}${delta(s.def, ev.panel.def)}</span></div>
          <div class="stat-row"><span class="k">Maestría Elemental</span><span class="v">${n0(s.em)}${delta(s.em, ev.panel.em)}</span></div>
          <div class="stat-row"><span class="k">Prob. CRIT</span><span class="v">${pc(s.cr)}${deltaP(s.cr, ev.panel.cr)}</span></div>
          <div class="stat-row"><span class="k">Daño CRIT</span><span class="v">${pc(s.cd)}${deltaP(s.cd, ev.panel.cd)}</span></div>
          <div class="stat-row"><span class="k">Recarga de Energía</span><span class="v">${pc(s.er)}${deltaP(s.er, ev.panel.er)}</span></div>
          <div class="stat-row"><span class="k">${elIcon(char.element)} Bono de Daño ${char.element}</span><span class="v">${pc((s.dmg[elKey] || 0) + (s.dmg.all || 0) + (s.dmg.elemental || 0))}</span></div>
        </div>
        ${ev.mods.length ? `<details class="fold mt"><summary class="small">Bonos aplicados (${ev.mods.length})</summary><div class="mt">${ev.mods.map((m) => `<div class="row between tiny" style="padding:3px 0;border-bottom:1px dashed rgba(211,188,142,.12)"><span class="muted">${esc(m.source || '')}${m.label ? ` · ${esc(m.label)}` : ''}</span><span class="gold">${modLabel(m)}</span></div>`).join('')}</div></details>` : ''}
      </div>

      <div class="panel">
        <div class="title">Daño calculado</div>
        <div class="seg mb" style="width:100%;display:flex">${TALENT_TABS.map(([k, l]) => `<button style="flex:1" class="${tab === k ? 'active' : ''}" data-ctab="${k}">${l}</button>`).join('')}</div>
        ${t ? `<div class="small gold mb serif">${esc(t.name)}</div>` : ''}
        ${top ? `<div class="highlight mb">
          <div class="tiny muted" style="letter-spacing:.1em">✦ ${esc(top.name).toUpperCase()} ✦</div>
          <div class="big-number">${n0(top.result.crit)}</div>
          <div class="small muted">Golpe crítico · <span style="color:${ELC[top.element]}">${top.element}</span>${top.reaction !== 'none' ? ` · ${GC.HIT_REACTIONS[top.reaction].name}` : ''}</div>
          <div class="grid2 mt">
            <div><div class="tiny muted">No crítico</div><b class="serif">${n0(top.result.nonCrit)}</b></div>
            <div><div class="tiny muted">Media (Prob. ${pc(top.result.detail.cr, 0)})</div><b class="serif gold">${n0(top.result.avg)}</b></div>
          </div>
        </div>` : ''}
        ${rows.length ? `<table class="dmg-table"><thead><tr><th>Golpe</th><th>No crít.</th><th>Crítico</th><th>Media</th></tr></thead><tbody>
          ${rows.map((r) => `<tr class="${r.kind}"><td><span class="el-dot" style="background:${r.kind === 'dmg' ? ELC[r.element] : r.kind === 'heal' ? 'var(--good)' : '#e6c873'}"></span>${esc(r.name)}${r.hits > 1 ? ` <span class="muted">×${r.hits}</span>` : ''}${r.kind === 'heal' ? ' <span class="tiny muted">(curación)</span>' : r.kind === 'shield' ? ' <span class="tiny muted">(escudo)</span>' : ''}</td>
            <td>${r.kind === 'dmg' ? n0(r.result.nonCrit) : ''}</td><td>${r.kind === 'dmg' ? n0(r.result.crit) : ''}</td><td class="avg">${n0(r.result.avg)}</td></tr>`).join('')}
        </tbody></table>` : '<div class="muted small">Este talento no inflige daño directo.</div>'}
        ${info.length ? `<details class="fold mt"><summary class="small">Otros valores del talento</summary><div class="stat-list mt">${info.map((r) => `<div class="stat-row"><span class="k small">${esc(r.name)}</span><span class="v small">${esc(r.text)}</span></div>`).join('')}</div></details>` : ''}
        ${t ? `<details class="fold mt"><summary class="small">Descripción</summary><div class="desc mt">${esc(t.desc)}</div></details>` : ''}
      </div>

      ${ev.transformative.length ? `<div class="panel">
        <div class="title">Reacciones transformativas</div>
        <div class="subtitle">No pueden ser críticas e ignoran la DEF. Dependen del nivel y la Maestría.</div>
        <div class="stat-list">${ev.transformative.map((x) => `<div class="stat-row"><span class="k"><span class="el-dot" style="background:${ELC[x.element]}"></span>${esc(x.name)}${x.key === 'swirl' ? ` (${x.element})` : ''}</span><span class="v">${n0(x.value)}</span></div>`).join('')}</div>
      </div>` : ''}`;

    box.querySelectorAll('[data-ctab]').forEach((b) => b.addEventListener('click', () => { state.calcTab = b.dataset.ctab; save(); drawResults(char, prof); }));
  }

  const MOD_NAMES = {
    atkPct: 'ATQ', atkFlat: 'ATQ', hpPct: 'Vida', hpFlat: 'Vida', defPct: 'DEF', defFlat: 'DEF', em: 'Maestría', cr: 'Prob. CRIT', cd: 'Daño CRIT',
    er: 'Recarga', heal: 'Bono Curación', shield: 'Protección Escudo', defRed: 'Reducción DEF', defIgn: 'Ignora DEF',
  };
  const CAT_NAMES = { normal: 'At. Normal', charged: 'At. Cargado', plunge: 'At. Descendente', skill: 'Habilidad', burst: 'Definitiva', all: 'todo', elemental: 'elemental', phys: 'Físico' };
  function modLabel(m) {
    const [k, sub] = m.key.split(':');
    const subName = sub ? (CAT_NAMES[sub] || sub.charAt(0).toUpperCase() + sub.slice(1)) : '';
    if (k === 'rowAdd') return `+${pc(m.value)} ATQ al multiplicador`;
    if (['atkFlat', 'hpFlat', 'defFlat', 'em'].includes(k)) return `+${n0(m.value)} ${MOD_NAMES[k]}`;
    if (k === 'flat') return `+${n0(m.value)} daño plano (${subName})`;
    if (k === 'dmg') return `+${pc(m.value)} Daño ${subName}`;
    if (k === 'res') return `−${pc(m.value)} RES ${subName}`;
    if (k === 'rx') return `+${pc(m.value)} ${subName}`;
    if (k === 'mult') return `×${(1 + m.value).toFixed(2)} ${subName}`;
    if ((k === 'cr' || k === 'cd') && sub) return `+${pc(m.value)} ${MOD_NAMES[k]} (${subName})`;
    return `${m.value >= 0 ? '+' : ''}${pc(m.value)} ${MOD_NAMES[k] || k}`;
  }

  /* ===================== EQUIPOS ===================== */
  function renderTeam() {
    const ids = state.team.ids;
    const chars = ids.map((id) => GC.char(id)).filter(Boolean);
    const slots = [0, 1, 2, 3].map((i) => {
      const c = chars[i];
      if (!c) return `<div class="slot" data-add><span style="font-size:26px">+</span><span class="tiny">Añadir</span></div>`;
      return `<div class="slot filled" data-open="${c.id}"><div class="art avatar r${c.rarity}" style="border-radius:0;width:100%">${charImg(c)}</div><div class="name">${esc(c.name)}</div><button class="rm" data-rm="${c.id}">✕</button></div>`;
    }).join('');

    let body = '';
    if (chars.length) {
      const res = chars.length >= 4 ? GC.resonances(chars.map((c) => c.element)) : [];
      const results = chars.map((c) => {
        const prof = profile(c);
        const solo = GC.evaluate(c, prof, { useTeam: false, enemy: state.enemy, reaction: 'none', profiles: state.profiles });
        const team = GC.evaluate(c, prof, { useTeam: true, team: ids, toggles: state.teamToggles, enemy: state.enemy, reaction: 'none', profiles: state.profiles });
        const best = (ev) => {
          let b = null;
          for (const k of ['combat1', 'combat2', 'combat3']) (ev.talents[k]?.rows || []).forEach((r) => { if (r.kind === 'dmg' && r.category !== 'plunge' && (!b || r.result.avg * r.hits > b.v)) b = { r, k, v: r.result.avg * r.hits }; });
          return b;
        };
        const bt = best(team);
        const bs = bt && solo.talents[bt.k].rows.find((r) => r.name === bt.r.name);
        return { c, team, bt, gain: bt && bs ? bt.v / (bs.result.avg * bs.hits) - 1 : 0 };
      });
      const total = results.reduce((a, r) => a + (r.bt?.v || 0), 0) || 1;
      const allBuffs = GC.teamBuffs(chars[0], ids, state.profiles);
      const seen = new Set();
      const buffList = [];
      chars.forEach((c) => GC.teamBuffs(c, ids, state.profiles).forEach((b) => { if (!seen.has(b.id)) { seen.add(b.id); buffList.push(b); } }));
      void allBuffs;

      body = `
        ${res.length ? `<div class="panel"><div class="title">Resonancia elemental</div>${res.map((r) => `<div class="row" style="padding:4px 0">${elIcon(r.id.replace('res-', '').replace(/^./, (x) => x.toUpperCase()))}<span class="small">${esc(r.label)}</span></div>`).join('')}</div>` : ''}
        <div class="panel">
          <div class="title">Bonos del equipo <span class="right">activa o desactiva</span></div>
          ${buffList.length ? buffList.map((b) => `<div class="buff">
            ${b.from ? `<div class="avatar r${b.from.rarity}" style="width:34px;height:34px">${charImg(b.from)}</div>` : `<div style="width:34px;height:34px;display:grid;place-items:center">✦</div>`}
            <div class="grow small">${esc(b.label)}${b.from ? `<div class="tiny muted">${esc(b.from.name)}</div>` : ''}</div>
            <span class="switch"><input type="checkbox" data-buff="${b.id}" ${state.teamToggles[b.id] !== false ? 'checked' : ''}><span></span></span></div>`).join('') : '<div class="muted small">Ningún miembro aporta bonos calculables todavía.</div>'}
          <div class="tiny muted mt">Los bonos que dependen de atributos (p. ej. el ATQ de Bennett o la Maestría de Kazuha) usan los atributos que introdujiste para cada personaje en la calculadora.</div>
        </div>
        <div class="panel">
          <div class="title">Golpe más fuerte de cada miembro</div>
          <div class="bar mb">${results.map((r) => `<div style="width:${((r.bt?.v || 0) / total) * 100}%;background:${ELC[r.c.element]}"></div>`).join('')}</div>
          ${results.map((r) => `<div class="buff" data-open="${r.c.id}" style="cursor:pointer">
            <div class="avatar r${r.c.rarity}" style="width:44px;height:44px">${charImg(r.c)}</div>
            <div class="grow"><b class="small">${esc(r.c.name)}</b><div class="tiny muted ellipsis">${r.bt ? esc(r.bt.r.name) : 'Sin daño directo'}</div></div>
            <div style="text-align:right">${r.bt ? `<div class="serif gold">${n0(r.bt.v)}</div><div class="tiny ${r.gain > 0.0005 ? 'gain' : 'muted'}">${r.gain > 0.0005 ? `+${pc(r.gain)} por el equipo` : 'sin bonos'}</div>` : ''}</div>
          </div>`).join('')}
          <div class="tiny muted mt">Daño medio con los bonos del equipo activos. Toca un miembro para ver su cálculo completo.</div>
        </div>`;
    }

    view.innerHTML = `
      <div class="panel">
        <div class="row between mb"><input class="input serif" id="team-name" value="${esc(state.team.name)}" style="font-size:16px;color:var(--gold-hi);background:none;border:none;padding:0"><span class="tag cream">${chars.length}/4</span></div>
        <div class="team-slots">${slots}</div>
      </div>
      ${chars.length ? body : '<div class="panel empty"><div class="serif">Forma tu equipo</div>Elige hasta 4 personajes para calcular cómo se potencian entre sí: resonancias elementales, buffs de apoyo, armas y sets de equipo.</div>'}`;

    view.querySelector('#team-name').addEventListener('change', (e) => { state.team.name = e.target.value || 'Equipo 1'; save(); });
    view.querySelectorAll('[data-add]').forEach((el) => el.addEventListener('click', () => pickCharacterPrompt('Añadir al equipo', (c) => {
      if (!state.team.ids.includes(c.id) && state.team.ids.length < 4) state.team.ids.push(c.id);
      save();
      renderTeam();
    })));
    view.querySelectorAll('[data-rm]').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      state.team.ids = state.team.ids.filter((x) => x !== el.dataset.rm);
      save();
      renderTeam();
    }));
    view.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => { state.selected = el.dataset.open; go('calculadora'); }));
    view.querySelectorAll('[data-buff]').forEach((el) => el.addEventListener('change', () => { state.teamToggles[el.dataset.buff] = el.checked; save(); renderTeam(); }));
  }

  /* ===================== ARMAS ===================== */
  function renderWeapons() {
    const f = state.wfilters;
    view.innerHTML = `
      <div class="search mb">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input id="wq" placeholder="Buscar arma…" value="${esc(f.q)}" autocomplete="off">
      </div>
      <div class="panel" style="padding:10px 12px">
        <div class="filter-label">Tipo</div>
        <div class="chips"><button class="chip ${!f.type ? 'active' : ''}" data-wt="">Todas</button>${WEAPON_TYPES.map((t) => `<button class="chip ${f.type === t ? 'active' : ''}" data-wt="${t}">${t}</button>`).join('')}</div>
        <div class="filter-label">Rareza</div>
        <div class="chips"><button class="chip ${!f.rarity ? 'active' : ''}" data-wr="">Todas</button>${[5, 4, 3, 2, 1].map((r) => `<button class="chip ${f.rarity === r ? 'active' : ''}" data-wr="${r}">${r}★</button>`).join('')}</div>
      </div>
      <div class="title">Catálogo de armas <span class="right" id="wcount"></span></div>
      <div class="wlist" id="wlist"></div>`;
    const draw = () => {
      const q = f.q.toLowerCase();
      const list = GD.weapons.filter((w) => (!q || w.name.toLowerCase().includes(q) || w.en.toLowerCase().includes(q)) && (!f.type || w.type === f.type) && (!f.rarity || w.rarity === f.rarity))
        .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name, 'es'));
      view.querySelector('#wcount').textContent = `${list.length} armas`;
      view.querySelector('#wlist').innerHTML = list.map((w) => {
        const top = w.stats['90'] ? '90' : Object.keys(w.stats).pop();
        const s = GC.weaponBase(w, top);
        const open = f.expanded === w.id;
        return `<div><div class="witem ${open ? 'selected' : ''}" data-wid="${w.id}">
          <div class="wicon r${w.rarity}">${weaponImg(w)}</div>
          <div class="grow"><b class="small">${esc(w.name)}</b>
            <div class="tiny muted">${esc(w.type)} · <span style="color:#ffd75a">${stars(w.rarity)}</span></div>
            <div class="tiny">ATQ ${n0(s.atk)} (Nv. ${top})${w.sub ? ` · ${esc(w.subText)} ${fmtSub(w.sub, s.sub)}` : ''}</div>
          </div></div>
          ${open ? weaponDetail(w) : ''}</div>`;
      }).join('') || '<div class="empty">Sin resultados</div>';
      view.querySelectorAll('[data-wid]').forEach((el) => el.addEventListener('click', () => {
        f.expanded = f.expanded === el.dataset.wid ? null : el.dataset.wid;
        save();
        draw();
      }));
      view.querySelectorAll('[data-wref]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); f.refine = +el.dataset.wref; save(); draw(); }));
    };
    draw();
    view.querySelector('#wq').addEventListener('input', (e) => { f.q = e.target.value; save(); draw(); });
    view.querySelectorAll('[data-wt]').forEach((b) => b.addEventListener('click', () => { f.type = b.dataset.wt || null; save(); renderWeapons(); }));
    view.querySelectorAll('[data-wr]').forEach((b) => b.addEventListener('click', () => { f.rarity = b.dataset.wr ? +b.dataset.wr : null; save(); renderWeapons(); }));
  }

  function weaponDetail(w) {
    const refine = Math.min(state.wfilters.refine, Math.max(1, w.refs.length));
    const levels = Object.keys(w.stats);
    return `<div class="panel" style="margin:8px 0 4px">
      <div class="stat-list">${levels.filter((l) => !l.endsWith('+') || l === '80+').map((l) => {
        const s = GC.weaponBase(w, l);
        return `<div class="stat-row"><span class="k small">Nivel ${l}</span><span class="v small">ATQ ${n0(s.atk)}${w.sub ? ` · ${fmtSub(w.sub, s.sub)}` : ''}</span></div>`;
      }).join('')}</div>
      ${w.refs.length ? `<div class="row between mt"><b class="gold small">${esc(w.effectName)}</b><div class="seg">${w.refs.map((_, i) => `<button class="${refine === i + 1 ? 'active' : ''}" data-wref="${i + 1}">R${i + 1}</button>`).join('')}</div></div>
      <div class="wpassive">${weaponPassive(w, refine)}</div>` : '<div class="muted small mt">Sin efecto pasivo.</div>'}
      <div class="tiny mt">${GC.WEAPON_EFFECTS[w.en] ? '<span class="badge">La calculadora aplica esta pasiva</span>' : '<span class="badge warn">Pasiva sólo informativa en el cálculo</span>'}</div>
      ${w.version ? `<div class="tiny muted mt">Disponible desde la versión ${esc(w.version)}</div>` : ''}
    </div>`;
  }

  /* ===================== CONSEJERO ===================== */
  function renderAdvisor() {
    const char = state.selected && GC.char(state.selected);
    if (!char) {
      view.innerHTML = `<div class="panel empty"><div class="serif">Consejero de Teyvat</div><p>Elige un personaje y configura su build en la calculadora para recibir recomendaciones.</p>
        <button class="gbtn" id="pick"><span class="dot"></span>Elegir personaje</button></div>`;
      view.querySelector('#pick').addEventListener('click', () => pickCharacterPrompt('Elegir personaje', (c) => { state.selected = c.id; save(); renderAdvisor(); }));
      return;
    }
    const prof = profile(char);
    const opts = calcOptions(char);
    const ev = GC.evaluate(char, prof, opts);
    let target = state.advisorTarget && state.advisorTarget.char === char.id ? state.advisorTarget : null;
    if (!target || !ev.talents[target.talentKey]?.rows[target.rowIndex]?.result) {
      target = { ...GC.defaultTarget(char, prof, opts), char: char.id };
    }
    const options = [];
    TALENT_TABS.forEach(([k, l]) => (ev.talents[k]?.rows || []).forEach((r, i) => {
      if (r.kind !== 'info') options.push({ k, i, label: `${l} · ${r.name}${r.kind === 'heal' ? ' (curación)' : r.kind === 'shield' ? ' (escudo)' : ''}` });
    }));

    view.innerHTML = `
      <div class="panel">
        <div class="hero">
          <div class="avatar r${char.rarity}" style="width:60px;height:60px">${charImg(char)}</div>
          <div class="grow"><div class="row between"><h2 class="ellipsis" style="font-size:18px">${esc(char.name)}</h2><button class="gbtn dark sm" id="change"><span class="dot"></span>Cambiar</button></div>
          <div class="tiny muted">${prof.panel ? 'Usando los atributos que introdujiste' : 'Sin atributos introducidos: se usa la base sin artefactos'}</div></div>
        </div>
        <div class="field mt"><label>¿Qué quieres mejorar?</label>
          <select class="input" id="target">${options.map((o) => `<option value="${o.k}|${o.i}" ${o.k === target.talentKey && o.i === target.rowIndex ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
        </div>
      </div>
      <div id="adv-out"><div class="panel center muted">Analizando tu build…</div></div>
      ${oraclePanel(char)}`;

    view.querySelector('#change').addEventListener('click', () => pickCharacterPrompt('Elegir personaje', (c) => { state.selected = c.id; state.advisorTarget = null; save(); renderAdvisor(); }));
    view.querySelector('#target').addEventListener('change', (e) => {
      const [k, i] = e.target.value.split('|');
      state.advisorTarget = { char: char.id, talentKey: k, rowIndex: +i };
      save();
      renderAdvisor();
    });
    bindOracle(char, prof, opts, target);
    setTimeout(() => drawAdvice(char, prof, opts, target), 30);
  }

  function drawAdvice(char, prof, opts, target) {
    const out = view.querySelector('#adv-out');
    if (!out) return;
    const a = GC.advise(char, prof, opts, target);
    const kindWord = a.row?.kind === 'heal' ? 'curación' : a.row?.kind === 'shield' ? 'escudo' : 'daño medio';
    const curW = a.weapons.findIndex((x) => x.w.id === prof.weaponId);
    const curS = a.sets.findIndex((x) => x.a.id === prof.setId);
    const sign = (g) => `<span class="${g >= 0 ? 'gain' : 'loss'}">${g >= 0 ? '+' : ''}${g.toFixed(1)}%</span>`;
    const SLOT = { sands: 'Arenas', goblet: 'Cáliz', circlet: 'Tiara' };
    out.innerHTML = `
      <div class="panel">
        <div class="title">Diagnóstico</div>
        <div class="highlight mb"><div class="tiny muted">${esc(a.row?.name || '')} · ${kindWord} actual</div><div class="big-number" style="font-size:28px">${n0(a.baseValue)}</div></div>
        ${a.row?.kind === 'dmg' ? `<div class="advice"><h4>Equilibrio crítico</h4><p>${esc(a.critMsg)}</p></div>` : ''}
        <div class="advice"><h4>Recarga de Energía</h4><p>${esc(a.erMsg)}</p></div>
        ${a.tips.map((t) => `<div class="advice"><h4>Consejo</h4><p>${esc(t)}</p></div>`).join('')}
      </div>
      <div class="panel">
        <div class="title">Prioridad de subestadísticas</div>
        <div class="subtitle">Ganancia por una tirada media de artefacto 5★.</div>
        ${a.subs.map((s, i) => `<div class="rank"><span class="pos">${i + 1}</span><span class="grow small">${esc(s.label)}</span>${sign(s.gain)}</div>`).join('')}
      </div>
      <div class="panel">
        <div class="title">Estadística principal recomendada</div>
        ${Object.entries(a.mains).map(([slot, list]) => `<div class="row between" style="padding:6px 0;border-bottom:1px dashed rgba(211,188,142,.14)"><span class="small muted">${SLOT[slot]}</span><span class="small"><b class="gold">${esc(list[0].label)}</b> ${sign(list[0].gain)} <span class="tiny muted">· 2.º ${esc(list[1].label)}</span></span></div>`).join('')}
        <div class="tiny muted mt">Ganancia si añadieras esa estadística principal completa sobre tu build actual.</div>
      </div>
      <div class="panel">
        <div class="title">Mejores armas para este golpe</div>
        <div class="subtitle">5★ a R1 y 4★/3★ a R5, nivel 90. Tu arma: puesto ${curW + 1} de ${a.weapons.length}.</div>
        ${a.weapons.slice(0, 8).map((x, i) => `<div class="rank"><span class="pos">${i + 1}</span><div class="wicon r${x.w.rarity}" style="width:34px;height:34px">${weaponImg(x.w)}</div><span class="grow small">${esc(x.w.name)} <span class="tiny muted">R${x.refine}</span>${x.modeled ? '' : ' <span class="tiny muted">(sin pasiva)</span>'}</span>${sign(x.gain)}</div>`).join('')}
      </div>
      <div class="panel">
        <div class="title">Mejores sets de artefactos</div>
        <div class="subtitle">Comparando bonos de 2 y 4 piezas. ${curS >= 0 ? `Tu set: puesto ${curS + 1}.` : ''}</div>
        ${a.sets.slice(0, 6).map((x, i) => `<div class="rank"><span class="pos">${i + 1}</span><div class="wicon r5" style="width:34px;height:34px">${imgTag(x.a.icon, '', x.a.name)}</div><span class="grow small">${esc(x.a.name)}</span>${sign(x.gain)}</div>`).join('')}
        <div class="tiny muted mt">Las condiciones de cada set se suponen cumplidas (p. ej. enemigo congelado para Exploradora del Viento Helado).</div>
      </div>`;
  }

  function oraclePanel(char) {
    return `<div class="panel">
      <div class="title">Oráculo IA</div>
      <div class="subtitle">Pregunta en lenguaje natural a una IA experta en Genshin. Recibe tu build y los cálculos de la app.</div>
      <div class="field mb"><label>Clave de la API de Claude (se guarda sólo en este dispositivo)</label><input class="input" type="password" id="api-key" placeholder="sk-ant-…" value="${esc(state.apiKey)}" autocomplete="off"></div>
      <div class="chips mb">
        ${['¿Cómo subo el daño de su Definitiva?', '¿Qué equipo le recomiendas?', '¿Qué arma 4★ accesible le va mejor?', 'Explícame su rotación ideal', '¿Cómo mejoro su supervivencia?'].map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}
      </div>
      <textarea class="input" id="oracle-q" placeholder="Ej.: Quiero que ${esc(char.name)} haga más daño con su habilidad elemental, ¿qué cambio primero?"></textarea>
      <button class="gbtn block mt" id="ask"><span class="dot"></span>Consultar al Oráculo</button>
      <div id="oracle-out" class="oracle-out mt"></div>
    </div>`;
  }

  function bindOracle(char, prof, opts, target) {
    const key = view.querySelector('#api-key');
    key.addEventListener('change', () => { state.apiKey = key.value.trim(); save(); });
    view.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { view.querySelector('#oracle-q').value = b.dataset.q; }));
    view.querySelector('#ask').addEventListener('click', async () => {
      const out = view.querySelector('#oracle-out');
      const q = view.querySelector('#oracle-q').value.trim();
      state.apiKey = key.value.trim();
      save();
      if (!state.apiKey) { out.innerHTML = '<span class="loss">Introduce tu clave de la API de Claude (console.anthropic.com).</span>'; return; }
      if (!q) { out.innerHTML = '<span class="muted">Escribe una pregunta.</span>'; return; }
      const btn = view.querySelector('#ask');
      btn.disabled = true;
      btn.lastChild.textContent = 'Consultando…';
      out.innerHTML = '<span class="muted">El Oráculo está meditando…</span>';
      let text = '';
      try {
        const final = await GC.askOracle({
          apiKey: state.apiKey, question: q, context: oracleContext(char, prof, opts, target),
          onText: (t) => { text += t; out.innerHTML = mdLite(text); },
        });
        out.innerHTML = mdLite(final || text);
      } catch (err) {
        out.innerHTML = `<span class="loss">No se pudo consultar: ${esc(err.message || err)}</span>`;
      } finally {
        btn.disabled = false;
        btn.lastChild.textContent = 'Consultar al Oráculo';
      }
    });
  }

  function oracleContext(char, prof, opts, target) {
    const ev = GC.evaluate(char, prof, opts);
    const w = GC.weapon(prof.weaponId);
    const s = ev.stats;
    const hits = {};
    TALENT_TABS.forEach(([k, l]) => { hits[l] = (ev.talents[k]?.rows || []).filter((r) => r.result).map((r) => ({ golpe: r.name, tipo: r.kind, elemento: r.element, media: Math.round(r.result.avg), critico: Math.round(r.result.crit) })); });
    const a = GC.advise(char, prof, opts, target);
    return {
      version_datos: GD.source,
      personaje: { nombre: char.name, elemento: char.element, arma_tipo: char.weapon, nivel: prof.level, constelacion: `C${prof.cons}`, talentos: prof.talent, roles: char.roles },
      arma: w ? { nombre: w.name, refinamiento: `R${prof.refine}`, nivel: prof.weaponLevel, pasiva: w.effect.replace(/\{(\d+)\}/g, (_, i) => w.refs[prof.refine - 1]?.[i] ?? '?') } : null,
      artefactos: { set: GC.artifact(prof.setId)?.name || null, set2: GC.artifact(prof.set2Id)?.name || null },
      atributos_finales: { vida: Math.round(s.hp), atq: Math.round(s.atk), def: Math.round(s.def), maestria: Math.round(s.em), prob_crit: pc(s.cr), dano_crit: pc(s.cd), recarga: pc(s.er) },
      equipo: opts.useTeam ? state.team.ids.map((id) => GC.char(id)?.name) : [char.name],
      bonos_aplicados: ev.mods.map((m) => `${m.source}: ${modLabel(m)}`),
      enemigo: state.enemy, reaccion: GC.HIT_REACTIONS[state.reaction].name,
      danos: hits,
      analisis_local: {
        objetivo: a.row?.name, valor: Math.round(a.baseValue),
        subestadisticas: a.subs.slice(0, 5).map((x) => `${x.label} ${x.gain.toFixed(1)}%`),
        mejores_armas: a.weapons.slice(0, 5).map((x) => `${x.w.name} R${x.refine} ${x.gain.toFixed(1)}%`),
        mejores_sets: a.sets.slice(0, 4).map((x) => `${x.a.name} ${x.gain.toFixed(1)}%`),
      },
    };
  }

  function mdLite(text) {
    return esc(text)
      .replace(/^### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^## (.*)$/gm, '<h3>$1</h3>')
      .replace(/^# (.*)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-*] /gm, '• ');
  }

  /* ===================== Acerca de ===================== */
  function aboutSheet() {
    sheet(`<div class="title">Acerca de Crónica de Teyvat</div>
      <div class="desc">
Calculadora no oficial para Genshin Impact.

<b class="gold">Datos del juego</b>: ${GD.characters.length} personajes, ${GD.weapons.length} armas y ${GD.artifacts.length} sets de artefactos con estadísticas base por nivel, multiplicadores de talentos (niveles 1–15) y refinamientos, extraídos del cliente del juego mediante ${esc(GD.source)} (generado ${esc(GD.generated)}).

<b class="gold">Fórmula de daño</b>: (multiplicador × atributo + daño plano) × (1 + bono de daño) × crítico × DEF × RES × reacción amplificadora; las reacciones aditivas y transformativas usan el multiplicador de nivel oficial.

<b class="gold">Qué se calcula automáticamente</b>: pasivas de ${Object.keys(GC.WEAPON_EFFECTS).length} armas populares, ${Object.keys(GC.ARTIFACT_EFFECTS).length} sets, buffs de apoyo clave (Bennett, Kazuha, Furina, Raiden, Shenhe, Yun Jin, Nahida, Faruzan, Zhongli…) y resonancias. Las constelaciones y efectos no modelados se añaden con «Bonos manuales». Las reacciones lunares (Nod-Krai) no se calculan todavía.

Genshin Impact es una marca de HoYoverse/miHoYo. Las imágenes de personajes y armas son los iconos oficiales del juego cargados desde sus servidores. Esta app no está afiliada a HoYoverse.
      </div>`);
  }

  /* ===================== Arranque ===================== */
  go(state.tab || 'personajes');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
