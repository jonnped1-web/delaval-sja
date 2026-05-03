'use strict';

const STORAGE = {
  sja: 'delaval_sja_v5_entries',
  customers: 'delaval_sja_v5_customers',
  incidents: 'delaval_sja_v5_incidents',
  settings: 'delaval_sja_v5_settings'
};

const SCREENS = ['home', 'sja', 'customers', 'archive', 'report'];

const QUESTIONS = [
  {
    text: 'Er ruten frem til arbeidsstedet sikret mot snublefare og sklifare?',
    riskWhen: 'Nei'
  },
  {
    text: 'Har jeg verktøyene som skal til for å utføre arbeidet på en trygg måte?',
    note: '(Elektroverktøy til kutting av gummi osv, ingen kniver)',
    riskWhen: 'Nei'
  },
  {
    text: 'Har jeg enkel tilgang til utstyr for å skylle øynene?',
    riskWhen: 'Nei'
  },
  {
    text: 'Har jeg det nødvendige personlige verneutstyret?',
    note: '(Vernebriller/visir, riktig type hansker, sko, klær, ørepropper)',
    riskWhen: 'Nei'
  },
  {
    text: 'Er det fare for brannskader, som eksempel fra varmt vann etc?',
    riskWhen: 'Ja'
  },
  {
    text: 'Er det fare for knuse- eller klemmeskader?',
    riskWhen: 'Ja'
  },
  {
    text: 'Er det noen skarpe kanter som kan gi kuttskader?',
    riskWhen: 'Ja'
  },
  {
    text: 'Medfører arbeidsoppgaven tunge løft (25 kg +) eller gjentatte tunge løft (over 20 kg)?',
    riskWhen: 'Ja'
  },
  {
    text: 'Er det trygt å utføre arbeidet alene?',
    riskWhen: 'Nei'
  },
  {
    text: 'Er stigen som skal brukes, i god stand, og egner den seg til den konkrete arbeidsoppgaven?',
    riskWhen: 'Nei'
  },
  {
    text: 'Medfører arbeidsoppgaven arbeid i høyder over to meter?',
    riskWhen: 'Ja'
  },
  {
    text: 'Er det noen energikilder eller kjemikalier som må låses og merkes?',
    note: 'Kontroller alltid at det er skikkelig låst',
    riskWhen: 'Ja'
  },
  {
    text: 'Er skjøteledningene i god stand?',
    riskWhen: 'Nei'
  },
  {
    text: 'Er ledningene på elektroverktøyene i god stand?',
    riskWhen: 'Nei'
  },
  {
    text: 'Fungerer jordfeilbryter som den skal?',
    note: '(Benytt alltid dette når du skal bruke elektriske verktøy)',
    riskWhen: 'Nei'
  },
  {
    text: 'Er det dyr i arbeidsområdet?',
    note: '(Eventuelle dyr må fjernes eller kontrolleres før man kan utføre arbeidet)',
    riskWhen: 'Ja'
  },
  {
    text: 'Medfører oppgaven «varme arbeider»?',
    note: '(Hvis det skal utføres arbeidsoppgaver som innebærer varme arbeider, må man ta nødvendige forholdsregler i samsvar med lovpålagte krav)',
    riskWhen: 'Ja'
  },
  {
    text: 'Er det flere risikoer?',
    riskWhen: 'Ja'
  }
];

const DEFAULT_TASK_OPTIONS = [
  'Service',
  'Feilsøking',
  'Reparasjon',
  'Montering',
  'Kontroll',
  'Vask / kjemi',
  'Elektrisk arbeid',
  'Anna'
];

let state = {
  screen: 'home',
  sjaAnswers: QUESTIONS.map(() => ({ value: '', action: '' })),
  archiveMode: 'sja',
  lastNavigateAt: 0,
  currentPrintHtml: '',
  currentPrintText: '',
  currentPrintTitle: '',
  currentPdfFilename: '',
  currentPdfBlob: null
};

let eventsBound = false;

const $ = (id) => document.getElementById(id);

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function monthISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function previousMonthISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthISO(d);
}

function weekISO(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function dateFromUtc(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekRangeFromISO(value) {
  const match = String(value || '').match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    const today = new Date();
    return weekRangeFromISO(weekISO(today));
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  if (day <= 4) monday.setUTCDate(simple.getUTCDate() - day + 1);
  else monday.setUTCDate(simple.getUTCDate() + 8 - day);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: dateFromUtc(monday), end: dateFromUtc(sunday), week, year };
}

function formatPeriodLabel(config) {
  if (config.type === 'day') return formatDate(config.date);
  if (config.type === 'week') return `Veke ${config.week}, ${config.year} (${formatDate(config.start)}–${formatDate(config.end)})`;
  return config.month;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Klarte ikkje lese lagring', key, err);
    return fallback;
  }
}

function safeWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSjaEntries() { return safeRead(STORAGE.sja, []); }
function setSjaEntries(items) { safeWrite(STORAGE.sja, items); }
function normalizeCustomer(item) {
  if (typeof item === 'string') {
    return { id: makeId(), name: item.trim(), address: '', phone: '' };
  }
  if (!item || typeof item !== 'object') {
    return { id: makeId(), name: '', address: '', phone: '' };
  }
  return {
    id: item.id || makeId(),
    name: String(item.name || item.namn || item.customer || '').trim(),
    address: String(item.address || item.adresse || item.stad || '').trim(),
    phone: String(item.phone || item.telefon || '').trim()
  };
}

function sortCustomers(items) {
  return items.sort((a, b) => a.name.localeCompare(b.name, 'no'));
}

function getCustomers() {
  const raw = safeRead(STORAGE.customers, []);
  const seen = new Set();
  const normalized = [];
  raw.map(normalizeCustomer).forEach(c => {
    if (!c.name) return;
    const key = c.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(c);
  });
  return sortCustomers(normalized);
}

function setCustomers(items) {
  const seen = new Set();
  const normalized = [];
  (items || []).map(normalizeCustomer).forEach(c => {
    if (!c.name) return;
    const key = c.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(c);
  });
  safeWrite(STORAGE.customers, sortCustomers(normalized));
}

