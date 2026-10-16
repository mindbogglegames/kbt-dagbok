'use strict';

// ---------- Fields ----------

const FIELDS = [
  {
    id: 'datum', label: 'Datum', type: 'date', errorText: 'Välj ett datum',
    help: 'När inträffade situationen? Dagens datum är ifyllt – ändra det om det hände en annan dag.'
  },
  {
    id: 'situation', label: 'Situation', minHeight: '76px', errorText: 'Fyll i fältet',
    help: 'Här beskriver du kort situationen. Var var du? Vilka var där? Vad gjorde du?'
  },
  {
    id: 'tanke', label: 'Tanke', minHeight: '128px', errorText: 'Fyll i fältet',
    help: 'Här beskrivs vad du tänkte när händelsen inträffade. Vilka tankar for igenom ditt huvud? De automatiska tankarna kan förekomma i form av både ord, bilder, minnen eller förutsägelser om vad som kan hända.'
  },
  {
    id: 'kansla', label: 'Känsla och kropp', minHeight: '128px', errorText: 'Fyll i fältet',
    help: 'Vilka känslor upplevde du? Känslor kan i allmänhet beskrivas med ett ord, t ex generad, förödmjukad, ledsen, arg. Om du beskriver dina känslor med en mening kan det vara så att du istället skrivit ned en tanke. Lägg även till eventuella kroppsliga symtom, t ex hjärtklappning, rodnad.'
  },
  {
    id: 'hantering', label: 'Tankehantering', minHeight: '128px', errorText: 'Fyll i fältet',
    help: 'Använde du någon tankestrategi, i så fall vilken? Hanterade du tanken på annat sätt? Flydde du situationen? Tog du till ett säkerhetsbeteende? Agerade du på det sätt du ville, trots tanken? Observera att du kan registrera situationer oavsett om du hanterat tanken på ett hjälpsamt sätt eller inte. Det går att lära sig av alla situationer!'
  },
  {
    id: 'utvardering', label: 'Utvärdering', minHeight: '128px', errorText: 'Fyll i fältet',
    help: 'Vad hände? Var det sätt du hanterade tanken på till nytta för dig? Vad ledde det till i stunden? Vad leder det till på sikt?'
  }
];

const FIELD_IDS = FIELDS.map((f) => f.id);

// ---------- Storage ----------
// Entries live in localStorage under one key, tagged with a schema version.
// Updating the app's files never touches this; if the format changes later,
// migrate() converts old data on load instead of discarding it.

const STORAGE_KEY = 'kbt-dagbok';
const DRAFT_PREFIX = 'kbt-dagbok-utkast:';
const LAST_EXPORT_KEY = 'kbt-dagbok-senaste-export';
const SCHEMA_VERSION = 1;

let entries = [];
let storeError = null;

function migrate(data) {
  if (Array.isArray(data)) data = { version: 1, entries: data };
  if (!data || !Array.isArray(data.entries)) throw new Error('Okänt format');
  if (data.version > SCHEMA_VERSION) throw new Error('Sparad med en nyare version av appen');
  return data.entries;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw === null ? [] : migrate(JSON.parse(raw));
    storeError = null;
  } catch (err) {
    // Never overwrite data we could not read.
    entries = [];
    storeError = err.message || String(err);
  }
}

function persistEntries() {
  if (storeError) {
    alert('Appen kunde inte läsa dina sparade registreringar och sparar därför inget nytt, för att inte skriva över dem.');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, entries }));
    return true;
  } catch (err) {
    alert('Det gick inte att spara: ' + (err.message || err));
    return false;
  }
}

function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

function readDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify({ values, savedAt: new Date().toISOString() }));
  } catch {
    // A failed draft save is not worth interrupting the user for.
  }
}

function removeDraft(key) {
  localStorage.removeItem(key);
}

function findEntry(id) {
  return entries.find((e) => e.id === id) || null;
}