function getCustomerName(customer) {
  return normalizeCustomer(customer).name;
}
function getIncidents() { return safeRead(STORAGE.incidents, []); }
function setIncidents(items) { safeWrite(STORAGE.incidents, items); }
function normalizeTaskOptions(items) {
  const base = Array.isArray(items) && items.length ? items : DEFAULT_TASK_OPTIONS;
  const seen = new Set();
  const out = [];
  base.forEach(item => {
    const text = String(item || '').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out.length ? out : DEFAULT_TASK_OPTIONS.slice();
}

function getSettings() {
  const raw = safeRead(STORAGE.settings, {});
  return Object.assign({ montor: '', taskOptions: DEFAULT_TASK_OPTIONS.slice() }, raw, {
    taskOptions: normalizeTaskOptions(raw.taskOptions)
  });
}

function setSettings(settings) {
  const clean = Object.assign({}, settings, {
    taskOptions: normalizeTaskOptions(settings.taskOptions)
  });
  safeWrite(STORAGE.settings, clean);
}

function getTaskOptions() {
  return getSettings().taskOptions;
}

function setTaskOptions(items) {
  const s = getSettings();
  s.taskOptions = normalizeTaskOptions(items);
  setSettings(s);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 2500);
}

function navigate(screen, force = false) {
  const validScreens = SCREENS.concat(['settings', 'incident']);
  if (!validScreens.includes(screen)) return;

  const now = Date.now();
  if (!force && screen === state.screen) return;
  if (!force && now - state.lastNavigateAt < 120) return;
  state.lastNavigateAt = now;

  state.screen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const current = $(`screen-${screen}`);
  if (current) current.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.go === screen);
  });

  const titles = {
    home: 'Hurtig SJA',
    sja: 'Ny SJA',
    customers: 'Kundar',
    archive: 'Arkiv',
    report: 'Rapport',
    settings: 'Innstillingar',
    incident: 'Skadelogg'
  };
  $('topSubtitle').textContent = titles[screen] || '';
  $('customerSuggestions').style.display = 'none';

  if (screen === 'home') renderHome();
  if (screen === 'sja') renderSjaStatus();
  if (screen === 'customers') renderCustomers();
  if (screen === 'archive') renderArchive();
  if (screen === 'report') renderReportPreview();
  if (screen === 'settings') loadSettingsForm();
  if (screen === 'incident') resetIncidentDefaults(false);

  window.scrollTo(0, 0);
}
function renderQuestionList() {
  const container = $('questionList');
  container.innerHTML = QUESTIONS.map((q, i) => {
    const ans = state.sjaAnswers[i];
    const showAction = needsAction(i);
    return `
      <div class="question" data-q="${i}">
        <div class="question-title">${i + 1}. ${escapeHtml(q.text)}</div>
        ${q.note ? `<div class="question-note">${escapeHtml(q.note)}</div>` : ''}
        <div class="answer-row">
          ${['Ja', 'Nei', 'I/R'].map(val => {
            const selected = ans.value === val;
            const riskClass = q.riskWhen === val ? 'risk' : '';
            return `<button class="answer-btn ${riskClass} ${selected ? 'selected' : ''}" type="button" data-answer="${val}" data-index="${i}">${val}</button>`;
          }).join('')}
        </div>
        <div class="action-box ${showAction ? 'visible' : ''}" id="actionBox${i}">
          <label for="action${i}">Risiko håndtert / tiltak</label>
          <input class="action-input" id="action${i}" data-action-index="${i}" type="text" value="${escapeHtml(ans.action)}" placeholder="Kort tiltak..." />
        </div>
      </div>`;
  }).join('');
}

function needsAction(index) {
  const q = QUESTIONS[index];
  const ans = state.sjaAnswers[index];
  return ans.value && ans.value !== 'I/R' && ans.value === q.riskWhen;
}

function validateSja() {
  const answered = state.sjaAnswers.filter(a => a.value).length;
  const missingAnswers = QUESTIONS.length - answered;
  let missingActions = 0;
  state.sjaAnswers.forEach((ans, i) => {
    if (needsAction(i) && !String(ans.action || '').trim()) missingActions++;
  });
  return { answered, missingAnswers, missingActions, ok: missingAnswers === 0 && missingActions === 0 };
}

function renderSjaStatus() {
  const settings = getSettings();
  const date = $('sjaDate').value || todayISO();
  $('sjaDateLabel').textContent = formatDate(date);
  $('sjaMontorLabel').textContent = settings.montor || 'Ikkje sett';

  const valid = validateSja();
  $('sjaProgress').textContent = `Utfylt: ${valid.answered} / ${QUESTIONS.length}`;
  const actionEl = $('sjaActionStatus');
  actionEl.className = 'pill neutral';
  if (valid.missingActions > 0) {
    actionEl.textContent = `${valid.missingActions} tiltak manglar tekst`;
    actionEl.classList.add('danger');
  } else {
    const actionCount = state.sjaAnswers.filter((_, i) => needsAction(i)).length;
    actionEl.textContent = `Tiltak: ${actionCount}`;
    actionEl.classList.add(actionCount > 0 ? 'warn' : 'ok');
  }

  const finalBox = $('sjaFinalStatus');
  const actionCount = state.sjaAnswers.filter((_, i) => needsAction(i)).length;
  if (valid.missingAnswers > 0) {
    finalBox.className = 'final-status hidden';
    finalBox.innerHTML = '';
  } else if (valid.missingActions > 0) {
    finalBox.className = 'final-status warn';
    finalBox.innerHTML = `<strong>Tiltak manglar</strong>Fyll inn tiltakstekst før skjemaet kan lagrast.`;
  } else {
    finalBox.className = 'final-status ok';
    finalBox.innerHTML = `<strong>SJA er fullført</strong>Alle punkt er vurdert.${actionCount ? `<br>Tiltak registrert: ${actionCount}` : ''}`;
  }

  $('saveSjaBtn').disabled = !valid.ok;
  $('saveHint').textContent = valid.ok ? 'Klar til lagring.' : `Manglar ${valid.missingAnswers} svar og ${valid.missingActions} tiltakstekst.`;
}

function updateQuestion(index) {
  const qEl = document.querySelector(`.question[data-q="${index}"]`);
  if (!qEl) return;
  const ans = state.sjaAnswers[index];
  qEl.querySelectorAll('.answer-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.answer === ans.value);
  });
  const box = $(`actionBox${index}`);
  if (box) box.classList.toggle('visible', needsAction(index));
  renderSjaStatus();
}

function resetSjaForm() {
  state.sjaAnswers = QUESTIONS.map(() => ({ value: '', action: '' }));
  $('sjaDate').value = todayISO();
  $('sjaCustomer').value = '';
  $('sjaTaskSelect').value = '';
  $('sjaTaskExtra').value = '';
  $('customerSuggestions').style.display = 'none';
  renderQuestionList();
  renderSjaStatus();
}

function saveSja() {
  const valid = validateSja();
  if (!valid.ok) {
    toast('SJA er ikkje komplett.');
    renderSjaStatus();
    return;
  }

  const settings = getSettings();
  const customer = $('sjaCustomer').value.trim();
  const taskMain = $('sjaTaskSelect').value.trim();
  const taskExtra = $('sjaTaskExtra').value.trim();
  const task = taskMain && taskExtra ? `${taskMain} – ${taskExtra}` : (taskMain || taskExtra);
  if (!customer) return toast('Skriv kunde.');
  if (!task) return toast('Vel eller skriv arbeidsoppgåve.');
  if (!settings.montor) return toast('Legg inn montørnamn i innstillingar.');

  const entry = {
    id: makeId(),
    date: $('sjaDate').value || todayISO(),
    savedAt: new Date().toISOString(),
    montor: settings.montor,
    customer,
    task,
    answers: QUESTIONS.map((q, i) => ({
      nr: i + 1,
      text: q.text,
      note: q.note || '',
      value: state.sjaAnswers[i].value,
      action: needsAction(i) ? String(state.sjaAnswers[i].action || '').trim() : ''
    }))
  };

  const entries = getSjaEntries();
  entries.push(entry);
  setSjaEntries(entries);
  addCustomer(customer, true);
  toast('SJA lagra.');
  resetSjaForm();
  renderHome();
}

function addCustomer(name, silent = false) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const customers = getCustomers();
  const existing = customers.find(c => c.name.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  const customer = { id: makeId(), name: clean, address: '', phone: '' };
  setCustomers(customers.concat(customer));
  if (!silent) toast('Kunde lagt til.');
  return customer;
}

function renderCustomerSuggestions() {
  const value = $('sjaCustomer').value.trim().toLowerCase();
  const box = $('customerSuggestions');
  if (!value) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  const matches = getCustomers()
    .filter(c => c.name.toLowerCase().includes(value))
    .slice(0, 5);
  if (!matches.length) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.innerHTML = matches.map(c => `<div class="suggestion-item" data-customer="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>`).join('');
  box.style.display = 'block';
}

function renderCustomers() {
  const query = ($('customerSearch').value || '').trim().toLowerCase();
  const customers = getCustomers().filter(c => `${c.name} ${c.address} ${c.phone}`.toLowerCase().includes(query));
  const list = $('customerList');
  if (!customers.length) {
    list.innerHTML = '<div class="card compact muted">Ingen kundar funne.</div>';
    return;
  }
  list.innerHTML = customers.map(c => `
    <button class="list-item list-button customer-card" type="button" data-customer-id="${escapeHtml(c.id)}">
      <div class="list-title">${escapeHtml(c.name)}</div>
      ${c.address || c.phone ? `<div class="list-sub">${escapeHtml([c.address, c.phone].filter(Boolean).join(' • '))}</div>` : ''}
    </button>
  `).join('');
}

function openCustomerCard(id) {
  const customer = getCustomers().find(c => c.id === id);
  if (!customer) return;
  $('customerEditId').value = customer.id;
  $('customerEditName').value = customer.name;
  $('customerEditAddress').value = customer.address || '';
  $('customerEditPhone').value = customer.phone || '';
  $('customerEditor').classList.remove('hidden');
  $('customerEditName').focus();
}

function saveCustomerCard() {
  const id = $('customerEditId').value;
  const name = $('customerEditName').value.trim();
  if (!name) return toast('Skriv kundenamn.');
  const customers = getCustomers();
  const updated = customers.map(c => c.id === id ? {
    id,
    name,
    address: $('customerEditAddress').value.trim(),
    phone: $('customerEditPhone').value.trim()
  } : c);
  setCustomers(updated);
  renderCustomers();
  toast('Kunde lagra.');
}

function deleteCustomerCard() {
  const id = $('customerEditId').value;
  const customer = getCustomers().find(c => c.id === id);
  if (!customer) return;
  if (!confirm(`Slette kunden "${customer.name}" frå kunderegisteret?`)) return;
  setCustomers(getCustomers().filter(c => c.id !== id));
  $('customerEditor').classList.add('hidden');
  renderCustomers();
  toast('Kunde sletta.');
}

function renderHome() {
  const nowMonth = monthISO();
  const count = getSjaEntries().filter(e => String(e.date || '').slice(0, 7) === nowMonth).length;
  $('homeMonthCount').textContent = `${count} SJA`;
  $('homeIncidentCount').textContent = String(getIncidents().length);
}

function getArchiveFilterRange() {
  const mode = $('archiveFilter').value;
  const monthVal = $('archiveMonth').value || monthISO();
  const yearVal = String($('archiveYear').value || new Date().getFullYear());
  $('archiveMonthWrap').classList.toggle('visible', mode === 'month');
  $('archiveYearWrap').classList.toggle('visible', mode === 'year');
  return { mode, monthVal, yearVal };
}

function filterArchiveEntries() {
  const { mode, monthVal, yearVal } = getArchiveFilterRange();
  const search = ($('archiveSearch').value || '').toLowerCase().trim();
  let entries = getSjaEntries();
  if (mode === 'thisMonth') entries = entries.filter(e => String(e.date || '').slice(0, 7) === monthISO());
  if (mode === 'prevMonth') entries = entries.filter(e => String(e.date || '').slice(0, 7) === previousMonthISO());
  if (mode === 'month') entries = entries.filter(e => String(e.date || '').slice(0, 7) === monthVal);
  if (mode === 'year') entries = entries.filter(e => String(e.date || '').slice(0, 4) === yearVal);
  if (search) {
    entries = entries.filter(e => `${e.customer} ${e.task} ${e.montor}`.toLowerCase().includes(search));
  }
  return entries.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.savedAt).localeCompare(String(a.savedAt)));
}

function entryHasAction(entry) {
  return (entry.answers || []).some(a => a.action && String(a.action).trim());
}

function renderArchive() {
  const sjaActive = state.archiveMode === 'sja';
  $('archiveSjaTab').classList.toggle('active', sjaActive);
  $('archiveIncidentTab').classList.toggle('active', !sjaActive);
  $('archiveSjaPanel').classList.toggle('hidden', !sjaActive);
  $('archiveIncidentPanel').classList.toggle('hidden', sjaActive);
  if (sjaActive) renderSjaArchive();
  else renderIncidentArchive();
}

function renderSjaArchive() {
  const entries = filterArchiveEntries();
  const list = $('archiveList');
  if (!entries.length) {
    list.innerHTML = '<div class="card compact muted">Ingen SJA i dette utvalet.</div>';
    return;
  }
  list.innerHTML = entries.map(e => `
    <button class="list-item list-button archive-sja-card" type="button" data-id="${escapeHtml(e.id)}">
      <div class="list-title">${formatDate(e.date)} – ${escapeHtml(e.customer)}</div>
      <div class="list-sub">${escapeHtml(e.task)}<br>Montør: ${escapeHtml(e.montor)} • ${entryHasAction(e) ? 'Tiltak registrert' : 'OK'}</div>
    </button>
  `).join('');
}

function renderIncidentArchive() {
  const q = ($('incidentSearch').value || '').toLowerCase().trim();
  let items = getIncidents();
  if (q) items = items.filter(i => `${i.customer} ${i.what} ${i.damage} ${i.action} ${i.note}`.toLowerCase().includes(q));
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.time).localeCompare(String(a.time)));
  const list = $('incidentArchiveList');
  if (!items.length) {
    list.innerHTML = '<div class="card compact muted">Ingen skadeloggar.</div>';
    return;
  }
  list.innerHTML = items.map(i => `
    <div class="list-item">
      <div class="list-title">${formatDate(i.date)} ${escapeHtml(i.time || '')} – ${escapeHtml(i.customer || 'Ukjent stad')}</div>
      <div class="list-sub">${escapeHtml(i.what || '')}<br>Meldt vidare: ${escapeHtml(i.reported || 'Nei')}</div>
      <div class="button-row wrap">
        <button class="btn secondary open-incident" type="button" data-id="${i.id}">Opne</button>
        <button class="btn secondary print-incident" type="button" data-id="${i.id}">PDF</button>
        <button class="btn danger delete-incident" type="button" data-id="${i.id}">Slett</button>
      </div>
    </div>
  `).join('');
}

function openSjaDetail(id) {
  const entry = getSjaEntries().find(e => e.id === id);
  if (!entry) return;
  $('modalTitle').textContent = `SJA – ${formatDate(entry.date)}`;
  $('modalContent').innerHTML = sjaDetailHtml(entry);
  $('modalActions').innerHTML = `
    <button class="btn secondary" type="button" id="modalBackSja">Tilbake</button>
    <button class="btn secondary" type="button" id="modalPrintSja">PDF</button>
    <button class="btn danger" type="button" id="modalDeleteSja">Slett</button>
  `;
  $('modalBackSja').onclick = closeModal;
  $('modalPrintSja').onclick = () => printSingleSja(entry);
  $('modalDeleteSja').onclick = () => deleteSja(entry.id);
  $('detailModal').classList.remove('hidden');
}