function sortedEntries() {
  return entries.slice().sort((a, b) =>
    b.datum.localeCompare(a.datum) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ---------- Dates ----------

const WEEKDAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
const WEEKDAYS_SHORT = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const MONTHS_SHORT = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];

const pad = (n) => String(n).padStart(2, '0');
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function longDate(iso) {
  const d = parseISODate(iso);
  return capitalize(`${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
}

function shortDate(date) {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}${sameYear ? '' : ' ' + date.getFullYear()}`;
}

function timestampText(entry) {
  const created = new Date(entry.createdAt);
  let text = `Skapad ${shortDate(created)} kl. ${pad(created.getHours())}:${pad(created.getMinutes())}`;
  if (entry.updatedAt && new Date(entry.updatedAt) - created > 60 * 1000) {
    text += ` · ändrad ${shortDate(new Date(entry.updatedAt))}`;
  }
  return text;
}

// ---------- Helpers ----------

const app = document.getElementById('app');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setThemeColor(color) {
  document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

const svg = (body, size = 20, color = 'currentColor', width = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  back: svg('<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>', 24),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>', 20, 'currentColor', 2.25),
  chevron: svg('<path d="M9 6l6 6-6 6"/>', 20, '#8a91a1'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', 16),
  archive: svg('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>', 20, '#23436e'),
  download: svg('<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>', 18),
  upload: svg('<path d="M12 20V9"/><path d="M7 14l5-5 5 5"/><path d="M5 4h14"/>', 18),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>', 20),
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5v.5"/>', 18),
  info: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">'
    + '<circle class="ring" cx="14" cy="14" r="12.5" stroke-width="1.5"/>'
    + '<circle class="glyph-dot" cx="14" cy="8.8" r="1.7"/>'
    + '<path class="glyph" d="M12 12.6h2.4v7.6M11.6 20.2h5" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  notebook: '<svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="#23436e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="20" y="12" width="50" height="68" rx="6"/><path d="M30 28h30M30 40h30M30 52h18"/>'
    + '<path d="M58 76l20-20 7 7-20 20h-7z"/><path d="M73 61l7 7"/></svg>'
};

// ---------- Routing ----------
// Hash routes: #/ (list), #/ny, #/visa/<id>, #/redigera/<id>.
// navStack mirrors browser history so "Spara" and the back arrow can use
// history.back() and keep Android's back button behaving naturally.

const navStack = [];
const scrollPositions = {};
let replacing = false;

function currentRoute() {
  return location.hash || '#/';
}

function onRouteChange() {
  const route = currentRoute();
  const previous = navStack[navStack.length - 1];
  if (previous) scrollPositions[previous] = window.scrollY;

  let wentBack = false;
  if (replacing) {
    navStack[navStack.length - 1] = route;
    replacing = false;
  } else if (navStack.length >= 2 && navStack[navStack.length - 2] === route) {
    navStack.pop();
    wentBack = true;
  } else {
    navStack.push(route);
  }

  render();
  window.scrollTo(0, wentBack ? (scrollPositions[route] || 0) : 0);
}

function goBack(target) {
  if (navStack.length >= 2 && navStack[navStack.length - 2] === target) {
    history.back();
  } else if (currentRoute() === target) {
    render();
  } else {
    replacing = true;
    location.replace(target);
  }
}

function render() {
  const route = currentRoute();
  let match;
  if (route === '#/ny') return renderForm(null);
  if ((match = route.match(/^#\/redigera\/(.+)$/))) return renderForm(decodeURIComponent(match[1]));
  if ((match = route.match(/^#\/visa\/(.+)$/))) return renderView(decodeURIComponent(match[1]));
  return renderHome();
}

// ---------- Home ----------

function storeErrorHtml() {
  if (!storeError) return '';
  return `<div class="notice notice--error" role="alert"><p>Dina sparade registreringar kunde inte läsas (${esc(storeError)}). Inget har skrivits över, och appen sparar inget nytt förrän det är löst.</p></div>`;
}

function renderHome() {
  setThemeColor('#f5f6f9');
  const list = sortedEntries();
  if (!list.length) return renderEmpty();

  const months = [];
  for (const entry of list) {
    const d = parseISODate(entry.datum);
    const name = `${capitalize(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
    let group = months[months.length - 1];
    if (!group || group.name !== name) months.push(group = { name, entries: [] });
    group.entries.push(entry);
  }

  app.innerHTML = `
    <div class="screen screen--page">
      <header class="home-header">
        <div class="overline">Social fobi · KBT</div>
        <h1 class="home-title">Mina situationer</h1>
        <div class="meta">${ICONS.lock}<span>${list.length} ${list.length === 1 ? 'registrering' : 'registreringar'} · sparas bara på telefonen</span></div>
      </header>
      ${storeErrorHtml()}
      <main class="list">
        ${months.map((m) => `
          <section class="month">
            <h2>${esc(m.name)}</h2>
            ${m.entries.map(cardHtml).join('')}
          </section>`).join('')}
        <section class="backup">
          <div class="backup-head">${ICONS.archive}<h2>Säkerhetskopia</h2></div>
          <p id="backup-text">${esc(lastExportText())}</p>
          <div class="backup-actions">
            <button type="button" class="btn btn-secondary btn-small" data-action="export">${ICONS.download}Exportera</button>
            <button type="button" class="btn btn-secondary btn-small" data-action="import">${ICONS.upload}Importera</button>
          </div>
        </section>
      </main>
      <div class="bottombar">
        <a class="btn btn-primary" href="#/ny">${ICONS.plus}Ny registrering</a>
      </div>
    </div>`;
}

function cardHtml(entry) {
  const d = parseISODate(entry.datum);
  const feeling = entry.kansla.split(/\n+/).map((s) => s.trim()).filter(Boolean).join(' · ');
  return `
    <a class="card" href="#/visa/${encodeURIComponent(entry.id)}">
      <div class="card-date">
        <span class="card-day">${d.getDate()}</span>
        <span class="card-weekday">${WEEKDAYS_SHORT[d.getDay()]}</span>
      </div>
      <div class="card-body">
        <span class="card-situation">${esc(entry.situation)}</span>
        <span class="card-feeling">${esc(feeling)}</span>
      </div>
      ${ICONS.chevron}
    </a>`;
}

function renderEmpty() {
  app.innerHTML = `
    <div class="screen screen--page">
      <header class="home-header">
        <div class="overline">Social fobi · KBT</div>
        <h1 class="home-title">Mina situationer</h1>
      </header>
      ${storeErrorHtml()}
      <main class="empty">
        ${ICONS.notebook}
        <h2>Inga registreringar än</h2>
        <p>Registrera sociala situationer som väckte obehag. Det går att lära sig av alla situationer – även när det inte gick som du ville.</p>
        <div class="meta">${ICONS.lock}<span>Allt du skriver sparas bara på den här telefonen.</span></div>
      </main>
      <div class="empty-import">
        <button type="button" class="btn-text" data-action="import">${ICONS.upload}Har du en säkerhetskopia? Importera</button>
      </div>
      <div class="bottombar">
        <a class="btn btn-primary" href="#/ny">${ICONS.plus}Ny registrering</a>
      </div>
    </div>`;
}

// ---------- Backup ----------

function lastExportText() {
  const last = localStorage.getItem(LAST_EXPORT_KEY);
  if (!last) return 'Du har inte exporterat någon säkerhetskopia än. Exportera då och då, så finns allt kvar om du byter telefon.';
  const d = new Date(last);
  return `Senast exporterad ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear()}. Exportera då och då, så finns allt kvar om du byter telefon.`;
}

function exportBackup() {
  const data = { app: 'kbt-dagbok', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), entries };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kbt-dagbok-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);

  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  const text = document.getElementById('backup-text');
  if (text) text.textContent = lastExportText();
  showToast('Säkerhetskopian är nedladdad');
}

function isValidEntry(e) {
  return e && typeof e === 'object' && typeof e.id === 'string' && e.id
    && FIELD_IDS.every((id) => typeof e[id] === 'string')
    && /^\d{4}-\d{2}-\d{2}$/.test(e.datum);
}

function cleanEntry(e) {
  const out = { id: e.id };
  for (const id of FIELD_IDS) out[id] = e[id];
  out.createdAt = typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString();
  out.updatedAt = typeof e.updatedAt === 'string' ? e.updatedAt : out.createdAt;
  return out;
}

async function importBackup(file) {
  let incoming;
  try {
    incoming = migrate(JSON.parse(await file.text()));
  } catch {
    showToast('Filen är inte en säkerhetskopia från KBT-dagbok');
    return;
  }

  let added = 0;
  let updated = 0;
  for (const raw of incoming.filter(isValidEntry)) {
    const e = cleanEntry(raw);
    const current = findEntry(e.id);
    if (!current) {
      entries.push(e);
      added++;
    } else if (e.updatedAt > (current.updatedAt || '')) {
      Object.assign(current, e);
      updated++;
    }
  }

  if (!added && !updated) {
    showToast('Inga nya registreringar i filen');
    return;
  }
  if (!persistEntries()) return;
  requestPersistence();
  render();
  const parts = [];
  if (added) parts.push(`${added} ${added === 1 ? 'ny' : 'nya'}`);
  if (updated) parts.push(`${updated} ${updated === 1 ? 'uppdaterad' : 'uppdaterade'}`);
  showToast(`Importerat: ${parts.join(', ')}`);
}

// ---------- Form ----------

function fieldHtml(f, value) {
  const inputId = `falt-${f.id}`;
  const helpId = `hjalp-${f.id}`;
  const errorId = `fel-${f.id}`;
  const control = f.type === 'date'
    ? `<input class="input" type="date" id="${inputId}" name="${f.id}" value="${esc(value)}" required aria-describedby="${helpId} ${errorId}">`
    : `<textarea class="input" id="${inputId}" name="${f.id}" required style="min-height:${f.minHeight}" aria-describedby="${helpId} ${errorId}">${esc(value)}</textarea>`;
  return `
    <div class="field" data-field="${f.id}">
      <div class="field-head">
        <label for="${inputId}">${esc(f.label)}</label>
        <button type="button" class="info-btn" aria-label="Visa hjälp för ${esc(f.label)}" aria-expanded="false" aria-controls="${helpId}">${ICONS.info}</button>
      </div>
      <p class="help" id="${helpId}" hidden>${esc(f.help)}</p>
      ${control}
      <p class="field-error" id="${errorId}" hidden>${ICONS.alert}<span>${esc(f.errorText)}</span></p>
    </div>`;
}

function renderForm(id) {
  setThemeColor('#ffffff');
  const existing = id ? findEntry(id) : null;
  if (id && !existing) return renderNotFound();

  const draftKey = DRAFT_PREFIX + (id || 'ny');
  const base = {};
  for (const fid of FIELD_IDS) base[fid] = existing ? existing[fid] : '';
  if (!existing) base.datum = todayISO();

  const draft = readDraft(draftKey);
  const restored = !!draft && FIELD_IDS.some((fid) => (draft.values[fid] ?? base[fid]) !== base[fid]);
  if (draft && !restored) removeDraft(draftKey);
  const values = restored ? { ...base, ...draft.values } : base;
  const backTarget = existing ? `#/visa/${encodeURIComponent(existing.id)}` : '#/';

  app.innerHTML = `
    <div class="screen">
      <header class="appbar">
        <a class="icon-btn" href="${backTarget}" data-back aria-label="Tillbaka">${ICONS.back}</a>
        <h1>${existing ? 'Redigera registrering' : 'Ny registrering'}</h1>
      </header>
      ${restored ? `
        <div class="notice">
          <p>Du fortsätter på ett osparat utkast.</p>
          <button type="button" class="btn-text" data-action="discard-draft">${existing ? 'Ångra ändringar' : 'Börja om'}</button>
        </div>` : ''}
      <form class="form" id="entry-form" novalidate>
        ${FIELDS.map((f) => fieldHtml(f, values[f.id])).join('')}
      </form>
      <div class="bottombar">
        <div class="status" id="form-status" aria-live="polite"></div>
        <button type="submit" form="entry-form" class="btn btn-primary">Spara</button>
      </div>
    </div>`;

  const form = document.getElementById('entry-form');
  const statusEl = document.getElementById('form-status');
  const pinned = new Set();
  let focused = null;
  let showErrors = false;
  let hasDraft = restored;

  const valueOf = (fid) => form.elements[fid].value;
  const fieldEl = (fid) => form.querySelector(`[data-field="${fid}"]`);

  function currentValues() {
    const out = {};
    for (const fid of FIELD_IDS) out[fid] = valueOf(fid);
    return out;
  }

  function updateHelp(fid) {
    const el = fieldEl(fid);
    const label = FIELDS.find((f) => f.id === fid).label;
    const show = focused === fid || pinned.has(fid);
    el.querySelector('.help').hidden = !show;
    const btn = el.querySelector('.info-btn');
    btn.setAttribute('aria-expanded', String(show));
    btn.setAttribute('aria-label', `${show ? 'Dölj' : 'Visa'} hjälp för ${label}`);
  }

  function updateError(fid) {
    const missing = showErrors && !valueOf(fid).trim();
    const el = fieldEl(fid);
    el.classList.toggle('has-error', missing);
    el.querySelector('.field-error').hidden = !missing;
    form.elements[fid].setAttribute('aria-invalid', String(missing));
  }

  function updateStatus() {
    const missing = FIELD_IDS.filter((fid) => !valueOf(fid).trim()).length;
    const filled = FIELD_IDS.length - missing;
    statusEl.classList.toggle('is-error', showErrors && missing > 0);
    if (missing === 0) statusEl.textContent = 'Alla fält ifyllda';
    else if (showErrors) statusEl.textContent = `${missing} fält saknas`;
    else statusEl.textContent = `${filled} av ${FIELD_IDS.length} ifyllda${hasDraft ? ' · utkast sparat' : ''}`;
  }

  // When the keyboard opens or help text appears, bring the whole field
  // (label, help, input) into the visible area.
  function keepVisible(fid) {
    const check = () => {
      if (focused !== fid) return;
      const el = fieldEl(fid);
      const vv = window.visualViewport;
      const top = (vv ? vv.offsetTop : 0) + document.querySelector('.appbar').offsetHeight;
      const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const rect = el.getBoundingClientRect();
      const input = form.elements[fid].getBoundingClientRect();
      if (rect.top < top || input.top + 60 > bottom) {
        el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    };
    setTimeout(check, 60);
    setTimeout(check, 400);
  }

  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 2 + 'px';
  }
  const needsAutoGrow = !(window.CSS && CSS.supports('field-sizing', 'content'));
  if (needsAutoGrow) form.querySelectorAll('textarea').forEach(autoGrow);

  form.addEventListener('focusin', (e) => {
    const fid = e.target.name;
    if (!FIELD_IDS.includes(fid)) return;
    focused = fid;
    updateHelp(fid);
    keepVisible(fid);
  });

  form.addEventListener('focusout', (e) => {
    const fid = e.target.name;
    if (!FIELD_IDS.includes(fid)) return;
    if (focused === fid) focused = null;
    updateHelp(fid);
  });

  form.addEventListener('input', (e) => {
    const fid = e.target.name;
    if (!FIELD_IDS.includes(fid)) return;
    if (needsAutoGrow && e.target.tagName === 'TEXTAREA') autoGrow(e.target);
    writeDraft(draftKey, currentValues());
    hasDraft = true;
    if (showErrors) updateError(fid);
    updateStatus();
  });

  form.querySelectorAll('.info-btn').forEach((btn) => {
    const fid = btn.closest('.field').dataset.field;
    // Keep focus (and the keyboard) on the field when the ⓘ is tapped.
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      if (pinned.has(fid)) pinned.delete(fid);
      else pinned.add(fid);
      updateHelp(fid);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const missing = FIELD_IDS.filter((fid) => !valueOf(fid).trim());
    if (missing.length) {
      showErrors = true;
      FIELD_IDS.forEach(updateError);
      updateStatus();
      const first = form.elements[missing[0]];
      fieldEl(missing[0]).scrollIntoView({ block: 'start', behavior: 'smooth' });
      first.focus({ preventScroll: true });
      return;
    }

    const now = new Date().toISOString();
    const values = currentValues();
    for (const fid of FIELD_IDS) values[fid] = values[fid].trim();

    if (existing) {
      Object.assign(existing, values, { updatedAt: now });
    } else {
      entries.push({ id: newId(), ...values, createdAt: now, updatedAt: now });
    }
    if (!persistEntries()) return;
    removeDraft(draftKey);
    requestPersistence();
    showToast(existing ? 'Ändringarna är sparade' : 'Registreringen är sparad');
    goBack(backTarget);
  });

  const discard = app.querySelector('[data-action="discard-draft"]');
  if (discard) {
    discard.addEventListener('click', () => {
      removeDraft(draftKey);
      render();
    });
  }

  updateStatus();
}

// ---------- Entry view ----------

function renderView(id) {
  setThemeColor('#ffffff');
  const entry = findEntry(id);
  if (!entry) return renderNotFound();

  app.innerHTML = `
    <div class="screen">
      <header class="appbar">
        <a class="icon-btn" href="#/" data-back aria-label="Tillbaka till listan">${ICONS.back}</a>
        <h1>Registrering</h1>
      </header>
      <main class="view">
        <div class="view-head">
          <h2>${esc(longDate(entry.datum))}</h2>
          <div class="view-meta">${esc(timestampText(entry))}</div>
        </div>
        ${FIELDS.filter((f) => f.id !== 'datum').map((f) => `
          <section class="view-section">
            <h3>${esc(f.label)}</h3>
            <p>${esc(entry[f.id])}</p>
          </section>`).join('')}
      </main>
      <div class="bottombar">
        <a class="btn btn-secondary" href="#/redigera/${encodeURIComponent(entry.id)}">${ICONS.edit}Redigera</a>
      </div>
    </div>`;
}

function renderNotFound() {
  setThemeColor('#ffffff');
  app.innerHTML = `
    <div class="screen">
      <header class="appbar">
        <a class="icon-btn" href="#/" data-back aria-label="Tillbaka till listan">${ICONS.back}</a>
        <h1>Hittades inte</h1>
      </header>
      <main class="empty">
        <p>Registreringen finns inte på den här telefonen.</p>
        <a class="btn-text" href="#/" data-back>Till listan</a>
      </main>
    </div>`;
}

// ---------- Global events ----------

app.addEventListener('click', (e) => {
  const back = e.target.closest('[data-back]');
  if (back) {
    e.preventDefault();
    goBack(back.getAttribute('href'));
    return;
  }
  const action = e.target.closest('[data-action]');
  if (!action) return;
  if (action.dataset.action === 'export') exportBackup();
  if (action.dataset.action === 'import') document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) importBackup(file);
});

// Another tab changed the data: reload it, but don't disturb an open form.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  loadEntries();
  if (!/^#\/(ny|redigera\/)/.test(currentRoute())) render();
});

window.addEventListener('hashchange', onRouteChange);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

loadEntries();
navStack.push(currentRoute());
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