function sjaDetailHtml(entry) {
  return `
    <div class="card compact">
      <div><strong>Dato:</strong> ${formatDate(entry.date)}</div>
      <div><strong>Montør:</strong> ${escapeHtml(entry.montor)}</div>
      <div><strong>Kunde/stad:</strong> ${escapeHtml(entry.customer)}</div>
      <div><strong>Arbeidsoppgåve:</strong> ${escapeHtml(entry.task)}</div>
    </div>
    ${(entry.answers || []).map(a => `
      <div class="detail-q">
        <strong>${a.nr}. ${escapeHtml(a.text)}</strong>
        ${a.note ? `<div class="question-note">${escapeHtml(a.note)}</div>` : ''}
        <div>Svar: <strong>${escapeHtml(a.value)}</strong></div>
        ${a.action ? `<div class="detail-action"><strong>Tiltak:</strong> ${escapeHtml(a.action)}</div>` : ''}
      </div>
    `).join('')}
  `;
}

function openIncidentDetail(id) {
  const item = getIncidents().find(i => i.id === id);
  if (!item) return;
  $('modalTitle').textContent = `Skadelogg – ${formatDate(item.date)}`;
  $('modalContent').innerHTML = incidentDetailHtml(item);
  $('modalActions').innerHTML = `
    <button class="btn secondary" type="button" id="modalBackIncident">Tilbake</button>
    <button class="btn secondary" type="button" id="modalPrintIncident">PDF</button>
    <button class="btn danger" type="button" id="modalDeleteIncident">Slett</button>
  `;
  $('modalBackIncident').onclick = closeModal;
  $('modalPrintIncident').onclick = () => printIncident(item);
  $('modalDeleteIncident').onclick = () => deleteIncident(item.id);
  $('detailModal').classList.remove('hidden');
}

function incidentDetailHtml(item) {
  return `
    <div class="detail-q"><strong>Dato:</strong> ${formatDate(item.date)} ${escapeHtml(item.time || '')}</div>
    <div class="detail-q"><strong>Kunde/stad:</strong> ${escapeHtml(item.customer || '')}</div>
    <div class="detail-q"><strong>Kva skjedde?</strong><br>${escapeHtml(item.what || '')}</div>
    <div class="detail-q"><strong>Kva skade / nestenulykke?</strong><br>${escapeHtml(item.damage || '')}</div>
    <div class="detail-q"><strong>Tiltak gjort etterpå</strong><br>${escapeHtml(item.action || '')}</div>
    <div class="detail-q"><strong>Meldt vidare:</strong> ${escapeHtml(item.reported || 'Nei')}</div>
    <div class="detail-q"><strong>Notat</strong><br>${escapeHtml(item.note || '')}</div>
  `;
}

function closeModal() {
  $('detailModal').classList.add('hidden');
  $('modalContent').innerHTML = '';
  $('modalActions').innerHTML = '';
}

function deleteSja(id) {
  if (!confirm('Slette denne SJA-en? Dette kan ikkje angrast.')) return;
  setSjaEntries(getSjaEntries().filter(e => e.id !== id));
  closeModal();
  renderArchive();
  renderHome();
  toast('SJA sletta.');
}

function deleteVisibleSja() {
  const visible = filterArchiveEntries();
  if (!visible.length) return toast('Ingen viste SJA å slette.');
  const text = prompt(`Du er i ferd med å slette ${visible.length} viste SJA. Skriv SLETT for å bekrefte.`);
  if (text !== 'SLETT') return;
  const ids = new Set(visible.map(e => e.id));
  setSjaEntries(getSjaEntries().filter(e => !ids.has(e.id)));
  renderArchive();
  renderHome();
  toast('Viste SJA sletta.');
}

function deleteSjaYear() {
  const year = String($('deleteYearInput').value || '').trim();
  if (!/^\d{4}$/.test(year)) return toast('Skriv gyldig år.');
  const entries = getSjaEntries();
  const count = entries.filter(e => String(e.date || '').slice(0, 4) === year).length;
  if (!count) return toast(`Ingen SJA funne for ${year}.`);
  const text = prompt(`Du er i ferd med å slette alle SJA frå ${year}. Skriv SLETT ${year} for å bekrefte.`);
  if (text !== `SLETT ${year}`) return;
  setSjaEntries(entries.filter(e => String(e.date || '').slice(0, 4) !== year));
  renderArchive();
  renderHome();
  toast(`SJA frå ${year} sletta.`);
}

function resetIncidentDefaults(clear = true) {
  if (clear) {
    $('incidentCustomer').value = '';
    $('incidentWhat').value = '';
    $('incidentDamage').value = '';
    $('incidentAction').value = '';
    $('incidentReported').value = 'Nei';
    $('incidentNote').value = '';
  }
  if (!$('incidentDate').value) $('incidentDate').value = todayISO();
  if (!$('incidentTime').value) $('incidentTime').value = timeNow();
}

function saveIncident() {
  const item = {
    id: makeId(),
    date: $('incidentDate').value || todayISO(),
    time: $('incidentTime').value || timeNow(),
    customer: $('incidentCustomer').value.trim(),
    what: $('incidentWhat').value.trim(),
    damage: $('incidentDamage').value.trim(),
    action: $('incidentAction').value.trim(),
    reported: $('incidentReported').value,
    note: $('incidentNote').value.trim(),
    savedAt: new Date().toISOString()
  };
  if (!item.what && !item.damage) return toast('Skriv kva som skjedde eller skade/nestenulykke.');
  const items = getIncidents();
  items.push(item);
  setIncidents(items);
  if (item.customer) addCustomer(item.customer, true);
  resetIncidentDefaults(true);
  toast('Skadelogg lagra.');
  navigate('home', true);
}

function deleteIncident(id) {
  if (!confirm('Slette denne skadeloggen? Dette kan ikkje angrast.')) return;
  setIncidents(getIncidents().filter(i => i.id !== id));
  closeModal();
  renderArchive();
  renderHome();
  toast('Skadelogg sletta.');
}

function deleteAllIncidents() {
  const items = getIncidents();
  if (!items.length) return toast('Ingen skadeloggar å slette.');
  const text = prompt('Slette alle skadeloggar? Skriv SLETT for å bekrefte.');
  if (text !== 'SLETT') return;
  setIncidents([]);
  renderArchive();
  renderHome();
  toast('Alle skadeloggar sletta.');
}

function getReportConfig() {
  const type = $('reportType')?.value || 'month';
  if (type === 'day') {
    const date = $('reportDate').value || todayISO();
    return {
      type,
      title: 'SJA – Dagsrapport',
      periodName: 'Dato',
      date,
      label: formatDate(date),
      filename: `SJA_dagsrapport_${date}`
    };
  }
  if (type === 'week') {
    const weekValue = $('reportWeek').value || weekISO();
    const range = weekRangeFromISO(weekValue);
    return {
      type,
      title: 'SJA – Vekerapport',
      periodName: 'Veke',
      weekValue,
      ...range,
      label: formatPeriodLabel({ type, ...range }),
      filename: `SJA_vekerapport_${weekValue}`
    };
  }
  const month = $('reportMonth').value || monthISO();
  return {
    type: 'month',
    title: 'SJA – Månadsrapport',
    periodName: 'Månad',
    month,
    label: month,
    filename: `SJA_manadsrapport_${month}`
  };
}

function entriesForReport() {
  const config = getReportConfig();
  return getSjaEntries()
    .filter(e => {
      const date = String(e.date || '');
      if (config.type === 'day') return date === config.date;
      if (config.type === 'week') return date >= config.start && date <= config.end;
      return date.slice(0, 7) === config.month;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.savedAt).localeCompare(String(b.savedAt)));
}

function updateReportControls() {
  const type = $('reportType').value || 'month';
  $('reportDayWrap').classList.toggle('hidden', type !== 'day');
  $('reportWeekWrap').classList.toggle('hidden', type !== 'week');
  $('reportMonthWrap').classList.toggle('hidden', type !== 'month');
}

function renderReportPreview() {
  updateReportControls();
  if (!$('reportDate').value) $('reportDate').value = todayISO();
  if (!$('reportWeek').value) $('reportWeek').value = weekISO();
  if (!$('reportMonth').value) $('reportMonth').value = monthISO();
  const entries = entriesForReport();
  const config = getReportConfig();
  $('reportPreview').innerHTML = simpleReportHtml(entries, config, false);
}

function simpleReportHtml(entries, config, print = false) {
  const actionCount = entries.filter(entryHasAction).length;
  if (!entries.length) return `<p class="muted">Ingen SJA for vald ${config.periodName.toLowerCase()}.</p>`;
  return `
    <h2>${escapeHtml(config.title)}</h2>
    <div class="line-row"><span>${escapeHtml(config.periodName)}:</span><strong>${escapeHtml(config.label)}</strong></div>
    <div class="line-row"><span>Antal SJA:</span><strong>${entries.length}</strong></div>
    <div class="line-row"><span>Med tiltak:</span><strong>${actionCount}</strong></div>
    <table>
      <thead><tr><th>Dato</th><th>Kunde</th><th>Arbeidsoppgåve</th><th>Status</th></tr></thead>
      <tbody>
        ${entries.map(e => `<tr><td>${formatDate(e.date)}</td><td>${escapeHtml(e.customer)}</td><td>${escapeHtml(e.task)}</td><td>${entryHasAction(e) ? 'Tiltak' : 'OK'}</td></tr>`).join('')}
      </tbody>
    </table>
    <h3>Tiltak / avvik</h3>
    ${entries.flatMap(e => (e.answers || []).filter(a => a.action).map(a => `
      <div class="${print ? 'print-note' : 'detail-action'}"><strong>${formatDate(e.date)} – ${escapeHtml(e.customer)}</strong><br>${a.nr}. ${escapeHtml(a.text)}<br>Tiltak: ${escapeHtml(a.action)}</div>
    `)).join('') || '<p>Ingen tiltak registrert.</p>'}
  `;
}

function fullReportHtml(entries, config) {
  if (!entries.length) return `<div class="print-doc"><p>Ingen SJA for vald ${escapeHtml(config.periodName.toLowerCase())}.</p></div>`;
  const actionCount = entries.filter(entryHasAction).length;
  return `
    <div class="print-doc report-cover">
      <div class="print-header">
        <h1>DeLaval SJA – Full ${escapeHtml(config.periodName.toLowerCase())}rapport</h1>
      </div>
      <div class="print-meta">
        <div><strong>${escapeHtml(config.periodName)}:</strong> ${escapeHtml(config.label)}</div>
        <div><strong>Antal SJA:</strong> ${entries.length}</div>
        <div><strong>Med tiltak:</strong> ${actionCount}</div>
        <div><strong>Generert:</strong> ${formatDate(todayISO())}</div>
      </div>
      <p class="muted">Full rapport viser alle lagra SJA i perioden. Kvar jobb står som eige utfylt skjema med alle 18 kontrollpunkt.</p>
    </div>
    ${entries.map((e, index) => sjaFormReportHtml(e, index + 1)).join('')}
  `;
}

function singleSjaPrintHtml(entry) {
  return sjaFormReportHtml(entry);
}

function sjaFormReportHtml(entry, index = null) {
  const actionItems = (entry.answers || []).filter(a => a.action && String(a.action).trim());
  return `
    <div class="print-doc sja-form-doc">
      <div class="print-header">
        <h1>${index ? `SJA ${index}` : 'DeLaval SJA'}</h1>
        <div class="print-meta">
          <div><strong>Dato:</strong> ${formatDate(entry.date)}</div>
          <div><strong>Montør:</strong> ${escapeHtml(entry.montor)}</div>
          <div><strong>Kunde:</strong> ${escapeHtml(entry.customer)}</div>
          <div><strong>Arbeidsoppgåve:</strong> ${escapeHtml(entry.task)}</div>
        </div>
      </div>
      <div class="sja-form-list">
        ${(entry.answers || []).map(a => `
          <div class="sja-form-question">
            <div class="sja-form-title">${a.nr}. ${escapeHtml(a.text)}</div>
            ${a.note ? `<div class="question-note">${escapeHtml(a.note)}</div>` : ''}
            <div class="sja-form-answer">Svar: <strong>${escapeHtml(a.value || '-')}</strong></div>
            ${a.action ? `<div class="print-note"><strong>Risiko håndtert / tiltak:</strong><br>${escapeHtml(a.action)}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="sja-form-summary">
        <strong>Tiltak / avvik:</strong> ${actionItems.length ? `${actionItems.length} registrert` : 'Ingen tiltak registrert.'}
      </div>
    </div>
  `;
}

function incidentPrintHtml(item) {
  return `
    <div class="print-doc">
      <div class="print-header"><h1>Skadelogg / hendelse</h1></div>
      <div class="print-meta">
        <div><strong>Dato:</strong> ${formatDate(item.date)}</div>
        <div><strong>Klokke:</strong> ${escapeHtml(item.time || '')}</div>
        <div><strong>Kunde/stad:</strong> ${escapeHtml(item.customer || '')}</div>
        <div><strong>Meldt vidare:</strong> ${escapeHtml(item.reported || 'Nei')}</div>
      </div>
      <div class="print-section-title">Kva skjedde?</div><p>${escapeHtml(item.what || '')}</p>
      <div class="print-section-title">Kva skade / nestenulykke?</div><p>${escapeHtml(item.damage || '')}</p>
      <div class="print-section-title">Tiltak gjort etterpå</div><p>${escapeHtml(item.action || '')}</p>
      <div class="print-section-title">Notat</div><p>${escapeHtml(item.note || '')}</p>
    </div>`;
}

function htmlToPlainText(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Full rapport: kvar lagra SJA skal starte på ny PDF-side.
  // Dette blir brukt av den enkle PDF-generatoren og påverkar ikkje vanleg visning.
  const parts = [];
  const children = Array.from(temp.children);
  if (children.length) {
    children.forEach((child, index) => {
      const isSjaForm = child.classList && child.classList.contains('sja-form-doc');
      if (isSjaForm && index > 0 && parts.length) parts.push('\f');
      const text = child.innerText.trim();
      if (text) parts.push(text);
    });
    return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  return temp.innerText.replace(/\n{3,}/g, '\n\n').trim();
}

function openReportView(title, html, filenameHint = '') {
  state.currentPrintHtml = html;
  state.currentPrintText = htmlToPlainText(html);
  state.currentPrintTitle = title;
  state.currentPdfFilename = makePdfFilename(filenameHint || title);
  state.currentPdfBlob = null;
  $('modalTitle').textContent = title;
  $('modalActions').innerHTML = `
    <button class="btn secondary" type="button" id="modalBackFromReport">Tilbake</button>
    <button class="btn primary" type="button" id="modalShareReportText">Del rapporttekst</button>
    <button class="btn secondary" type="button" id="modalCopyReport">Kopier tekst</button>
    <button class="btn secondary" type="button" id="modalSharePdf">Del PDF</button>
    <button class="btn secondary" type="button" id="modalDownloadPdf">Last ned PDF</button>
  `;
  $('modalContent').innerHTML = `<div class="report-view">${html}</div>`;
  $('detailModal').classList.remove('hidden');
  $('modalBackFromReport').onclick = closeModal;
  $('modalShareReportText').onclick = shareCurrentReportText;
  $('modalCopyReport').onclick = copyCurrentReportText;
  $('modalSharePdf').onclick = shareCurrentReportPdf;
  $('modalDownloadPdf').onclick = downloadCurrentReportPdf;
}

function makePdfFilename(name) {
  const base = String(name || 'SJA rapport')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'o')
    .replace(/[åÅ]/g, 'a')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 70) || 'SJA_rapport';
  return `${base}_${todayISO()}.pdf`;
}

function wrapPdfLine(line, maxChars) {
  const words = String(line || '').replace(/\t/g, '    ').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  words.forEach(word => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      return;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function reportTextToPdfLines(text) {
  const out = [];
  String(text || '').split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed === '\f') {
      out.push('__PDF_PAGE_BREAK__');
      return;
    }
    if (!trimmed) {
      out.push('');
      return;
    }
    wrapPdfLine(trimmed, 88).forEach(x => out.push(x));
  });
  return out;
}

function winAnsiByte(char) {
  const code = char.charCodeAt(0);
  if (code <= 126) return code;
  const map = {
    0x00c6: 198, 0x00d8: 216, 0x00c5: 197,
    0x00e6: 230, 0x00f8: 248, 0x00e5: 229,
    0x00c9: 201, 0x00e9: 233, 0x00dc: 220, 0x00fc: 252,
    0x00d6: 214, 0x00f6: 246, 0x00c4: 196, 0x00e4: 228,
    0x00a0: 32, 0x2013: 150, 0x2014: 151,
    0x2018: 145, 0x2019: 146, 0x201c: 147, 0x201d: 148,
    0x2026: 133, 0x00ab: 171, 0x00bb: 187
  };
  return map[code] || 63;
}

function pdfEscapeText(text) {
  let out = '';
  String(text || '').split('').forEach(char => {
    if (char === '(' || char === ')' || char === '\\') {
      out += '\\' + char;
    } else {
      out += String.fromCharCode(winAnsiByte(char));
    }
  });
  return out;
}

function binaryStringToBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) bytes[i] = str.charCodeAt(i) & 255;
  return bytes;
}

function makeSimplePdfBlob(title, bodyText) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 42;
  const startY = 800;
  const lineHeight = 14;
  const linesPerPage = 54;
  const titleLine = String(title || 'SJA rapport').trim();
  const lines = [titleLine, '', ...reportTextToPdfLines(bodyText)];
  const pages = [];
  let currentPage = [];

  lines.forEach(line => {
    if (line === '__PDF_PAGE_BREAK__') {
      if (currentPage.length) pages.push(currentPage);
      currentPage = [];
      return;
    }
    if (currentPage.length >= linesPerPage) {
      pages.push(currentPage);
      currentPage = [];
    }
    currentPage.push(line);
  });
  if (currentPage.length) pages.push(currentPage);
  if (!pages.length) pages.push(['SJA rapport']);

  const objects = [];
  const pageObjectNumbers = [];
  const contentObjectNumbers = [];
  const fontObjectNumber = 3;
  let nextObjectNumber = 4;

  pages.forEach(() => {
    pageObjectNumbers.push(nextObjectNumber++);
    contentObjectNumbers.push(nextObjectNumber++);
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  pages.forEach((pageLines, index) => {
    const pageNo = pageObjectNumbers[index];
    const contentNo = contentObjectNumbers[index];
    objects[pageNo] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentNo} 0 R >>`;
    let stream = `BT\n/F1 10 Tf\n${marginX} ${startY} Td\n${lineHeight} TL\n`;
    pageLines.forEach((line, lineIndex) => {
      if (lineIndex === 0 && index === 0) {
        stream += `/F1 14 Tf\n(${pdfEscapeText(line)}) Tj\n/F1 10 Tf\nT*\n`;
      } else if (!line) {
        stream += 'T*\n';
      } else {
        stream += `(${pdfEscapeText(line)}) Tj\nT*\n`;
      }
    });
    stream += 'ET\n';
    objects[contentNo] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  });

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    if (!objects[i]) continue;
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i += 1) {
    const offset = String(offsets[i] || 0).padStart(10, '0');
    pdf += `${offset} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([binaryStringToBytes(pdf)], { type: 'application/pdf' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

function getCurrentPdf() {
  const text = state.currentPrintText || htmlToPlainText(state.currentPrintHtml || '');
  if (!text) {
    toast('Ingen rapport å lage PDF av.');
    return null;
  }
  const filename = state.currentPdfFilename || makePdfFilename(state.currentPrintTitle || 'SJA rapport');
  if (!state.currentPdfBlob) {
    state.currentPdfBlob = makeSimplePdfBlob(state.currentPrintTitle || 'SJA rapport', text);
  }
  return { blob: state.currentPdfBlob, filename };
}

async function shareCurrentReportPdf() {
  const pdf = getCurrentPdf();
  if (!pdf) return;
  const file = new File([pdf.blob], pdf.filename, { type: 'application/pdf' });

  if (!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }))) {
    return toast('PDF-deling støttes ikkje her. Bruk Last ned PDF eller Kopier tekst.');
  }

  try {
    await navigator.share({ files: [file], title: pdf.filename, text: 'SJA PDF' });
    toast('PDF sendt til deling/lagring.');
  } catch (err) {
    if (err && err.name === 'AbortError') return toast('PDF-deling avbroten.');
    toast('Klarte ikkje dele PDF. Bruk Last ned PDF eller Kopier tekst.');
  }
}

function downloadCurrentReportPdf() {
  const pdf = getCurrentPdf();
  if (!pdf) return;
  try {
    downloadBlob(pdf.blob, pdf.filename);
    toast('PDF-fil laga. Vel YES i nedlastingsboksen viss han kjem opp.');
  } catch (err) {
    toast('Klarte ikkje laste ned PDF. Bruk Kopier tekst som reserve.');
  }
}

async function shareCurrentReportText() {
  const text = state.currentPrintText || htmlToPlainText(state.currentPrintHtml || '');
  if (!text) return toast('Ingen rapporttekst å dele.');
  if (!navigator.share) return copyCurrentReportText();
  try {
    await navigator.share({
      title: state.currentPrintTitle || 'SJA rapport',
      text
    });
    toast('Rapporttekst sendt til deling.');
  } catch (err) {
    if (err && err.name === 'AbortError') return toast('Deling avbroten.');
    toast('Klarte ikkje dele. Bruk Kopier tekst.');
  }
}

async function copyCurrentReportText() {
  const text = state.currentPrintText || htmlToPlainText(state.currentPrintHtml || '');
  if (!text) return toast('Ingen rapporttekst å kopiere.');
  try {
    await navigator.clipboard.writeText(text);
    toast('Rapporttekst kopiert.');
  } catch (err) {
    const box = $('importText') || $('backupText');
    if (box) box.value = text;
    toast('Kopiering feila. Teksten er lagt i eit tekstfelt som reserve.');
  }
}

function printSingleSja(entry) {
  openReportView('SJA-rapport', singleSjaPrintHtml(entry), `SJA_${entry.date || todayISO()}_${entry.customer || 'kunde'}`);
}

function printIncident(item) {
  openReportView('Skadelogg-rapport', incidentPrintHtml(item), `Skadelogg_${item.date || todayISO()}_${item.customer || 'hendelse'}`);
}

function printSimpleReport() {
  const entries = entriesForReport();
  const config = getReportConfig();
  const html = `<div class="print-doc"><div class="print-header"><h1>${escapeHtml(config.title)}</h1></div>${simpleReportHtml(entries, config, true)}</div>`;
  openReportView(`Enkel ${config.periodName.toLowerCase()}rapport`, html, config.filename);
}

function printFullReport() {
  const entries = entriesForReport();
  const config = getReportConfig();
  openReportView(`Full ${config.periodName.toLowerCase()}rapport`, fullReportHtml(entries, config), `${config.filename}_full`);
}

function renderTaskSelect() {
  const select = $('sjaTaskSelect');
  if (!select) return;
  const current = select.value;
  const options = getTaskOptions();
  select.innerHTML = `<option value="">Vel arbeidsoppgåve</option>${options.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}`;
  if (options.includes(current)) select.value = current;
}

function renderTaskOptionsList() {
  const list = $('taskOptionsList');
  if (!list) return;
  const options = getTaskOptions();
  list.innerHTML = options.map((item, index) => `
    <div class="task-option-row">
      <input class="task-option-input" data-task-index="${index}" type="text" value="${escapeHtml(item)}" />
      <button class="btn secondary mini save-task-option" data-task-index="${index}" type="button">Lagre</button>
      <button class="btn danger mini delete-task-option" data-task-index="${index}" type="button">Slett</button>
    </div>
  `).join('');
}

function loadSettingsForm() {
  const s = getSettings();
  $('settingsMontor').value = s.montor || '';
  renderTaskOptionsList();
}

function saveSettings() {
  const s = getSettings();
  s.montor = $('settingsMontor').value.trim();
  setSettings(s);
  renderSjaStatus();
  renderTaskSelect();
  toast('Innstillingar lagra.');
}

function addTaskOption() {
  const value = $('newTaskOptionInput').value.trim();
  if (!value) return toast('Skriv arbeidsoppgåve først.');
  const options = getTaskOptions();
  if (options.some(x => x.toLowerCase() === value.toLowerCase())) {
    return toast('Arbeidsoppgåva finst frå før.');
  }
  setTaskOptions(options.concat(value));
  $('newTaskOptionInput').value = '';
  renderTaskOptionsList();
  renderTaskSelect();
  toast('Arbeidsoppgåve lagt til.');
}

function saveTaskOption(index) {
  const input = document.querySelector(`.task-option-input[data-task-index="${index}"]`);
  if (!input) return;
  const value = input.value.trim();
  if (!value) return toast('Arbeidsoppgåve kan ikkje vere tom.');
  const options = getTaskOptions();
  const duplicate = options.some((item, i) => i !== index && item.toLowerCase() === value.toLowerCase());
  if (duplicate) return toast('Arbeidsoppgåva finst frå før.');
  options[index] = value;
  setTaskOptions(options);
  renderTaskOptionsList();
  renderTaskSelect();
  toast('Arbeidsoppgåve lagra.');
}

function deleteTaskOption(index) {
  const options = getTaskOptions();
  const item = options[index];
  if (!item) return;
  if (!confirm(`Slette arbeidsoppgåva "${item}"?`)) return;
  options.splice(index, 1);
  setTaskOptions(options);
  renderTaskOptionsList();
  renderTaskSelect();
  toast('Arbeidsoppgåve sletta.');
}

function resetTaskOptions() {
  if (!confirm('Nullstille arbeidsoppgåver til standardliste?')) return;
  setTaskOptions(DEFAULT_TASK_OPTIONS.slice());
  renderTaskOptionsList();
  renderTaskSelect();
  toast('Standardvalg lagt inn.');
}

function makeBackup() {
  const backup = {
    app: 'DeLaval SJA',
    version: 10,
    exportedAt: new Date().toISOString(),
    data: {
      settings: getSettings(),
      customers: getCustomers(),
      sja: getSjaEntries(),
      incidents: getIncidents()
    }
  };
  $('backupText').value = JSON.stringify(backup, null, 2);
  toast('Backuptekst laga.');
}

async function copyBackup() {
  const text = $('backupText').value;
  if (!text) return toast('Lag backuptekst først.');
  try {
    await navigator.clipboard.writeText(text);
    toast('Backup kopiert.');
  } catch (err) {
    $('backupText').focus();
    $('backupText').select();
    document.execCommand('copy');
    toast('Backup markert/kopiert.');
  }
}

async function shareBackup() {
  const text = $('backupText').value;
  if (!text) return toast('Lag backuptekst først.');
  const fileName = `delaval_sja_backup_${todayISO()}.json`;
  try {
    if (navigator.share) {
      await navigator.share({ title: fileName, text });
      return;
    }
  } catch (err) {
    // user cancelled or share failed; fallback below
  }
  await copyBackup();
}

function importBackupObject(obj) {
  if (!obj || !obj.data) throw new Error('Ugyldig backup');
  if (Array.isArray(obj.data.sja)) setSjaEntries(obj.data.sja);
  if (Array.isArray(obj.data.customers)) setCustomers(obj.data.customers);
  if (Array.isArray(obj.data.incidents)) setIncidents(obj.data.incidents);
  if (obj.data.settings && typeof obj.data.settings === 'object') setSettings(obj.data.settings);
}

function importBackup() {
  const text = $('importText').value.trim();
  const file = $('backupFile').files && $('backupFile').files[0];
  const proceed = (raw) => {
    try {
      const obj = JSON.parse(raw);
      if (!confirm('Importere backup? Dette overskriv lokale data i appen.')) return;
      importBackupObject(obj);
      toast('Backup importert.');
      loadSettingsForm();
      renderTaskSelect();
      renderHome();
    } catch (err) {
      toast('Klarte ikkje importere backup.');
    }
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => proceed(String(reader.result || ''));
    reader.readAsText(file);
  } else if (text) {
    proceed(text);
  } else {
    toast('Vel fil eller lim inn backuptekst.');
  }
}

function resetApp() {
  const text = prompt('Dette slettar alle lokale data i appen. Skriv SLETT for å bekrefte.');
  if (text !== 'SLETT') return;

  Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('delaval_sja_v5_migrated_old_v13');
  localStorage.removeItem('delaval_final_v13');

  state.sjaAnswers = QUESTIONS.map(() => ({ value: '', action: '' }));
  state.archiveMode = 'sja';
  toast('Alle data er sletta. Appen startar på nytt.');
  setTimeout(() => window.location.reload(), 300);
}
function migrateOldHtmlData() {
  const migratedKey = 'delaval_sja_v5_migrated_old_v13';
  if (localStorage.getItem(migratedKey)) return;
  const old = safeRead('delaval_final_v13', null);
  if (!Array.isArray(old) || !old.length) {
    localStorage.setItem(migratedKey, '1');
    return;
  }
  const existing = getSjaEntries();
  const migrated = old.map(item => ({
    id: makeId(),
    date: item.dato || todayISO(),
    savedAt: new Date().toISOString(),
    montor: item.navn || '',
    customer: item.kunde || 'Ukjent kunde',
    task: item.oppgave || '',
    answers: (item.svar || []).map((a, i) => ({
      nr: i + 1,
      text: QUESTIONS[i]?.text || a.s || '',
      note: QUESTIONS[i]?.note || '',
      value: a.v === 'Ikke relevant' ? 'I/R' : (a.v || ''),
      action: a.t || ''
    }))
  }));
  setSjaEntries(existing.concat(migrated));
  migrated.forEach(e => addCustomer(e.customer, true));
  localStorage.setItem(migratedKey, '1');
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) {
      navigate(go.dataset.go);
      return;
    }

    const answer = e.target.closest('.answer-btn');
    if (answer) {
      const index = Number(answer.dataset.index);
      const value = answer.dataset.answer;
      state.sjaAnswers[index].value = value;
      if (!needsAction(index)) state.sjaAnswers[index].action = '';
      updateQuestion(index);
      return;
    }

    const suggestion = e.target.closest('.suggestion-item');
    if (suggestion) {
      $('sjaCustomer').value = suggestion.dataset.customer;
      $('customerSuggestions').style.display = 'none';
      return;
    }

    const archiveSjaCard = e.target.closest('.archive-sja-card');
    if (archiveSjaCard) return openSjaDetail(archiveSjaCard.dataset.id);

    const customerCard = e.target.closest('.customer-card');
    if (customerCard) return openCustomerCard(customerCard.dataset.customerId);
    const openIncident = e.target.closest('.open-incident');
    if (openIncident) return openIncidentDetail(openIncident.dataset.id);
    const printIncidentBtn = e.target.closest('.print-incident');
    if (printIncidentBtn) {
      const item = getIncidents().find(x => x.id === printIncidentBtn.dataset.id);
      if (item) printIncident(item);
      return;
    }
    const delIncident = e.target.closest('.delete-incident');
    if (delIncident) return deleteIncident(delIncident.dataset.id);

    const saveTask = e.target.closest('.save-task-option');
    if (saveTask) return saveTaskOption(Number(saveTask.dataset.taskIndex));

    const deleteTask = e.target.closest('.delete-task-option');
    if (deleteTask) return deleteTaskOption(Number(deleteTask.dataset.taskIndex));

  });

  document.addEventListener('input', (e) => {
    const actionInput = e.target.closest('[data-action-index]');
    if (actionInput) {
      const index = Number(actionInput.dataset.actionIndex);
      state.sjaAnswers[index].action = actionInput.value;
      renderSjaStatus();
    }
  });

  $('settingsBtn').addEventListener('click', () => navigate('settings'));
  $('sjaDate').addEventListener('change', renderSjaStatus);
  $('sjaCustomer').addEventListener('input', renderCustomerSuggestions);
  $('saveSjaBtn').addEventListener('click', saveSja);

  $('addCustomerBtn').addEventListener('click', () => {
    const customer = addCustomer($('newCustomerInput').value);
    $('newCustomerInput').value = '';
    renderCustomers();
    if (customer) openCustomerCard(customer.id);
  });
  $('customerSearch').addEventListener('input', renderCustomers);
  $('saveCustomerCardBtn').addEventListener('click', saveCustomerCard);
  $('deleteCustomerCardBtn').addEventListener('click', deleteCustomerCard);

  $('archiveSjaTab').addEventListener('click', () => { state.archiveMode = 'sja'; renderArchive(); });
  $('archiveIncidentTab').addEventListener('click', () => { state.archiveMode = 'incident'; renderArchive(); });
  $('archiveFilter').addEventListener('change', renderArchive);
  $('archiveMonth').addEventListener('change', renderArchive);
  $('archiveYear').addEventListener('input', renderArchive);
  $('archiveSearch').addEventListener('input', renderArchive);
  $('toggleSjaCleanupBtn').addEventListener('click', () => $('sjaCleanupPanel').classList.toggle('hidden'));
  $('incidentSearch').addEventListener('input', renderArchive);
  $('deleteVisibleSjaBtn').addEventListener('click', deleteVisibleSja);
  $('deleteYearBtn').addEventListener('click', deleteSjaYear);
  $('deleteAllIncidentsBtn').addEventListener('click', deleteAllIncidents);

  $('showSimpleReportBtn').addEventListener('click', renderReportPreview);
  $('printSimpleReportBtn').addEventListener('click', printSimpleReport);
  $('printFullReportBtn').addEventListener('click', printFullReport);
  $('reportType').addEventListener('change', renderReportPreview);
  $('reportDate').addEventListener('change', renderReportPreview);
  $('reportWeek').addEventListener('change', renderReportPreview);
  $('reportMonth').addEventListener('change', renderReportPreview);

  $('saveSettingsBtn').addEventListener('click', saveSettings);
  $('addTaskOptionBtn').addEventListener('click', addTaskOption);
  $('resetTaskOptionsBtn').addEventListener('click', resetTaskOptions);
  $('makeBackupBtn').addEventListener('click', makeBackup);
  $('copyBackupBtn').addEventListener('click', copyBackup);
  $('shareBackupBtn').addEventListener('click', shareBackup);
  $('importBackupBtn').addEventListener('click', importBackup);
  $('resetAppBtn').addEventListener('click', resetApp);

  $('saveIncidentBtn').addEventListener('click', saveIncident);
  $('closeModalBtn').addEventListener('click', closeModal);
  $('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeModal();
  });

  let startX = 0;
  let startY = 0;
  let startedOnInput = false;
  document.addEventListener('touchstart', (e) => {
    if (!e.touches || !e.touches.length) return;
    startedOnInput = !!e.target.closest('input, textarea, select, button, .modal');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (startedOnInput || !e.changedTouches || !e.changedTouches.length) return;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Sveip må vere tydeleg horisontalt, så vanleg opp/ned-scrolling ikkje bytter side.
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
      const currentIndex = SCREENS.indexOf(state.screen);
      if (currentIndex === -1) return;

      if (dx < 0 && currentIndex < SCREENS.length - 1) {
        navigate(SCREENS[currentIndex + 1]);
      } else if (dx > 0 && currentIndex > 0) {
        navigate(SCREENS[currentIndex - 1]);
      }
    }
  }, { passive: true });

}

function init() {
  migrateOldHtmlData();
  setCustomers(getCustomers());
  $('sjaDate').value = todayISO();
  $('archiveMonth').value = monthISO();
  $('archiveYear').value = String(new Date().getFullYear());
  $('deleteYearInput').value = String(new Date().getFullYear());
  $('reportDate').value = todayISO();
  $('reportWeek').value = weekISO();
  $('reportMonth').value = monthISO();
  resetIncidentDefaults(true);
  renderTaskSelect();
  renderQuestionList();
  bindEvents();
  navigate('home', true);
}

init();
