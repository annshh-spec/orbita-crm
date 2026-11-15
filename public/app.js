'use strict';
(() => {
// ---------- утилиты ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const dstr = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const today = () => dstr(new Date());
const ym = v => { if (!v) return ''; if (typeof v === 'string') return v.slice(0, 7); const d = new Date(v); return d.getFullYear() + '-' + p2(d.getMonth() + 1); };
const monthShift = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + p2(d.getMonth() + 1); };
const NB = ' ';
const rub = n => Math.round(+n || 0).toLocaleString('ru-RU') + NB + 'руб.';
const shortRub = n => { n = +n || 0; const a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '').replace('.', ',') + NB + 'млн' : a >= 1e3 ? Math.round(n / 1e3) + NB + 'тыс' : String(Math.round(n)); };
const nowKey = () => { const d = new Date(); return dstr(d) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const isOver = x => !x.done && !!x.due && (x.due + 'T' + (x.due_time || '23:59')) < nowKey();
const dueText = x => x.due ? (x.due === today() ? 'сегодня' : fd(x.due)) + (x.due_time ? ' ' + x.due_time : '') : '';
const fd = d => d ? String(d).slice(0, 10).split('-').reverse().join('.') : '—';
const fdt = ts => { const d = new Date(ts); return p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear() + ' в ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const pl = (n, f) => { const a = Math.abs(n) % 10, b = Math.abs(n) % 100; return n + ' ' + (a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]); };
const MON = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const GR = [['#5b5ff0', '#a855f7'], ['#0ea5e9', '#6366f1'], ['#ec4899', '#a855f7'], ['#10b981', '#0ea5e9'], ['#f59e0b', '#ef4444'], ['#8b5cf6', '#ec4899']];
const PALETTE = ['#6366f1', '#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#64748b'];
const AVA = {};
const avatar = (name, id, cls = '', st) => { const g = GR[(+id || 0) % GR.length], src = AVA[id]; return `<span class="av ${cls} ${src ? 'pic' : ''}" style="background:linear-gradient(135deg,${g[0]},${g[1]})" aria-hidden="true">${src ? `<img src="${src}" alt="">` : esc(initials(name))}${st === undefined ? '' : `<i class="st ${st ? 'on' : ''}"></i>`}</span>`; };
function ago(ts) {
  if (!ts) return 'ещё не заходил(а)';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'меньше минуты назад';
  if (s < 3600) return pl(Math.floor(s / 60), ['минуту', 'минуты', 'минут']) + ' назад';
  if (s < 86400) return pl(Math.floor(s / 3600), ['час', 'часа', 'часов']) + ' назад';
  return fdt(ts);
}

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  deals: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7v7M12 7v4M16 7v10"/>',
  contacts: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  tasks: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  contracts: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/>',
  finance: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  kb: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  team: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  profile: '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  plus: '<path d="M5 12h14M12 5v14"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>', down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  bag: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/>', pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  funnel: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>', star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  products: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  draft: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  spam: '<path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  reply: '<path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  fwd: '<path d="m15 17 5-5-5-5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  unread: '<circle cx="18" cy="6" r="3"/><path d="M13 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m2 8 9 6 4-2.7"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>', msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  back: '<path d="m15 18-6-6 6-6"/>', flag: '<path d="M4 22V4a1 1 0 0 1 1-1h13l-3 5 3 5H5"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  orbit: '<circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><path d="M10.4 21.9a10 10 0 0 0 9.941-15.416"/><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>', requests: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>', target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};
const I = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
// глазок в каждом поле пароля: показать или скрыть введённое
const EYE = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.3M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20"/>';
function eyeify() {
  document.querySelectorAll('input[type=password]:not([data-eye])').forEach(inp => {
    inp.dataset.eye = '1';
    const w = document.createElement('span'); w.className = 'pwd';
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'eye'; b.tabIndex = 0;
    const set = show => { b.innerHTML = `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${show ? EYE_OFF : EYE}</svg>`; b.title = show ? 'Скрыть пароль' : 'Показать пароль'; b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', show ? 'true' : 'false'); };
    set(false);
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const show = inp.type === 'password'; const pos = inp.selectionStart; inp.type = show ? 'text' : 'password'; set(show); inp.focus(); try { inp.setSelectionRange(pos, pos); } catch {} });
    w.appendChild(b);
  });
}
new MutationObserver(eyeify).observe(document.documentElement, { childList: true, subtree: true });

// ---------- состояние ----------
let KEEPQ = false, BASE = 'deals', D = null, LAST = '', VIEW = 'dashboard', Q = '', dragging = false, OBS = [];
const UI = { prodKind: '', reqSt: 'new', dealsSt: 'open', dealsMine: 'all', resp: '', taskTab: 'open', taskMine: 'all', txType: 'all', kbCat: '', src: '', chart: 'month', contractSt: '' };
const P = () => D.me.perms;
const can = s => !!P().sections[s];
const may = (s, a) => !!(P().acl && P().acl[s] && P().acl[s][a]);
const canEd = s => may(s, 'e');
const SEC_OF = { products: 'products', deals: 'deals', contacts: 'contacts', tasks: 'tasks', contracts: 'contracts', kb: 'kb', tx: 'finance' };
const money = () => !!P().money;
const dir = () => !!P().director;
const stageOf = id => D.stages.find(s => s.id === id);
const kindOf = d => (stageOf(d.stage_id) || {}).kind || 'open';
const pname = id => (D.people.find(p => p.id === id) || {}).name || '';
const cById = id => D.contacts.find(c => c.id === id);
const dById = id => D.deals.find(d => d.id === id);
const match = (o, ks) => !Q || ks.some(k => String(typeof k === 'function' ? k(o) : o[k] ?? '').toLowerCase().includes(Q.toLowerCase()));
const sum = (a, f = x => x) => a.reduce((s, x) => s + (+f(x) || 0), 0);

// ---------- сеть ----------
async function api(method, url, body) {
  const r = await fetch('/api/' + url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CRM': '1' }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch {}
  if (r.status === 401 && !/^(login|invite|password|register)/.test(url)) { D = null; showLogin(); throw new Error('Требуется вход'); }
  if (!r.ok) throw new Error(j.error || 'Ошибка сервера');
  return j;
}
async function load() {
  const d = await api('GET', 'data'); delete d.now;
  const s = JSON.stringify(d), ch = s !== LAST; LAST = s; D = d;
  for (const k in AVA) delete AVA[k]; [...(d.people || []), ...(d.team || []), d.me].forEach(x => { if (x && x.avatar) AVA[x.id] = x.avatar; });
  return ch;
}
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2800); }
const fail = e => { if (e.message !== 'Требуется вход') toast(e.message); };

// ---------- тема ----------
const theme = () => document.documentElement.dataset.theme;
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('crm-theme', t); } catch {} if (D) render(); else document.querySelectorAll('[data-act=theme]').forEach(b => b.innerHTML = I(t === 'dark' ? 'sun' : 'moon')); }

// ---------- вход и регистрация ----------
const BRAND = 'Орбита';
const ART = {
  login: ['Выведите бизнес на орбиту', 'Все клиенты, сделки и задачи в одном окне. Орбита напомнит о звонке, подсветит просроченную задачу и покажет, сколько компания заработала за месяц.', 'Ни одна сделка не потеряется', 'Доступ — только по личному паролю'],
  reg: ['Подключите компанию к Орбите', 'Воронка продаж, задачи со сроками до минуты, финансы и команда с настройкой доступа — готово к работе с первого дня.', 'Ваши данные видите только вы', 'Каждая компания работает в своём защищённом пространстве'],
  invite: ['Добро пожаловать в команду', 'Ваши клиенты, сделки и задачи уже ждут вас. Осталось придумать пароль.', 'Всё под рукой с первого входа', 'Доступ — только по личному паролю'],
  reset: ['Новый пароль', 'Задайте новый пароль — и продолжайте работу с того места, где остановились.', 'Ваши данные в безопасности', 'Доступ — только по личному паролю'],
};
const authArt = k => { const [h, p, big, small] = ART[k]; return `<div class="authart"><div class="logo" style="padding:0"><span class="mk" style="background:rgba(255,255,255,.2)">${I('orbit')}</span><div><b>${BRAND}</b><small style="color:rgba(255,255,255,.85)">CRM для бизнеса</small></div></div>
  <h1>${h}</h1><p>${p}</p>
  <div class="mini"><small>Защищённый вход</small><div style="display:flex;align-items:center;gap:8px;margin-top:6px">${I('lock')}<b>Данные под замком</b></div>
  <svg class="wave" viewBox="0 0 300 90" preserveAspectRatio="none"><defs><linearGradient id="la" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M0 70 C30 60 50 72 80 55 S130 40 160 48 210 20 240 28 280 10 300 14 V90 H0Z" fill="url(#la)"/><path d="M0 70 C30 60 50 72 80 55 S130 40 160 48 210 20 240 28 280 10 300 14" fill="none" stroke="#fff" stroke-width="3"/></svg></div></div>`; };
let CFG = null;
async function config() { if (!CFG) { try { CFG = await (await fetch('/api/config')).json(); } catch { CFG = { register: false }; } } return CFG; }
const authShell = (k, form) => `<div class="auth"><button class="authback" data-act="to-land">${I('back')}На главную</button><button class="ib auththeme" data-act="theme" aria-label="Сменить тему">${I(theme() === 'dark' ? 'sun' : 'moon')}</button><div class="authc glass">${authArt(k)}${form}</div></div>`;
async function showLogin(msg) {
  const { register } = await config();
  document.title = 'Вход — ' + BRAND;
  $('#root').innerHTML = authShell('login', `<form class="authf" id="lf" autocomplete="on"><h2 style="font-size:24px">Вход в Орбиту</h2><p class="sub" style="margin-top:-6px">Рады видеть вас снова</p>
  <label>Email<input name="email" type="email" autocomplete="username" required></label>
  <label>Пароль<input name="password" type="password" autocomplete="current-password" required></label>
  <p class="err" id="le">${esc(msg || '')}</p><button class="btn p" type="submit">Войти</button>
  ${register ? `<div class="or"><span>или</span></div><button class="btn" type="button" data-act="register">Зарегистрироваться</button>` : ''}
  <p class="sub" style="font-size:13px">Сотрудникам доступ открывает директор — приглашение придёт на почту.</p></form>`);
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault(); const b = e.target.querySelector('button[type=submit]'); b.disabled = true;
    try { await api('POST', 'login', Object.fromEntries(new FormData(e.target))); await startApp(); }
    catch (er) { $('#le').textContent = er.message; b.disabled = false; }
  });
  setTimeout(() => $('#lf [name=email]')?.focus(), 50);
}
// ИНН: 10 цифр у организации или 12 у ИП
const innOk = v => /^(\d{10}|\d{12})$/.test(v);
// Телефон: всегда +7, ровно 11 цифр. 8… превращается в +7…, 9… — в +7 9…
function fmtPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1); else if (d[0] !== '7') d = '7' + d;
  d = d.slice(0, 11);
  let r = '+7';
  if (d.length > 1) r += ' (' + d.slice(1, 4);
  if (d.length >= 4) r += ')';
  if (d.length > 4) r += ' ' + d.slice(4, 7);
  if (d.length > 7) r += '-' + d.slice(7, 9);
  if (d.length > 9) r += '-' + d.slice(9, 11);
  return r;
}
const phoneOk = v => String(v || '').replace(/\D/g, '').length === 11;
// Ввод телефона: «+7» ставится сам, первая 8 (или 7) всегда считается началом номера и превращается в +7
const fmtRest = r => '+7 (' + r.slice(0, 3) + (r.length >= 3 ? ')' : '') + (r.length > 3 ? ' ' + r.slice(3, 6) : '') + (r.length > 6 ? '-' + r.slice(6, 8) : '') + (r.length > 8 ? '-' + r.slice(8, 10) : '');
function bindPhone(inp) {
  const restOf = v => { const d = String(v || '').replace(/\D/g, ''); return v.trim().startsWith('+7') ? d.slice(1) : d; };
  let prev = restOf(inp.value), dropped = !!prev;
  const end = () => { const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch {} };
  inp.addEventListener('input', e => {
    const del = !!(e.inputType && e.inputType.startsWith('delete'));
    let v = inp.value;
    const had = v.includes('+7');
    if (had) v = v.replace('+7', '');
    let rest = v.replace(/\D/g, '');
    if (!had) { if (!dropped && (rest[0] === '8' || rest[0] === '7')) { rest = rest.slice(1); dropped = true; } }
    else if (!del && !dropped && prev === '' && (rest[0] === '8' || rest[0] === '7')) { rest = rest.slice(1); dropped = true; }
    if (rest.length > 10 && (rest[0] === '8' || rest[0] === '7')) rest = rest.slice(1);
    if (del && rest === prev) rest = rest.slice(0, -1);
    rest = rest.slice(0, 10);
    inp.value = rest ? fmtRest(rest) : (del ? '' : '+7 (');
    if (rest) dropped = true; else if (del) dropped = false;
    prev = rest; end();
  });
  inp.addEventListener('focus', () => { if (!inp.value) { inp.value = '+7 ('; prev = ''; } setTimeout(end, 0); });
  inp.addEventListener('blur', () => { if (!restOf(inp.value)) { inp.value = ''; prev = ''; dropped = false; } });
}
const MAX_FILES = 5, MAX_MB = window.CRM_MAX_FILE_MB || 10, DOC_EXT = /\.(pdf|jpe?g|png|docx?)$/i;
const fsize = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ';
const PLANS = [
  { id: 'm1', name: '1 месяц', months: 1, price: 2990 },
  { id: 'm6', name: '6 месяцев', months: 6, price: 2790 * 6 },
  { id: 'y1', name: '12 месяцев', months: 12, price: 2390 * 12 },
];
PLANS.forEach(p => { p.save = PLANS[0].price * p.months - p.price; });
const planOf = id => PLANS.find(p => p.id === id) || PLANS[2];
const LEGAL_TITLES = { consent: 'Согласие на обработку персональных данных', privacy: 'Политика конфиденциальности', offer: 'Договор-оферта' };
function openLegal(k) {
  const L = (window.LEGAL || {})[k] || '';
  openModal(`<h2>${LEGAL_TITLES[k]}</h2><div class="legal">${L || '<p class="sub">Текст документа ещё не добавлен.</p>'}</div><div class="acts"><button class="btn p" data-close>Понятно</button></div>`);
}
let REG = null;
async function showRegister() { await config(); REG = REG || { step: 1, f: {}, files: [], plan: 'y1' }; renderReg(); }
const regLogin = `<p class="alt">Уже есть аккаунт? <button type="button" class="lnk" data-act="to-login">Войти</button></p>`;
const STEP_NAMES = ['данные компании', 'документы', 'выбор тарифа'];
function renderReg(err = '') {
  document.title = 'Регистрация — ' + BRAND;
  const f = REG.f, steps = `<div class="steps">${[1, 2, 3].map(n => `${n > 1 ? '<i></i>' : ''}<span class="${REG.step === n ? 'on' : REG.step > n ? 'ok' : ''}">${n}</span>`).join('')}<em>Шаг ${REG.step} из 3 · ${STEP_NAMES[REG.step - 1]}</em></div>`;
  const v = k => esc(f[k] || '');
  let body;
  if (REG.step === 1) body = `<form class="authf" id="rf" autocomplete="on" novalidate><h2 style="font-size:24px">Регистрация компании</h2>${steps}
   ${[['company', 'Название компании', 'maxlength="100" autocomplete="organization"'], ['inn', 'ИНН', 'inputmode="numeric" maxlength="12" placeholder="10 цифр у организации или 12 у ИП"'],
      ['name', 'Ваше имя и фамилия', 'maxlength="100" autocomplete="name"'], ['phone', 'Телефон', 'type="tel" inputmode="tel" maxlength="18" autocomplete="tel" placeholder="+7 (900) 000-00-00"'],
      ['email', 'Email — он станет вашим логином', 'type="email" autocomplete="email"']]
     .map(([k, l, a]) => `<label>${l}<input name="${k}" value="${v(k)}" ${a} aria-describedby="e_${k}"><small class="ferr" id="e_${k}">${REG.ferr && REG.ferr[0] === k ? esc(REG.ferr[1]) : ''}</small></label>`).join('')}
   <div class="consent"><input type="checkbox" name="consent" id="cons" ${f.consent ? 'checked' : ''} aria-describedby="e_consent"><span><label for="cons" style="display:inline;font:inherit;color:inherit">Заполняя форму, даю</label> <button type="button" class="lnk u" data-legal="consent">согласие</button> на обработку персональных данных, принимаю <button type="button" class="lnk u" data-legal="privacy">политику конфиденциальности</button> и <button type="button" class="lnk u" data-legal="offer">условия оферты</button></span></div>
   <small class="ferr" id="e_consent">${REG.ferr && REG.ferr[0] === 'consent' ? esc(REG.ferr[1]) : ''}</small>
   <p class="err" id="re">${esc(err)}</p><button class="btn p" type="submit">Далее: документы</button>${regLogin}</form>`;
  else if (REG.step === 2) body = `<form class="authf" id="rf2"><h2 style="font-size:24px">Документы компании</h2>${steps}
   <p class="sub" style="margin:0">Прикрепите выписку из ЕГРЮЛ или ЕГРИП, свидетельство ИНН или карточку предприятия.</p>
   <label class="drop" id="drop">${I('upload')}<b>Перетащите файлы сюда или нажмите, чтобы выбрать</b><span>PDF, JPG, PNG, DOC — до ${MAX_FILES} файлов, каждый до ${MAX_MB} МБ</span><input type="file" id="fi" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"></label>
   ${REG.files.length ? `<div class="flist">${REG.files.map((x, i) => `<div>${I('contracts')}<span>${esc(x.name)}<small>${fsize(x.size)}</small></span><button type="button" class="ib" data-rmf="${i}" aria-label="Убрать файл ${esc(x.name)}">${I('x')}</button></div>`).join('')}</div>` : ''}
   <p class="err" id="re">${esc(err)}</p>
   <div class="acts" style="margin:0"><button class="btn" type="button" data-regback>Назад</button><button class="btn p" type="submit" style="flex:1">Далее</button></div>${regLogin}</form>`;
  else {
    const p = planOf(REG.plan);
    body = `<form class="authf" id="rf3"><h2 style="font-size:24px">Выберите тариф</h2>${steps}
   <p class="sub" style="margin:0">Все возможности Орбиты в любом тарифе: сделки, задачи, финансы, сотрудники без ограничений.</p>
   <div class="plans" role="radiogroup" aria-label="Тариф">${PLANS.map(x => `<label class="plan ${REG.plan === x.id ? 'on' : ''}"><input type="radio" name="plan" value="${x.id}" ${REG.plan === x.id ? 'checked' : ''}>
     ${x.id === 'y1' ? '<em class="best">Выгоднее всего</em>' : x.id === 'm6' ? '<em>Популярный</em>' : ''}<b>${x.name}</b><span class="pr">${rub(x.price)}</span>
     <small>${rub(Math.round(x.price / x.months))} в месяц</small><small class="sv">${x.save ? 'Экономия ' + rub(x.save) : 'Без обязательств'}</small></label>`).join('')}</div>
   <p class="err" id="re">${esc(err)}</p>
   <div class="acts" style="margin:0"><button class="btn" type="button" data-regback>Назад</button><button class="btn p" type="submit" style="flex:1">Отправить заявку</button></div>${regLogin}</form>`;
  }
  $('#root').innerHTML = authShell('reg', body);
  document.querySelectorAll('[data-legal]').forEach(b => b.addEventListener('click', () => openLegal(b.dataset.legal)));
  document.querySelector('[data-regback]')?.addEventListener('click', () => { REG.step--; renderReg(); });
  if (REG.step === 1) {
    const form = $('#rf');
    bindPhone(form.phone);
    form.inn.addEventListener('input', () => { form.inn.value = form.inn.value.replace(/\D/g, '').slice(0, 12); });
    const showErr = (k, m) => {
      form.querySelectorAll('.ferr').forEach(x => x.textContent = ''); form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
      if (!k) return; $('#e_' + k).textContent = m; form[k].setAttribute('aria-invalid', 'true'); form[k].focus();
    };
    form.querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', () => { if (i.getAttribute('aria-invalid')) { i.removeAttribute('aria-invalid'); $('#e_' + i.name).textContent = ''; } }));
    form.addEventListener('submit', e => {
      e.preventDefault(); const x = Object.fromEntries(new FormData(form));
      Object.assign(REG.f, x); REG.f.consent = !!x.consent; REG.ferr = null; $('#re').textContent = '';
      const chk = [
        ['company', !x.company.trim(), 'Укажите название компании'],
        ['inn', !innOk(x.inn), 'ИНН — это 10 цифр у организации или 12 цифр у ИП'],
        ['name', !x.name.trim(), 'Укажите имя и фамилию'],
        ['phone', !phoneOk(x.phone), 'Введите номер полностью: +7 и ещё 10 цифр'],
        ['email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email.trim()), 'Проверьте email: например, name@company.ru'],
        ['consent', !x.consent, 'Чтобы продолжить, подтвердите согласие'],
      ].find(c => c[1]);
      if (chk) return showErr(chk[0], chk[2]);
      REG.step = 2; renderReg();
    });
    if (REG.ferr) { const k = REG.ferr[0]; setTimeout(() => { form[k]?.setAttribute('aria-invalid', 'true'); form[k]?.focus(); }, 50); }
    else setTimeout(() => form.company.focus(), 50);
    return;
  }
  if (REG.step === 2) {
    const add = async list => {
      let e = '';
      for (const file of list) {
        if (REG.files.length >= MAX_FILES) { e = `Можно прикрепить не больше ${MAX_FILES} файлов`; break; }
        if (!DOC_EXT.test(file.name)) { e = `Файл «${file.name}» не подходит: нужен PDF, JPG, PNG или DOC`; continue; }
        if (file.size > MAX_MB * 1048576) { e = `Файл «${file.name}» больше ${MAX_MB} МБ`; continue; }
        const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(file); });
        REG.files.push({ name: file.name, type: file.type, size: file.size, data });
      }
      renderReg(e);
    };
    $('#fi').addEventListener('change', e => add([...e.target.files]));
    const dz = $('#drop');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); add([...e.dataTransfer.files]); });
    document.querySelectorAll('[data-rmf]').forEach(b => b.addEventListener('click', () => { REG.files.splice(+b.dataset.rmf, 1); renderReg(); }));
    $('#rf2').addEventListener('submit', e => { e.preventDefault(); if (!REG.files.length) return renderReg('Прикрепите хотя бы один документ компании'); REG.step = 3; renderReg(); });
    return;
  }
  const form = $('#rf3');
  form.addEventListener('change', e => {
    if (e.target.name === 'plan') REG.plan = e.target.value;
    form.querySelectorAll('.plan').forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const b = form.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Отправляем…';
    try {
      const { consent, ...f } = REG.f;
      const r = await api('POST', 'register', { ...f, consent: !!consent, plan: REG.plan, files: REG.files.map(({ name, type, data }) => ({ name, type, data })) });
      const done = { ...REG.f, plan: REG.plan }; REG = null;
      if (r.approved) { await startApp(); if (r.password) openModal(`<h2>Ваш пароль для входа</h2><p class="sub">Вы первый пользователь Орбиты и стали её владельцем. Сохраните пароль — его можно сменить в «Настройках».</p><div class="copy"><input value="${esc(r.password)}" readonly></div><div class="acts"><button class="btn p" data-close>Сохранил(а)</button></div>`); return; }
      showSent(done);
    } catch (er) {
      const m = er.message, k = /ИНН/.test(m) ? 'inn' : /email/i.test(m) ? 'email' : /телефон/i.test(m) ? 'phone' : /согласи/i.test(m) ? 'consent' : /компании/.test(m) && !/документ/i.test(m) ? 'company' : /имя/.test(m) ? 'name' : null;
      if (k) { REG.step = 1; REG.ferr = [k, m]; renderReg(); } else if (/файл|документ/i.test(m)) { REG.step = 2; renderReg(m); } else renderReg(m);
    }
  });
}
function showSent(f) {
  document.title = 'Заявка отправлена — ' + BRAND;
  $('#root').innerHTML = authShell('reg', `<div class="authf sent"><span class="okic">${I('orbit')}</span><h2 style="font-size:26px">Заявка отправлена!</h2>
   <p>Спасибо, ${esc(String(f.name || '').split(' ')[0])}! Мы получили вашу заявку.</p>
   <p class="note">В ближайшее время с вами свяжется менеджер для согласования оплаты.</p>
   <p class="alt">Уже есть аккаунт? <button type="button" class="lnk" data-act="to-login">Войти</button></p></div>`);
}
async function showInvite(tok) {
  let info;
  try { info = await api('GET', 'invite?token=' + encodeURIComponent(tok)); }
  catch (e) { history.replaceState(null, '', '/'); return showLogin(e.message); }
  document.title = 'Пароль — ' + BRAND;
  $('#root').innerHTML = `<div class="auth"><button class="ib auththeme" data-act="theme" aria-label="Сменить тему">${I(theme() === 'dark' ? 'sun' : 'moon')}</button>
  <div class="authc glass">${authArt(info.reset ? 'reset' : 'invite')}
  <form class="authf" id="inf"><h2 style="font-size:24px">Здравствуйте, ${esc(info.name)}!</h2>
  <p class="sub" style="margin-top:-6px">${info.reset ? 'Задайте новый пароль для входа.' : 'Придумайте пароль — после этого ваш личный кабинет станет активным.'}</p>
  <label>Логин<input value="${esc(info.email)}" readonly autocomplete="username"></label>
  <label>Пароль<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
  <label>Повторите пароль<input name="password2" type="password" autocomplete="new-password" minlength="8" required></label>
  <p class="sub" style="font-size:13px">Не короче 8 символов, буквы и цифры.</p>
  <p class="err" id="ie"></p><button class="btn p" type="submit">${info.reset ? 'Сохранить пароль' : 'Активировать кабинет'}</button></form></div></div>`;
  $('#inf').addEventListener('submit', async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (f.password !== f.password2) return $('#ie').textContent = 'Пароли не совпадают';
    try { await api('POST', 'invite', { token: tok, password: f.password }); history.replaceState(null, '', '/'); await startApp(); toast('Кабинет активирован'); }
    catch (er) { $('#ie').textContent = er.message; }
  });
}

// ---------- каркас ----------
const NAV = [['dashboard', 'Дашборд'], ['deals', 'Сделки'], ['contacts', 'Клиенты'], ['products', 'Товары'], ['tasks', 'Задачи'], ['mail', 'Почта'], ['contracts', 'Договоры'], ['finance', 'Финансы'], ['kb', 'База знаний'], ['team', 'Сотрудники'], ['requests', 'Заявки'], ['profile', 'Настройки']];
const allowed = v => v === 'requests' ? !!D.me.platform : v === 'deal' ? can('deals') : v === 'profile' || (v === 'team' ? !!P().team : can(v));
// верхняя панель: часы, рабочий день, профиль, тариф, помощь
const clockNow = () => { const d = new Date(); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
setInterval(() => { const c = $('#tclk'); if (c) c.textContent = clockNow(); }, 5000);
const WORK = { off: ['Начать день', ''], on: ['Работаю', 'on'], pause: ['Перерыв', 'pause'] };
const workBtn = () => { const st = D.me.work_state || 'off', since = D.me.work_since ? new Date(D.me.work_since) : null; return `<button class="twork ${WORK[st][1]}" data-act="work" aria-haspopup="menu" title="${st === 'off' ? 'Отметить начало рабочего дня' : 'Рабочий день начат в ' + p2(since.getHours()) + ':' + p2(since.getMinutes())}"><i></i>${WORK[st][0]}</button>`; };
function popMenu(anchor, html, mount) {
  $('#tpop')?.remove();
  const r = anchor.getBoundingClientRect(), m = document.createElement('div');
  m.id = 'tpop'; m.className = 'tpop'; m.setAttribute('role', 'menu'); m.innerHTML = html; document.body.appendChild(m);
  const w = m.offsetWidth; m.style.top = (r.bottom + 8) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  mount && mount(m); m.querySelector('button,a')?.focus();
}
document.addEventListener('mousedown', e => { const m = $('#tpop'); if (m && !m.contains(e.target) && !e.target.closest('[data-act=work],[data-act=umenu]')) m.remove(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#tpop')) { $('#tpop').remove(); e.stopImmediatePropagation(); } }, true);
async function setWork(st) {
  $('#tpop')?.remove();
  try { const r = await api('POST', 'work', { state: st }); Object.assign(D.me, r); render(); toast({ on: 'Рабочий день начат. Хорошего дня!', pause: 'Перерыв', off: 'Рабочий день завершён' }[st]); } catch (e) { fail(e); }
}
function workMenu(a) {
  if ($('#tpop')) return $('#tpop').remove();
  const st = D.me.work_state || 'off', since = D.me.work_since ? new Date(D.me.work_since) : null;
  const mins = since ? Math.floor((Date.now() - since) / 60000) : 0;
  const opts = st === 'off' ? [['on', 'Начать рабочий день']] : st === 'on' ? [['pause', 'Сделать перерыв'], ['off', 'Завершить рабочий день']] : [['on', 'Продолжить работу'], ['off', 'Завершить рабочий день']];
  popMenu(a, `${since ? `<div class="tph">День начат в ${p2(since.getHours())}:${p2(since.getMinutes())} · ${Math.floor(mins / 60)} ч ${mins % 60} мин</div>` : '<div class="tph">Рабочий день ещё не начат</div>'}${opts.map(([k, l]) => `<button role="menuitem" data-ws="${k}">${l}</button>`).join('')}`,
    m => m.querySelectorAll('[data-ws]').forEach(b => b.addEventListener('click', () => setWork(b.dataset.ws))));
}
function userMenu(a) {
  if ($('#tpop')) return $('#tpop').remove();
  popMenu(a, `<div class="tph"><b>${esc(D.me.name)}</b><br>${esc(D.me.email)}</div>
    <button role="menuitem" data-um="ava">${I('user')}${AVA[D.me.id] ? 'Сменить фото' : 'Загрузить фото'}</button>
    <a role="menuitem" href="#profile">${I('profile')}Настройки и пароль</a>
    ${D.tariff ? `<button role="menuitem" data-um="tariff">${I('bag')}Мой тариф</button>` : ''}
    <button role="menuitem" data-um="theme">${I(theme() === 'dark' ? 'sun' : 'moon')}${theme() === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</button>
    <button role="menuitem" data-um="logout" class="bad">${I('logout')}Выйти</button>`, m => {
    m.querySelector('a').addEventListener('click', () => m.remove());
    m.querySelector('[data-um=ava]').addEventListener('click', () => { m.remove(); pickAvatar(); });
    m.querySelector('[data-um=tariff]')?.addEventListener('click', () => { m.remove(); openTariff(); });
    m.querySelector('[data-um=theme]').addEventListener('click', () => { m.remove(); setTheme(theme() === 'dark' ? 'light' : 'dark'); });
    m.querySelector('[data-um=logout]').addEventListener('click', () => { m.remove(); document.querySelector('.rail [data-act=logout]')?.click(); });
  });
}
// фото профиля: выбираем картинку, обрезаем по центру в квадрат 160×160
function pickAvatar() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files[0]; if (f) setAvatarFile(f); };
  inp.click();
}
async function setAvatarFile(f) {
  if (!/^image\//.test(f.type)) return toast('Выберите картинку: JPG, PNG или HEIC с телефона');
  if (f.size > 25 * 1048576) return toast('Фото больше 25 МБ');
  try {
    const url = URL.createObjectURL(f), img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Это фото не открылось. Попробуйте JPG или PNG')); i.src = url; });
    const n = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 160;
    c.getContext('2d').drawImage(img, (img.naturalWidth - n) / 2, (img.naturalHeight - n) / 2, n, n, 0, 0, 160, 160); URL.revokeObjectURL(url);
    const data = c.toDataURL('image/jpeg', 0.86), r = await api('POST', 'avatar', { data });
    D.me.avatar = r.avatar; AVA[D.me.id] = r.avatar; toast('Фото профиля обновлено'); await load(); render();
  } catch (e) { toast(e.message || 'Не получилось загрузить фото'); }
}
async function removeAvatar() {
  try { await api('POST', 'avatar', { data: null }); delete AVA[D.me.id]; D.me.avatar = null; toast('Фото удалено'); await load(); render(); } catch (e) { fail(e); }
}
function openTariff() {
  const t = D.tariff || {}, cur = t.plan ? planOf(t.plan) : null, left = t.paid_until ? Math.ceil((t.paid_until - Date.now()) / 864e5) : null;
  openModal(`<h2>Мой тариф</h2>
    ${t.owner ? '<p class="note">Вы владелец Орбиты: для вашей компании ограничений нет.</p>' : cur ? `<div class="tarcur"><div><span class="sub">Текущий тариф</span><b>${esc(cur.name)}</b></div><div><span class="sub">Оплачен до</span><b class="${left != null && left <= 7 ? 'tbad' : ''}">${fd(dstr(new Date(t.paid_until)))}</b>${left != null ? `<small class="sub">${left > 0 ? 'осталось ' + pl(left, ['день', 'дня', 'дней']) : 'срок закончился'}</small>` : ''}</div></div>` : '<p class="note">Тариф пока не указан. Менеджер Орбиты свяжется с вами, чтобы согласовать оплату.</p>'}
    <div class="sub" style="font-size:13px;font-weight:600">Тарифы</div>
    <div class="tarl">${PLANS.map(p => `<div class="tari ${cur && p.id === t.plan ? 'on' : ''}"><b>${esc(p.name)}</b><span>${rub(p.price)}</span>${p.months > 1 ? `<small class="sub">${rub(p.price / p.months)} в месяц</small>` : ''}</div>`).join('')}</div>
    <p class="sub" style="font-size:13px;margin:0">Чтобы продлить или сменить тариф, напишите менеджеру Орбиты — оплату он проведёт сам.</p>
    <div class="acts"><span class="sp"></span><button class="btn p" data-close>Понятно</button></div>`, dlg => dlg.querySelector('[data-close]').addEventListener('click', closeModal));
}
function openHelp() {
  openModal(`<h2>Помощь</h2><div class="helpl">
    <div><b>Поиск</b><span>Строка поиска вверху ищет сразу по сделкам, клиентам, товарам, задачам и базе знаний. Enter открывает первый результат.</span></div>
    <div><b>Сделки</b><span>Карточки двигаются мышкой между этапами. Клик по сделке открывает окно с историей, делами, товарами и оплатой. Esc закрывает окно.</span></div>
    <div><b>Правка на месте</b><span>В карточке сделки щёлкните по сумме, комментарию или полю — его можно сразу изменить.</span></div>
    <div><b>Файлы и скриншоты</b><span>В комментарий скриншот вставляется сочетанием Ctrl+V (на Mac — Cmd+V), файлы можно перетащить мышкой.</span></div>
    <div><b>Рабочий день</b><span>Кнопка рядом с часами отмечает начало дня, перерыв и конец дня — директор видит это в разделе «Сотрудники».</span></div>
    <div><b>Тема</b><span>Светлая или тёмная — в меню профиля справа вверху.</span></div></div>
    <div class="acts"><span class="sp"></span><button class="btn p" data-close>Понятно</button></div>`, dlg => dlg.querySelector('[data-close]').addEventListener('click', closeModal));
}
function shell() {
  const open = D.deals.filter(d => kindOf(d) === 'open').length;
  const myOpenTasks = D.tasks.filter(t => !t.done && (!t.resp_id || t.resp_id === D.me.id)).length;
  const counts = { deals: open, tasks: myOpenTasks, requests: (D.requests || []).filter(r => r.status === 'new').length, mail: MB.unseen };
  const cur = VIEW === 'deal' ? BASE : VIEW, items = NAV.filter(n => allowed(n[0]));
  return `<div class="shell"><div class="scrim" data-act="burger"></div>
  <aside class="rail" id="side" aria-label="Разделы">
   <a class="mk" href="#dashboard" title="Орбита" aria-label="Орбита — на главную"><span class="mko"><svg class="ologo" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8cff"/><stop offset="1" stop-color="#b06bff"/></linearGradient></defs><circle cx="20" cy="21" r="5.5" fill="url(#og)"/><path d="M17.6 35.6A14.5 14.5 0 0 0 33.8 13.6" fill="none" stroke="url(#og)" stroke-width="4" stroke-linecap="round"/><path d="M22.4 6.4A14.5 14.5 0 0 0 6.2 28.4" fill="none" stroke="url(#og)" stroke-width="4" stroke-linecap="round"/><circle cx="33" cy="9" r="3.6" fill="url(#og)"/><circle cx="7" cy="33" r="3.6" fill="url(#og)"/></svg></span><span class="mkt" aria-hidden="true">рбита</span></a>
   <nav class="rnav">${items.map(n => `<a href="#${n[0]}" class="${cur === n[0] ? 'on' : ''}" title="${n[1]}" aria-label="${n[1]}">${I(n[0])}<span class="rl">${n[1]}</span>${counts[n[0]] ? `<em>${counts[n[0]]}</em>` : ''}</a>`).join('')}</nav>
   <div class="sp"></div>
   <button class="rb" data-act="theme" data-v="${theme() === 'dark' ? 'light' : 'dark'}" title="${theme() === 'dark' ? 'Светлая тема' : 'Тёмная тема'}" aria-label="Сменить тему">${I(theme() === 'dark' ? 'sun' : 'moon')}<span class="rl">${theme() === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span></button>
   <button class="rb" data-act="logout" title="Выйти" aria-label="Выйти">${I('logout')}<span class="rl">Выйти</span></button>
  </aside>
  <div class="main">
   <header class="topnav tbar"><button class="tb burger" data-act="burger" aria-label="Меню">${I('menu')}</button>
    <label class="tsearch" title="Поиск">${I('search')}<input id="q" type="search" placeholder="Поиск" value="${esc(Q)}" aria-label="Поиск по CRM"></label>
    <div class="tclock"><b id="tclk">${clockNow()}</b>${workBtn()}</div>
    <span class="tsp"></span>
    <button class="tuser" data-act="umenu" aria-haspopup="menu" aria-label="Меню профиля">${avatar(D.me.name, D.me.id, 's')}<span class="tun"><b>${esc(D.me.name)}</b><small>${esc(D.company)}</small></span>${I('down')}</button>
    ${P().team ? `<button class="tpill tinv" data-act="invite" title="Пригласить сотрудника">${I('plus')}<span>Пригласить</span></button>` : ''}
    <button class="thelp" data-act="help" title="Помощь" aria-label="Помощь">?</button>
   </header>
   <nav class="tnav tsub" aria-label="Разделы">${items.map(n => `<a href="#${n[0]}" class="${cur === n[0] ? 'on' : ''}">${n[1]}</a>`).join('')}</nav>
   <main class="view" id="view"></main></div></div>`;
}
// доска сделок тянется до низа экрана, чтобы полоса прокрутки была в самом низу
function fitBoard() { const b = $('#view .board'); if (!b) return; if (innerWidth <= 900) { b.style.height = ''; return; } const top = b.getBoundingClientRect().top + scrollY; b.style.height = Math.max(360, innerHeight - top - 14) + 'px'; }
addEventListener('resize', () => fitBoard());
function render() {
  if (!D) return;
  if (!allowed(VIEW)) VIEW = NAV.find(n => allowed(n[0]))[0];
  const bl = $('.board')?.scrollLeft || 0, qFocus = document.activeElement?.id === 'q', sel = qFocus ? document.activeElement.selectionStart : 0;
  OBS.forEach(o => o.disconnect()); OBS = [];
  const dsc = $('#dpane .dpanel')?.scrollTop || 0;
  $('#root').innerHTML = shell();
  const after = [];
  $('#view').innerHTML = VIEWS[VIEW === 'deal' ? BASE : VIEW](after);
  // сделка открывается во всплывающей панели поверх текущего раздела
  if (VIEW === 'deal' && DEAL) {
    const pane = document.createElement('div'); pane.id = 'dpane'; pane.className = 'dov' + (DEAL.anim ? ' in' : '');
    pane.innerHTML = `<div class="dscrim" data-act="deal-close"></div><div class="dwrap"><button class="dx" data-act="deal-close" title="Закрыть (Esc)" aria-label="Закрыть сделку">${I('x')}</button><div class="dpanel" role="dialog" aria-modal="true" aria-label="Сделка">${VIEWS.deal(after)}</div></div>`;
    $('#root').appendChild(pane); pane.querySelector('.dpanel').scrollTop = dsc;
    if (DEAL.anim) { DEAL.anim = false; setTimeout(() => pane.querySelector('.dx')?.focus({ preventScroll: true }), 30); }
    document.documentElement.classList.add('dopen');
  } else document.documentElement.classList.remove('dopen');
  after.forEach(f => f());
  // права сотрудника: прячем то, что ему делать нельзя (сервер всё равно проверит)
  const rm = sel => document.querySelectorAll(sel).forEach(b => b.remove());
  document.querySelectorAll(':is(#view,#dpane) [data-act=new]').forEach(b => { if (!may(SEC_OF[b.dataset.e], 'c')) b.remove(); });
  if (!may('deals', 'c')) rm(':is(#view,#dpane) [data-act=new-deal],:is(#view,#dpane) .qadd');
  if (!may('deals', 'e')) { rm(':is(#view,#dpane) [data-act=edit][data-e=deals].btn,:is(#view,#dpane) [data-act=edit][data-e=deals].lnk'); document.querySelectorAll(':is(#view,#dpane) .chev').forEach(b => b.disabled = true); document.querySelectorAll(':is(#view,#dpane) .dc').forEach(c => c.draggable = false); }
  if (!may('deals', 'd')) rm(':is(#view,#dpane) [data-act=deal-del]');
  if (!may('tasks', 'c')) rm(':is(#view,#dpane) [data-act=deal-task]');
  if (!may('tasks', 'e')) document.querySelectorAll(':is(#view,#dpane) [data-act=done]').forEach(c => c.disabled = true);
  if (!may('contacts', 'e')) rm(':is(#view,#dpane) [data-act=edit][data-e=contacts].lnk');
  if (!may('kb', 'c')) rm('#view [data-act=kb-new]');
  if (!may('stages', 'c')) rm(':is(#view,#dpane) [data-act=stage-new]');
  if (!may('stages', 'e') && !may('stages', 'd')) rm(':is(#view,#dpane) [data-act=stage]');
  if (VIEW === 'deal' && DEAL) { const m = DEAL.mode || 'task'; if ((m === 'comment' && !may('deals', 'e')) || (m === 'task' && !may('tasks', 'c')) || (m === 'ztask' && !may('tasks', 'c'))) { const cf = $('#cf'); if (cf) cf.outerHTML = '<p class="sub">У вас нет права добавлять ' + (m === 'comment' ? 'комментарии' : 'задачи') + ' в сделке.</p>'; } }
  if (VIEW === 'deal') dfHydrate();
  fitBoard();
  if ($('.board')) $('.board').scrollLeft = bl;
  if (qFocus) { const q = $('#q'); q.focus(); q.setSelectionRange(sel, sel); }
  if (VIEW !== 'deal') document.title = (NAV.find(n => n[0] === VIEW) || [, 'CRM'])[1] + ' — ' + D.company;
}
function route() {
  const h = location.hash.slice(1) || 'dashboard', m = h.match(/^deal-(\d+)$/), was = VIEW;
  if (m) {
    if (VIEW !== 'deal') BASE = D && allowed(VIEW) && VIEW !== 'profile' ? VIEW : 'deals';
    VIEW = 'deal';
    if (!DEAL || DEAL.id !== +m[1]) { DEAL = { id: +m[1], ev: [], att: [], anim: true }; loadEvents(); }
  } else { DEAL = null; VIEW = NAV.some(n => n[0] === h) ? h : 'dashboard'; }
  const keep = (VIEW === 'deal' && was !== 'deal' && BASE === was) || (was === 'deal' && VIEW === BASE) || (VIEW === 'deal' && was === 'deal');
  if (!keep && !KEEPQ) Q = ''; KEEPQ = false;
  $('#side')?.classList.remove('open'); render();
  if (!keep) window.scrollTo(0, 0);
}

// ---------- графики ----------
function niceMax(v) { if (v <= 0) return 1; const e = 10 ** Math.floor(Math.log10(v)), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; }
function smooth(p, base) {
  if (!p.length) return ''; let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += ` C${b[0] + (c[0] - a[0]) / 6},${Math.min(base, b[1] + (c[1] - a[1]) / 6)} ${c[0] - (e[0] - b[0]) / 6},${Math.min(base, c[1] - (e[1] - b[1]) / 6)} ${c[0]},${c[1]}`;
  }
  return d;
}
function areaChart(id, labels, vals, fmt) {
  return () => {
    const fig = $('#' + id); if (!fig) return;
    const svg = fig.querySelector('svg'), tip = fig.querySelector('.tip');
    const draw = () => {
      const W = fig.clientWidth, H = fig.clientHeight; if (!W) return;
      const narrow = W < 520, L = narrow ? 6 : 52, R = 10, T = 14, B = 26, n = vals.length, mx = niceMax(Math.max(...vals, 0));
      const x = i => L + (n < 2 ? 0 : i * (W - L - R) / (n - 1)), y = v => T + (H - T - B) * (1 - v / mx), base = H - B;
      const pts = vals.map((v, i) => [x(i), y(v)]), line = smooth(pts, base);
      let g = '';
      for (let k = 0; k <= 4; k++) { const v = mx * k / 4, yy = y(v); g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/>` + (narrow || (mx === 1 && k > 0 && !vals.some(v => +v > 0)) ? '' : `<text x="${L - 10}" y="${yy + 4}" text-anchor="end" style="fill:var(--mu);font-size:11px">${esc(fmt(v, 1))}</text>`); }
      const step = Math.max(1, Math.ceil(n / (narrow ? 4 : 7)));
      labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" style="fill:var(--mu);font-size:11px">${esc(l)}</text>`; });
      svg.innerHTML = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.38"/><stop offset="1" style="stop-color:var(--acc2);stop-opacity:0"/></linearGradient>
        <linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--acc)"/><stop offset="1" style="stop-color:var(--acc2)"/></linearGradient></defs>${g}
        <path d="${line} L${x(n - 1)},${base} L${x(0)},${base} Z" fill="url(#${id}g)"/><path d="${line}" fill="none" stroke="url(#${id}l)" stroke-width="3" stroke-linecap="round"/>
        <line class="hl" y1="${T}" y2="${base}" style="stroke:var(--acc);stroke-dasharray:3 3;display:none"/><circle class="hd" r="6" style="fill:var(--solid);stroke:var(--acc);stroke-width:3;display:none"/>
        <rect x="${L}" y="0" width="${Math.max(1, W - L - R)}" height="${H}" fill="transparent" class="hov"/>`;
      const hov = svg.querySelector('.hov'), hl = svg.querySelector('.hl'), hd = svg.querySelector('.hd');
      const show = ev => {
        const r = svg.getBoundingClientRect(), px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
        const i = Math.max(0, Math.min(n - 1, Math.round((px - L) / ((W - L - R) / Math.max(1, n - 1)))));
        hl.setAttribute('x1', x(i)); hl.setAttribute('x2', x(i)); hl.style.display = ''; hd.setAttribute('cx', x(i)); hd.setAttribute('cy', y(vals[i])); hd.style.display = '';
        tip.style.display = 'block'; tip.style.left = Math.min(W - 60, Math.max(60, x(i))) + 'px'; tip.style.top = y(vals[i]) + 'px';
        tip.innerHTML = `${esc(labels[i])}<b>${esc(fmt(vals[i]))}</b>`;
      };
      hov.addEventListener('mousemove', show); hov.addEventListener('touchstart', show, { passive: true });
      hov.addEventListener('mouseleave', () => { hl.style.display = hd.style.display = tip.style.display = 'none'; });
    };
    const ro = new ResizeObserver(draw); ro.observe(fig); OBS.push(ro);
  };
}
function barChart(id, labels, series, fmt) {
  return () => {
    const fig = $('#' + id); if (!fig) return;
    const svg = fig.querySelector('svg'), tip = fig.querySelector('.tip');
    const draw = () => {
      const W = fig.clientWidth, H = fig.clientHeight; if (!W) return;
      const narrow = W < 520, L = narrow ? 6 : 52, R = 6, T = 12, B = 26, n = labels.length;
      const mx = niceMax(Math.max(1, ...series.flatMap(s => s.vals))), y = v => T + (H - T - B) * (1 - v / mx);
      const gw = (W - L - R) / n, bw = Math.max(4, Math.min(18, gw / (series.length + 1.2)));
      let g = '';
      for (let k = 0; k <= 4; k++) { const v = mx * k / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)"/>` + (narrow || (mx === 1 && k > 0 && !series.some(x => x.vals.some(v => +v > 0))) ? '' : `<text x="${L - 10}" y="${y(v) + 4}" text-anchor="end" style="fill:var(--mu);font-size:11px">${esc(fmt(v, 1))}</text>`); }
      labels.forEach((l, i) => {
        const cx = L + gw * i + gw / 2;
        series.forEach((s, j) => {
          const v = s.vals[i], bx = cx - (series.length * bw + (series.length - 1) * 4) / 2 + j * (bw + 4), h = Math.max(v ? 3 : 0, H - B - y(v));
          g += `<rect x="${bx}" y="${H - B - h}" width="${bw}" height="${h}" rx="${Math.min(6, bw / 2)}" style="fill:${s.color}" data-t="${esc(l + ': ' + s.name + ' ' + fmt(v))}"/>`;
        });
        if (!narrow || i % 2 === 0) g += `<text x="${cx}" y="${H - 6}" text-anchor="middle" style="fill:var(--mu);font-size:11px">${esc(l)}</text>`;
      });
      svg.innerHTML = g;
      svg.onmousemove = e => { const t = e.target.dataset?.t; if (!t) { tip.style.display = 'none'; return; } const r = fig.getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.textContent = t; };
      svg.onmouseleave = () => tip.style.display = 'none';
    };
    const ro = new ResizeObserver(draw); ro.observe(fig); OBS.push(ro);
  };
}
function donut(items, total, label) {
  const R = 70, C = 2 * Math.PI * R; let off = 0;
  const segs = total ? items.filter(x => x.v > 0).map(x => { const len = x.v / total * C, gap = items.filter(z => z.v > 0).length > 1 ? 3 : 0; const s = `<circle cx="95" cy="95" r="${R}" fill="none" stroke="${x.c}" stroke-width="26" stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-off}"/>`; off += len; return s; }).join('') : '';
  return `<div class="donut"><div class="ring"><svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="${R}" fill="none" style="stroke:var(--hover)" stroke-width="26"/>${segs}</svg><div class="ctr"><b>${total}</b><span>${label}</span></div></div>
  <div class="leg">${items.map(x => `<div><i style="background:${x.c}"></i><span>${esc(x.n)}<small>${total ? Math.round(x.v / total * 1000) / 10 : 0}%${x.extra ? ' · ' + x.extra : ''}</small></span><b>${x.v}</b></div>`).join('')}</div></div>`;
}
const delta = (cur, prev, word = 'к прошлому месяцу') => {
  if (!prev && !cur) return `<span class="delta eq">без изменений<em>${word}</em></span>`;
  if (!prev) return `<span class="delta up">${I('up')}новое<em>${word}</em></span>`;
  const p = Math.round((cur - prev) / prev * 1000) / 10;
  return `<span class="delta ${p > 0 ? 'up' : p < 0 ? 'dn' : 'eq'}">${p > 0 ? I('up') : p < 0 ? I('down') : ''}${p > 0 ? '+' : ''}${String(p).replace('.', ',')}%<em>${word}</em></span>`;
};
const panel = (title, icon, body, right = '') => `<section class="panel glass"><div class="ph"><h2><span class="ic">${I(icon)}</span>${title}</h2>${right}</div>${body}</section>`;
const empty = t => `<div class="empty">${t}</div>`;

// ---------- разделы ----------
const VIEWS = {};
VIEWS.dashboard = after => {
  const t = today(), m = ym(t), pm = monthShift(m, -1), fin = can('finance');
  const open = D.deals.filter(d => kindOf(d) === 'open');
  const wonM = D.deals.filter(d => kindOf(d) === 'won' && ym(d.closed_at) === m), wonP = D.deals.filter(d => kindOf(d) === 'won' && ym(d.closed_at) === pm);
  const inc = k => sum(D.tx.filter(x => x.type === 'Доход' && ym(x.date) === k), x => x.amount);
  const newD = k => D.deals.filter(d => ym(d.created_at) === k).length, newC = k => D.contacts.filter(c => ym(c.created_at) === k).length;
  const k = [];
  if (fin) k.push(['finance', 'Выручка за месяц', rub(inc(m)), delta(inc(m), inc(pm)), '']);
  else k.push(['bag', 'Новых сделок за месяц', newD(m), delta(newD(m), newD(pm)), '']);
  if (money()) k.push(['target', 'Сумма в воронке', rub(sum(open, d => d.amount)), `<span class="delta eq">${pl(open.length, ['сделка', 'сделки', 'сделок'])} в работе</span>`, 'v']);
  else k.push(['target', 'Сделок в работе', open.length, `<span class="delta eq">по всем этапам</span>`, 'v']);
  if (can('contacts')) k.push(['contacts', 'Новых клиентов', newC(m), delta(newC(m), newC(pm)), 's']);
  else { const tt = D.tasks.filter(x => !x.done && x.due === t).length; k.push(['tasks', 'Задач на сегодня', tt, '<span class="delta eq">к выполнению</span>', 's']); }
  k.push(['star', 'Успешных сделок за месяц', wonM.length, money() ? `<span class="delta up">${rub(sum(wonM, d => d.amount))}</span>` : delta(wonM.length, wonP.length), 'k']);

  // график
  let labels, vals, fmt, total, title;
  if (UI.chart === 'year') {
    const ks = Array.from({ length: 12 }, (_, i) => monthShift(m, i - 11));
    labels = ks.map(x => MS[+x.slice(5) - 1]);
    vals = ks.map(x => fin ? inc(x) : newD(x));
  } else {
    const [y, mo] = m.split('-').map(Number), days = new Date(y, mo, 0).getDate(), td = +t.slice(8);
    labels = Array.from({ length: days }, (_, i) => (i + 1) + ' ' + MS[mo - 1]);
    let acc = 0;
    labels = labels.slice(0, td);
    vals = labels.map((_, i) => { const ds = m + '-' + p2(i + 1); acc += fin ? sum(D.tx.filter(x => x.type === 'Доход' && x.date === ds), x => x.amount) : D.deals.filter(d => d.created_at && dstr(new Date(d.created_at)) === ds).length; return acc; });
  }
  total = UI.chart === 'year' ? sum(vals) : (vals[vals.length - 1] || 0); fmt = fin ? (v, s) => s ? shortRub(v) : rub(v) : v => String(Math.round(v));
  title = fin ? 'Выручка' : 'Новые сделки';
  after.push(areaChart('ch1', labels, vals, fmt));
  const chartP = panel(title, 'chart', `<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:-4px 0 6px"><span class="big">${fin ? rub(total) : total}</span><span class="sub">${UI.chart === 'year' ? 'за 12 месяцев' : 'за ' + MON[+m.slice(5) - 1] + ', нарастающим итогом'}</span></div><div class="fig" id="ch1"><svg></svg><div class="tip"></div></div>`,
    `<div class="tabs"><button data-act="ui" data-k="chart" data-v="month" class="${UI.chart === 'month' ? 'on' : ''}">Месяц</button><button data-act="ui" data-k="chart" data-v="year" class="${UI.chart === 'year' ? 'on' : ''}">Год</button></div>`);
  const stItems = D.stages.map(s => { const ds = D.deals.filter(d => d.stage_id === s.id); return { n: s.name, v: ds.length, c: s.color, extra: money() && ds.length ? shortRub(sum(ds, d => d.amount)) + ' руб.' : '' }; });
  const donutP = panel('Сделки по этапам', 'pie', D.deals.length ? donut(stItems, D.deals.length, pl(D.deals.length, ['сделка', 'сделки', 'сделок']).replace(/^\d+ /, '')) : empty('Сделок пока нет. Добавьте первую в разделе «Сделки».'));

  // воронка: сколько сделок дошло до каждого этапа
  const fs = D.stages.filter(s => s.kind !== 'lost'), notLost = D.deals.filter(d => kindOf(d) !== 'lost');
  const reached = fs.map(s => notLost.filter(d => (stageOf(d.stage_id)?.pos ?? -1) >= s.pos).length);
  const funnelP = panel('Воронка продаж', 'funnel', notLost.length ? `<div class="funnel"><div class="fsteps">${fs.map((s, i) => `<div class="fstep" style="width:${100 - i * (55 / Math.max(1, fs.length - 1))}%;background:linear-gradient(135deg,${s.color},${s.color}b3)">${reached[i]}<small>${esc(s.name)}</small></div>`).join('')}</div>
    <div class="flab">${fs.map((s, i) => `<div><b>${reached[0] ? Math.round(reached[i] / reached[0] * 1000) / 10 : 0}%</b><span>${esc(s.name)}</span></div>`).join('')}</div></div>` : empty('Воронка появится, когда будут сделки.'));

  const srcs = ['Холодный звонок', 'Рекомендация', 'Сайт', 'Соцсети', 'Реклама', 'Другое'];
  const srcCnt = srcs.map(s => [s, D.contacts.filter(c => (c.source || 'Другое') === s).length]).filter(x => x[1]);
  const srcP = can('contacts') ? panel('Источники клиентов', 'target', D.contacts.length ? `<div class="bars">${srcCnt.sort((a, b) => b[1] - a[1]).map(([s, n]) => `<div class="brow"><span>${s}</span><div class="track"><i style="width:${n / D.contacts.length * 100}%"></i></div><span class="num">${Math.round(n / D.contacts.length * 1000) / 10}%</span></div>`).join('')}</div>` : empty('Укажите источник у клиентов — здесь появится статистика.')) : '';
  const teamP = dir() && D.team ? panel('Команда', 'team', D.team.length > 1 ? D.team.filter(x => x.role !== 'director').slice(0, 6).map(x => `<div class="trow">${avatar(x.name, x.id, 's', x.online)}<div class="t" style="cursor:default"><span>${esc(x.name)}</span><div class="m">${esc(x.position || '')}</div></div>${online(x)}</div>`).join('') : empty('Пригласите сотрудников в разделе «Сотрудники».'), '<a class="btn sm" href="#team">Все</a>') : '';

  const rec = [...D.deals].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0)).slice(0, 6);
  const recP = can('deals') ? panel('Последние сделки', 'deals', rec.length ? `<div class="ov-x"><table class="tbl stack"><thead><tr><th>Клиент</th><th>Этап</th>${money() ? '<th class="num">Сумма</th>' : ''}<th>Ответственный</th></tr></thead><tbody>${rec.map(d => { const s = stageOf(d.stage_id) || {}; return `<tr class="cl" data-act="open-deal" data-id="${d.id}"><td data-l="Клиент"><b>${esc(d.title)}</b>${d.contact_id && cById(d.contact_id) ? `<div class="sub" style="font-size:12px">${esc(cById(d.contact_id).company || cById(d.contact_id).name)}</div>` : ''}</td><td data-l="Этап"><span class="pill" style="background:${s.color}22;color:${s.color}">${esc(s.name || '—')}</span></td>${money() ? `<td data-l="Сумма" class="num">${d.amount ? rub(d.amount) : '—'}</td>` : ''}<td data-l="Ответственный">${esc(pname(d.resp_id) || '—')}</td></tr>`; }).join('')}</tbody></table></div>` : empty('Сделок пока нет.'), '<a class="btn sm" href="#deals">Все</a>') : '';
  const up = D.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1).slice(0, 6);
  const taskP = can('tasks') ? panel('Ближайшие задачи', 'tasks', up.length ? up.map(taskRow).join('') : empty('Открытых задач нет.'), '<a class="btn sm" href="#tasks">Все</a>') : '';

  const left = [srcP, teamP].filter(Boolean); const pairs = [[chartP, donutP], [left.length > 1 ? `<div class="stk">${left.join('')}</div>` : left[0] || '', funnelP], [recP, taskP]];
  const hour = new Date().getHours();
  return `<div class="head"><div><p class="hello">${hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'}, ${esc(D.me.name.split(' ')[0])}</p><h1>Дашборд</h1><p class="sub">Что происходит в компании на ${fd(t)}</p></div>
   <div class="bar"><span class="pill mu" style="min-height:40px;padding:8px 14px">${I('cal')}${cap(MON[+m.slice(5) - 1])} ${m.slice(0, 4)}</span>${can('deals') ? `<button class="btn p" data-act="new" data-e="deals">${I('plus')}Сделка</button>` : ''}</div></div>
   <div class="kpis">${k.map(x => `<div class="kpi glass"><div class="ic ${x[4]}">${I(x[0])}</div><span>${x[1]}</span><b>${x[2]}</b>${x[3]}</div>`).join('')}</div>
   ${pairs.map(([a, b]) => a || b ? (a && b ? `<div class="${a === chartP ? 'g2' : 'g2e'}">${a}${b}</div>` : a || b) : '').join('')}`;
};
function workPill(x) { if (x.status !== 'active' || !x.work_state || x.work_state === 'off') return ''; const s = new Date(x.work_since); return x.work_state === 'on' ? `<span class="pill ok" style="margin-left:6px">работает с ${p2(s.getHours())}:${p2(s.getMinutes())}</span>` : '<span class="pill warn" style="margin-left:6px">перерыв</span>'; }
function online(x) { return x.status !== 'active' ? `<span class="online">${x.status === 'blocked' ? 'заблокирован' : 'ожидает активации'}</span>` : x.online ? '<span class="online on"><i></i>в сети</span>' : `<span class="online"><i></i>${seenText(x.last_seen || x.last_login)}</span>`; }
// «был(а) в сети в 23:01» — сегодня; «вчера в …»; иначе с датой
function seenText(ts) {
  if (!ts) return 'ещё не заходил(а)';
  const d = new Date(ts), t = p2(d.getHours()) + ':' + p2(d.getMinutes()), k = dstr(d), y = new Date(); y.setDate(y.getDate() - 1);
  return 'был(а) в сети ' + (k === today() ? 'в ' + t : k === dstr(y) ? 'вчера в ' + t : fd(k) + ' в ' + t);
}
function taskRow(x) {
  const od = isOver(x);
  return `<div class="trow ${x.done ? 'done' : ''}"><input type="checkbox" class="chk" data-act="done" data-id="${x.id}" ${x.done ? 'checked' : ''} aria-label="Выполнено"><div class="t" data-act="edit" data-e="tasks" data-id="${x.id}">${x.prio === 'Высокий' ? '<span class="pill bad" style="margin-right:6px">важно</span>' : ''}${x.kind === 'Задача' ? '<span class="pill" style="margin-right:6px">задача</span>' : ''}<span>${esc(x.title)}</span><div class="m">${[pname(x.resp_id), x.deal_id && dById(x.deal_id)?.title].filter(Boolean).map(esc).join(' · ')}</div></div><span class="num ${od ? 'red' : 'sub'}" style="font-size:13px">${od ? 'просрочено<br>' : ''}${dueText(x)}</span></div>`;
}

VIEWS.deals = () => {
  const stages = [...D.stages].sort((a, b) => a.pos - b.pos);
  const ds = D.deals.filter(d => (UI.dealsMine === 'all' || d.resp_id === D.me.id) && (!UI.resp || d.resp_id === +UI.resp) &&
    match(d, ['title', 'next', 'note', d => cById(d.contact_id)?.name, d => cById(d.contact_id)?.phone, d => cById(d.contact_id)?.company]))
    .map(d => { const ot = D.tasks.filter(x => x.deal_id === d.id && !x.done); return { d, over: ot.filter(isOver).length, n: ot.length }; })
    .sort((a, b) => (b.over > 0) - (a.over > 0) || b.over - a.over || b.n - a.n || (b.d.updated_at || 0) - (a.d.updated_at || 0)).map(x => x.d);
  const emp = D.people.filter(p => p.role !== 'director' || dir());
  const t = today(), F = ds.filter(d => kindOf(d) === 'open');
  const noTask = F.filter(d => !D.tasks.some(x => x.deal_id === d.id && !x.done)).length;
  const todayN = D.tasks.filter(x => !x.done && x.deal_id && x.due === t).length, overN = new Set(D.tasks.filter(x => x.deal_id && isOver(x)).map(x => x.deal_id)).size;
  const stF = UI.dealsSt || 'open';
  const shown = stF === 'open' ? stages.filter(x => x.kind === 'open') : stages;
  return `<div class="phead"><h1>Сделки</h1><button class="btn gr" data-act="new" data-e="deals">${I('plus')}Создать</button>
   <select class="f dd" data-ui="dealsMine" aria-label="Чьи сделки"><option value="all" ${UI.dealsMine === 'all' ? 'selected' : ''}>Все сделки</option><option value="mine" ${UI.dealsMine === 'mine' ? 'selected' : ''}>Мои сделки</option></select>
   <div class="fbox">${stF === 'open' ? `<span class="fchip">В работе<button data-act="ui" data-k="dealsSt" data-v="all" aria-label="Показать все этапы">${I('x')}</button></span>` : `<button class="fadd" data-act="ui" data-k="dealsSt" data-v="open">+ только в работе</button>`}
    ${P().onlyOwn ? '' : `<select class="fsel" data-ui="resp" aria-label="Ответственный"><option value="">+ ответственный</option>${emp.map(p => `<option value="${p.id}" ${+UI.resp === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`}</div></div>
  <div class="prow"><span class="vpill">${I('deals')}Канбан</span>
   <div class="cnts"><span><b>${noTask}</b>Без дел</span><span><b>${todayN}</b>На сегодня</span><span class="${overN ? 'bad' : ''}"><b>${overN}</b>Просрочены</span></div>
   <span class="sp"></span>${may('stages', 'c') ? `<button class="btn sm" data-act="stage-new">${I('plus')}Этап</button>` : ''}</div>
  <div class="board">${shown.map((s, si) => { const c = ds.filter(d => d.stage_id === s.id); return `<div class="col" data-stage="${s.id}" style="--c:${s.color}">
    <div class="shead"><span>${esc(s.name)} <em>${c.length}</em></span>${may('stages', 'e') || may('stages', 'd') ? `<button data-act="stage" data-id="${s.id}" aria-label="Настроить этап «${esc(s.name)}»">${I('more')}</button>` : ''}</div>
    <div class="ssum"><span>${money() ? rub(sum(c, d => d.amount)) : pl(c.length, ['сделка', 'сделки', 'сделок'])}</span></div>
    <button class="qadd ${si === 0 ? 'big' : ''}" data-act="new-deal" data-stage="${s.id}" aria-label="Добавить сделку в этап «${esc(s.name)}»">${I('plus')}${si === 0 ? 'Быстрая сделка' : ''}</button>
    ${c.map(dealCard).join('')}</div>`; }).join('')}
  ${may('stages', 'c') ? `<button class="newcol" data-act="stage-new">${I('plus')}Новый этап</button>` : ''}</div>`;
};
function dealCard(d) {
  const c = cById(d.contact_id), s = stageOf(d.stage_id) || {};
  const tasks = D.tasks.filter(x => x.deal_id === d.id && !x.done).sort((a, b) => ((a.due || '9') + (a.due_time || '')) < ((b.due || '9') + (b.due_time || '')) ? -1 : 1), od = tasks.filter(isOver);
  const nt = od[0] || tasks[0];
  return `<div class="dc ${od.length ? 'over' : ''}" draggable="true" data-act="open-deal" data-id="${d.id}" style="--c:${s.color || 'var(--acc)'}">
  <div class="dcm">${od.length ? `<div class="ovb">${I('cal')}Просрочено: ${pl(od.length, ['задача', 'задачи', 'задач'])}</div>` : ''}
   <b class="dt">${esc(d.title)}</b>
   ${money() ? `<div class="am">${rub(d.amount)}</div>` : ''}
   ${c ? `<div class="cl2">${esc(c.name)}</div>${c.company ? `<div class="m">${esc(c.company)}</div>` : ''}` : ''}
   <div class="m">${fd(ds_(d.created_at))}</div>
   ${d.next ? `<div class="nx ${d.next_date && d.next_date < today() && s.kind === 'open' ? 'red' : ''}">${I('flag')}<span>${esc(d.next)}${d.next_date ? ' · ' + fd(d.next_date) : ''}</span></div>` : ''}
   ${nt ? `<div class="ntk ${isOver(nt) ? 'red' : ''}">${I('tasks')}<span>${esc(nt.title)}<small>${dueText(nt)}${tasks.length > 1 ? ' · ещё ' + (tasks.length - 1) : ''}</small></span></div>` : ''}
  </div>
  <div class="dci"><span class="tcount ${od.length ? 'bad' : tasks.length ? 'on' : ''}" title="Открытых задач: ${tasks.length}">${tasks.length}</span>
   <span class="${c && c.phone ? 'act' : ''}" title="${esc(c && c.phone || 'Телефон не указан')}">${I('phone')}</span>
   <span class="${c && c.email ? 'act' : ''}" title="${esc(c && c.email || 'Email не указан')}">${I('mail')}</span>
   <span title="Комментарии">${I('msg')}</span></div>
  <div class="dcf"><button class="adddo" data-act="deal-task" data-id="${d.id}" aria-label="Добавить задачу">${I('plus')}</button>${d.resp_id ? `<span title="Ответственный: ${esc(pname(d.resp_id))}">${avatar(pname(d.resp_id), d.resp_id, 's')}</span>` : ''}</div></div>`;
}
const ds_ = ts => ts ? dstr(new Date(ts)) : '';

// ---------- карточка сделки ----------
let DEAL = null;
async function loadEvents() {
  if (!DEAL) return;
  try { const r = await api('GET', 'deals/' + DEAL.id + '/events'); const j = JSON.stringify(r.events); if (j !== DEAL.evj) { DEAL.evj = j; DEAL.ev = r.events; if (VIEW === 'deal' && !busy()) render(); } } catch {}
}
const busy = () => dragging || !$('#modal').hidden || !!document.activeElement?.closest?.('.composer') || !!(DEAL && (DEAL.editSec || DEAL.inl) && VIEW === 'deal');
const EVI = { pay: ['finance', '#16a34a'], mail: ['mail', '#0ea5e9'], ztask: ['tasks', '#0ea5e9'], created: ['plus', '#5b5ff0'], stage: ['deals', '#8b5cf6'], comment: ['msg', '#10b981'], task: ['tasks', '#f59e0b'], done: ['tasks', '#16a34a'] };
const EVN = { pay: 'Оплата получена', mail: 'Письмо клиенту', ztask: 'Новая задача', created: 'Сделка создана', stage: 'Смена этапа', comment: 'Комментарий', task: 'Новое дело', done: 'Дело выполнено' };
// ---------- карточка сделки: свои разделы и поля, оплата ----------
const dform = () => D.dealform || { fields: {}, sections: [] };
const dextra = d => { try { return JSON.parse(d.extra || '{}') || {}; } catch { return {}; } };
const canForm = () => may('stages', 'e');
const fval = (f, v) => v == null || v === '' ? '' : f.type === 'bool' ? (v === '1' ? 'Да' : 'Нет') : f.type === 'date' ? fd(v) : f.type === 'num' ? esc((+v).toLocaleString('ru-RU')) : esc(v);
function finput(id, f, v) {
  const n = `name="x_${id}" aria-label="${esc(f.name)}"`;
  if (f.type === 'list') return `<select ${n}><option value="">—</option>${(f.options || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (f.type === 'bool') return `<select ${n}><option value="">—</option><option value="1" ${v === '1' ? 'selected' : ''}>Да</option><option value="0" ${v === '0' ? 'selected' : ''}>Нет</option></select>`;
  if (f.type === 'date') return `<input type="date" ${n} value="${esc(v || '')}">`;
  if (f.type === 'num') return `<input inputmode="decimal" ${n} value="${esc(v || '')}" autocomplete="off">`;
  return `<input ${n} value="${esc(v || '')}" maxlength="1000" autocomplete="off">`;
}
// правка прямо в карточке: клик по значению — поле ввода, Enter или клик мимо — сохранить, Esc — отменить
function inl(d, key, html) {
  const ro = !may('deals', 'e') || (key === 'amount' && !money());
  if (ro) return html || '<i class="mu2">не заполнено</i>';
  if (DEAL.inl !== key) return `<div class="iv" data-ie="${esc(key)}" tabindex="0" role="button" title="Нажмите, чтобы изменить">${html || '<i class="mu2">не заполнено</i>'}<span class="ivp">${I('edit')}</span></div>`;
  let ed;
  if (key === 'amount') ed = `<input name="amount" inputmode="decimal" value="${d.amount ?? ''}" placeholder="Сумма, руб." aria-label="Сумма сделки">`;
  else if (key === 'next') ed = `<input name="next" value="${esc(d.next || '')}" placeholder="Что сделать дальше" aria-label="Следующий шаг"><input type="date" name="next_date" value="${esc(d.next_date || '')}" aria-label="Срок следующего шага">`;
  else if (key === 'note') ed = `<textarea name="note" rows="4" placeholder="Комментарий к сделке" aria-label="Комментарий">${esc(d.note || '')}</textarea>`;
  else { const fid = key.slice(2), f = dform().fields[fid]; ed = f ? finput(fid, f, dextra(d)[fid]) : ''; }
  return `<div class="ie" data-iek="${esc(key)}">${ed}<div class="iehint">${key === 'note' ? 'Клик мимо поля или Ctrl+Enter' : 'Enter или клик мимо поля'} — сохранить, Esc — отменить</div></div>`;
}
function inlOpen(key) {
  if (!DEAL) return; DEAL.inl = key; render();
  const el = $('#dpane .ie input, #dpane .ie textarea, #dpane .ie select'); if (el) { el.focus(); if (el.select && el.tagName !== 'SELECT') el.select(); }
}
let inlBusy = false;
async function inlCommit(cancel) {
  if (!DEAL || !DEAL.inl || inlBusy) return;
  const key = DEAL.inl, box = $('#dpane .ie'), d = dById(DEAL.id);
  if (cancel || !box || !d) { DEAL.inl = null; return render(); }
  const val = n => { const e = box.querySelector(`[name="${n}"]`); return e ? e.value.trim() : ''; };
  let body = null;
  if (key === 'amount') { const v = val('amount').replace(/\s/g, '').replace(',', '.'); if (v !== '' && !(+v >= 0)) return toast('Сумма — это число, например 48500'); const n = v === '' ? null : +v; if (n !== (d.amount ?? null)) body = { amount: n }; }
  else if (key === 'next') { if (val('next') !== (d.next || '') || val('next_date') !== (d.next_date || '')) body = { next: val('next'), next_date: val('next_date') }; }
  else if (key === 'note') { if (val('note') !== (d.note || '')) body = { note: box.querySelector('[name=note]').value.trim() }; }
  else { const fid = key.slice(2), ex = dextra(d), v = val('x_' + fid); if (v !== (ex[fid] || '')) { if (v === '') delete ex[fid]; else ex[fid] = v; body = { extra: ex }; } }
  DEAL.inl = null;
  if (!body) return render();
  inlBusy = true;
  try { await api('PUT', 'deals/' + d.id, body); Object.assign(d, body.extra ? { extra: JSON.stringify(body.extra) } : body); render(); await load(); render(); toast('Сохранено'); }
  catch (e) { fail(e); render(); }
  inlBusy = false;
}
document.addEventListener('click', e => { const v = e.target.closest?.('#dpane [data-ie]'); if (v) { e.preventDefault(); inlOpen(v.dataset.ie); } });
document.addEventListener('keydown', e => {
  const v = e.target.closest?.('#dpane [data-ie]'); if (v && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return inlOpen(v.dataset.ie); }
  if (!e.target.closest?.('#dpane .ie')) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); return inlCommit(true); }
  if (e.key === 'Enter' && (e.target.tagName !== 'TEXTAREA' || e.ctrlKey || e.metaKey)) { e.preventDefault(); inlCommit(); }
}, true);
document.addEventListener('focusout', e => {
  const box = e.target.closest?.('#dpane .ie'); if (!box) return;
  if (e.relatedTarget && box.contains(e.relatedTarget)) return;
  setTimeout(() => { if (DEAL && DEAL.inl && !document.activeElement?.closest?.('#dpane .ie')) inlCommit(); }, 0);
});
// товары и услуги в сделке: выбираются из каталога
const ditems = d => { try { return JSON.parse(d.items || '[]') || []; } catch { return []; } };
const qtyFmt = q => String(+q).replace('.', ',');
function dealProducts(d) {
  if (!can('products')) return '';
  const it = ditems(d), ed = may('deals', 'e'), m = money();
  const total = sum(it, x => x.qty * (x.price || 0));
  return `<section class="glass panel dsec dprod"><div class="ph"><h2 class="dsh">Товары и услуги</h2>${ed ? `<button class="lnk" data-act="dp-add">${I('plus')} добавить</button>` : ''}</div>
   ${it.length ? `<div class="dpl">${it.map((x, i) => `<div class="dpr"><div class="dpn"><b>${esc(x.name)}</b><small>${esc(x.kind || 'Товар')}${m ? ' · ' + rub(x.price) + ' за ' + esc(x.unit || 'шт.') : ''}</small></div>
      <div class="dpq">${ed ? `<input class="dpi" data-dpq="${i}" inputmode="decimal" value="${qtyFmt(x.qty)}" aria-label="Количество: ${esc(x.name)}">` : `<span>${qtyFmt(x.qty)}</span>`}<small>${esc(x.unit || 'шт.')}</small></div>
      ${m ? `<div class="dps">${rub(x.qty * x.price)}</div>` : ''}${ed ? `<button class="dsx" data-act="dp-rm" data-i="${i}" title="Убрать из сделки" aria-label="Убрать ${esc(x.name)}">✕</button>` : ''}</div>`).join('')}</div>
     ${m ? `<div class="dpt"><span>Итого</span><b>${rub(total)}</b></div><p class="sub" style="font-size:12px;margin:2px 0 0">Сумма сделки считается по товарам автоматически</p>` : ''}`
    : `<p class="sub">${ed ? 'Товары и услуги не выбраны. Нажмите «добавить» и выберите из каталога.' : 'Товары и услуги не выбраны.'}</p>`}</section>`;
}
async function saveItems(d, items, msg) {
  try { await api('PUT', 'deals/' + d.id, { items: items.map(x => ({ pid: x.pid, qty: x.qty, price: x.price })) }); if (msg) toast(msg); await load(); render(); } catch (e) { fail(e); }
}
function openProductPicker(d) {
  const cur = ditems(d), all = (D.products || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  if (!all.length) {
    if (may('products', 'c')) { toast('Каталог пуст — сначала добавьте товар или услугу'); return openForm('products'); }
    return toast('Каталог товаров пуст. Попросите директора добавить товары');
  }
  openModal(`<h2>Выбрать товары и услуги</h2><form id="ppf" class="fm"><input type="search" id="pps" placeholder="Поиск по названию или артикулу" aria-label="Поиск товара" autocomplete="off">
    <div class="ppl" id="ppl">${all.map(x => { const c = cur.find(i => i.pid === x.id); return `<label class="ppr" data-name="${esc((x.name + ' ' + (x.sku || '')).toLowerCase())}"><input type="checkbox" name="p" value="${x.id}" ${c ? 'checked' : ''}><span class="ppn"><b>${esc(x.name)}</b><small>${esc(x.kind || 'Товар')}${x.sku ? ' · арт. ' + esc(x.sku) : ''}</small></span>${money() && x.price != null ? `<span class="ppp">${rub(x.price)}<small> / ${esc(x.unit || 'шт.')}</small></span>` : ''}<input class="ppq" name="q${x.id}" inputmode="decimal" value="${c ? qtyFmt(c.qty) : 1}" aria-label="Количество"></label>`; }).join('')}</div>
    ${may('products', 'c') ? `<button type="button" class="lnk" data-newprod>${I('plus')} Новый товар или услуга в каталог</button>` : ''}
    <div class="acts"><button class="btn" type="button" data-close>Отмена</button><span class="sp"></span><button class="btn p">Готово</button></div></form>`, dlg => {
    const f = dlg.querySelector('form');
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    dlg.querySelector('#pps').addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); dlg.querySelectorAll('.ppr').forEach(r => r.hidden = q && !r.dataset.name.includes(q)); });
    dlg.querySelectorAll('.ppq').forEach(q => { q.addEventListener('click', e => e.preventDefault()); q.addEventListener('input', () => { q.closest('.ppr').querySelector('[type=checkbox]').checked = true; }); });
    dlg.querySelector('[data-newprod]')?.addEventListener('click', () => { closeModal(); openForm('products'); });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const ids = [...f.querySelectorAll('[name=p]:checked')].map(x => +x.value);
      const items = ids.map(id => { const old = cur.find(i => i.pid === id), q = +String(f['q' + id].value).replace(',', '.') || 1; return { pid: id, qty: q, price: old ? old.price : undefined }; });
      closeModal(); await saveItems(d, items, items.length ? 'Товары в сделке обновлены' : 'Товары убраны из сделки');
    });
  });
}
document.addEventListener('change', e => {
  const q = e.target.closest?.('#dpane [data-dpq]'); if (!q || !DEAL) return;
  const d = dById(DEAL.id), it = ditems(d), n = +String(q.value).replace(',', '.');
  if (!(n > 0)) { q.value = qtyFmt(it[+q.dataset.dpq].qty); return toast('Количество — число больше нуля'); }
  it[+q.dataset.dpq].qty = n; saveItems(d, it);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches?.('#dpane [data-dpq]')) { e.preventDefault(); e.target.blur(); } });

function dealSections(d) {
  const F = dform(), ex = dextra(d), edit = may('deals', 'e');
  return F.sections.map(s => {
    const on = DEAL.editSec === s.id;
    const links = canForm() ? `<div class="dsl"><button class="lnk dash" data-act="ds-pick" data-sec="${s.id}">Выбрать поле</button><button class="lnk dash" data-act="ds-new" data-sec="${s.id}">Создать поле</button><span class="sp"></span><button class="lnk dash" data-act="ds-del" data-sec="${s.id}">Удалить раздел</button></div>` : '';
    if (on) return `<section class="glass panel dsec on"><form id="dsf" data-sec="${s.id}">
      <div class="ph">${canForm() ? `<input class="dsname" name="secname" value="${esc(s.name)}" maxlength="60" aria-label="Название раздела">` : `<h2 class="dsh">${esc(s.name)}</h2>`}</div>
      ${s.fields.map(id => { const f = F.fields[id]; return `<div class="fld dsf"><span>${esc(f.name)}${canForm() ? ` <button type="button" class="dsx" data-act="ds-rmf" data-sec="${s.id}" data-f="${id}" title="Убрать поле из раздела" aria-label="Убрать поле «${esc(f.name)}» из раздела">✕</button>` : ''}</span>${finput(id, f, ex[id])}</div>`; }).join('') || '<p class="sub">В разделе пока нет полей.</p>'}
      <div class="dsact"><button class="btn p sm">Сохранить</button><button class="btn sm" type="button" data-act="ds-cancel">Отмена</button></div></form>${links}</section>`;
    return `<section class="glass panel dsec"><div class="ph"><h2 class="dsh">${esc(s.name)}</h2>${edit && s.fields.length ? `<button class="lnk" data-act="ds-edit" data-sec="${s.id}">изменить</button>` : ''}</div>
      ${s.fields.map(id => { const f = F.fields[id]; const v = fval(f, ex[id]); return `<div class="fld"><span>${esc(f.name)}</span><div>${inl(d, 'x:' + id, v)}</div></div>`; }).join('') || `<p class="sub">${canForm() ? 'Добавьте поля: «Создать поле» — новое, «Выбрать поле» — из уже созданных.' : 'В разделе пока нет полей.'}</p>`}
      ${links}</section>`;
  }).join('') + (canForm() ? `<button class="addsec" data-act="ds-add">${I('plus')}Добавить раздел</button>` : '');
}
async function saveForm(F, msg) {
  try { const r = await api('PUT', 'dealform', F); D.dealform = r.dealform; if (msg) toast(msg); await load(); render(); return true; } catch (e) { fail(e); return false; }
}
const PAY_WAYS = ['Перевод на расчётный счёт', 'Банковская карта', 'Наличные', 'СБП'];
function paidOf(d) { return sum((D.tx || []).filter(x => x.deal_id === d.id && x.type === 'Доход'), x => x.amount); }
function payBlock(d) {
  if (!money()) return '';
  const pays = (D.tx || []).filter(x => x.deal_id === d.id && x.type === 'Доход').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const paid = sum(pays, x => x.amount), left = (+d.amount || 0) - paid;
  if (!pays.length) return `<div class="paybox"><b>Оплата</b><span class="sub">Здесь появятся оплаты по сделке${may('finance', 'c') ? ': нажмите «Принять оплату», когда клиент заплатит' : ''}.</span></div>`;
  return `<div class="paybox"><div class="payh"><b>Оплата</b>${+d.amount ? `<span class="pill ${left <= 0 ? 'ok' : 'warn'}">${left <= 0 ? 'Оплачено полностью' : 'Осталось ' + rub(left)}</span>` : ''}</div>
    ${+d.amount ? `<div class="paybar"><i style="width:${Math.min(100, Math.round(paid / d.amount * 100))}%"></i></div><div class="sub" style="font-size:13px">Оплачено ${rub(paid)} из ${rub(d.amount)}</div>` : `<div class="sub" style="font-size:13px">Оплачено ${rub(paid)}</div>`}
    <div class="payl">${pays.map(x => `<div><span>${fd(x.date)}</span><span class="sub">${esc((x.note || '').replace(/^Сделка «[^»]*»\.?\s*/, '')) || 'оплата'}</span><b>${rub(x.amount)}</b></div>`).join('')}</div></div>`;
}
function openPay(d) {
  const left = Math.max(0, (+d.amount || 0) - paidOf(d));
  openModal(`<h2>Принять оплату</h2><p class="sub" style="margin:-6px 0 0">Сделка «${esc(d.title)}». Оплата попадёт в «Финансы» как доход и в историю сделки.</p>
    <form id="payf" class="fm"><label>Сумма, руб. *<input name="amount" inputmode="decimal" value="${left ? String(left).replace('.', ',') : ''}" required></label>
    <div class="r2" style="grid-template-columns:1fr 1fr"><label>Дата<input type="date" name="date" value="${today()}" required></label><label>Способ оплаты<select name="way">${PAY_WAYS.map(w => `<option>${w}</option>`).join('')}</select></label></div>
    <label>Комментарий<input name="note" placeholder="Например, счёт № 15, предоплата 50%" autocomplete="off"></label>
    <p class="err" id="paye"></p><div class="acts"><button class="btn" type="button" data-close>Отмена</button><span class="sp"></span><button class="btn p">${I('finance')}Принять оплату</button></div></form>`, dlg => {
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    const f = dlg.querySelector('form');
    f.addEventListener('submit', async e => {
      e.preventDefault(); const amount = +String(f.amount.value).replace(/\s/g, '').replace(',', '.');
      if (!(amount > 0)) return $('#paye').textContent = 'Укажите сумму больше нуля';
      try {
        await api('POST', 'tx', { type: 'Доход', date: f.date.value, amount, cat: 'Оплата по сделке', deal_id: d.id, note: `Сделка «${d.title}». ${f.way.value}${f.note.value.trim() ? '. ' + f.note.value.trim() : ''}` });
        closeModal(); toast('Оплата принята'); await load(); await loadEvents(); render();
      } catch (x) { $('#paye').textContent = x.message; }
    });
  });
}
function openSecName(title, val, cb) {
  openModal(`<h2>${title}</h2><form id="snf" class="fm"><label>Название раздела *<input name="name" value="${esc(val || '')}" maxlength="60" required placeholder="Например, Информация о заказе"></label><p class="err" id="sne"></p><div class="acts"><button class="btn" type="button" data-close>Отмена</button><span class="sp"></span><button class="btn p">Сохранить</button></div></form>`, dlg => {
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    dlg.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const n = e.target.name.value.trim(); if (!n) return $('#sne').textContent = 'Введите название'; closeModal(); cb(n); });
  });
}
function openNewField(secId) {
  openModal(`<h2>Новое поле</h2><form id="nff" class="fm"><label>Название поля *<input name="name" maxlength="60" required placeholder="Например, Размер"></label>
    <label>Тип поля<select name="type">${Object.entries(DEALFORM.TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label id="nfo" hidden>Варианты списка — каждый с новой строки<textarea name="options" rows="5" placeholder="S&#10;M&#10;L&#10;XL"></textarea></label>
    <p class="sub" style="font-size:12.5px;margin:0">Поле появится во всех сделках компании, в этом разделе.</p>
    <p class="err" id="nfe"></p><div class="acts"><button class="btn" type="button" data-close>Отмена</button><span class="sp"></span><button class="btn p">Создать поле</button></div></form>`, dlg => {
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    const f = dlg.querySelector('form');
    f.type.addEventListener('change', () => { dlg.querySelector('#nfo').hidden = f.type.value !== 'list'; });
    f.addEventListener('submit', async e => {
      e.preventDefault(); const name = f.name.value.trim(), type = f.type.value, options = f.options.value.split('\n').map(x => x.trim()).filter(Boolean);
      if (!name) return $('#nfe').textContent = 'Введите название поля';
      if (type === 'list' && !options.length) return $('#nfe').textContent = 'Добавьте хотя бы один вариант списка';
      const F = JSON.parse(JSON.stringify(dform())), id = DEALFORM.newId('f');
      F.fields[id] = { name, type, options };
      const s = F.sections.find(x => x.id === secId); if (s) s.fields.push(id);
      closeModal(); await saveForm(F, 'Поле «' + name + '» добавлено');
    });
  });
}
function openPickField(secId) {
  const F = dform(), s = F.sections.find(x => x.id === secId); if (!s) return;
  const free = Object.entries(F.fields).filter(([id]) => !s.fields.includes(id));
  if (!free.length) return toast('Все созданные поля уже есть в этом разделе. Нажмите «Создать поле»');
  openModal(`<h2>Выбрать поле</h2><p class="sub" style="margin:-6px 0 0">Отметьте поля, которые нужно показать в разделе «${esc(s.name)}».</p>
    <form id="pff" class="fm"><div class="pickl">${free.map(([id, f]) => `<label class="ckl"><input type="checkbox" name="f" value="${id}"> ${esc(f.name)} <small class="sub">${DEALFORM.TYPES[f.type]}${F.sections.some(x => x.fields.includes(id)) ? ' · уже в разделе «' + esc(F.sections.find(x => x.fields.includes(id)).name) + '»' : ''}</small></label>`).join('')}</div>
    <div class="acts"><button class="btn" type="button" data-close>Отмена</button><span class="sp"></span><button class="btn p">Добавить</button></div></form>`, dlg => {
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    dlg.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault(); const ids = [...e.target.querySelectorAll('[name=f]:checked')].map(x => x.value); if (!ids.length) return closeModal();
      const G = JSON.parse(JSON.stringify(F)); const t = G.sections.find(x => x.id === secId); ids.forEach(id => { G.sections.forEach(x => { x.fields = x.fields.filter(z => z !== id); }); t.fields.push(id); });
      closeModal(); await saveForm(G, ids.length > 1 ? 'Поля добавлены' : 'Поле добавлено');
    });
  });
}
async function dsAct(k, a) {
  const F = JSON.parse(JSON.stringify(dform())), sec = F.sections.find(x => x.id === a.dataset.sec);
  if (k === 'ds-edit') { DEAL.editSec = a.dataset.sec; render(); $('#dsf input:not(.dsname), #dsf select')?.focus(); return; }
  if (k === 'ds-cancel') { DEAL.editSec = null; return render(); }
  if (k === 'ds-add') return openSecName('Новый раздел', '', async n => { F.sections.push({ id: DEALFORM.newId('s'), name: n, fields: [] }); await saveForm(F, 'Раздел «' + n + '» добавлен'); });
  if (k === 'ds-new') return openNewField(a.dataset.sec);
  if (k === 'ds-pick') return openPickField(a.dataset.sec);
  if (k === 'ds-del' && sec) { if (!await ask('Удалить раздел?', 'Раздел «' + sec.name + '» исчезнет из всех сделок. Заполненные значения не пропадут: поля можно будет снова выбрать в другом разделе.')) return; F.sections = F.sections.filter(x => x !== sec); if (DEAL) DEAL.editSec = null; return saveForm(F, 'Раздел удалён'); }
  if (k === 'ds-rmf' && sec) { sec.fields = sec.fields.filter(x => x !== a.dataset.f); return saveForm(F, 'Поле убрано из раздела'); }
}
async function saveSection(form) {
  const d = dById(DEAL.id), F = JSON.parse(JSON.stringify(dform())), sec = F.sections.find(x => x.id === form.dataset.sec); if (!d || !sec) return;
  const ex = dextra(d);
  sec.fields.forEach(id => { const el = form.querySelector(`[name="x_${id}"]`); if (el) { if (el.value.trim() === '') delete ex[id]; else ex[id] = el.value.trim(); } });
  const b = form.querySelector('button.p'); b.disabled = true;
  try {
    const nm = form.secname ? form.secname.value.trim() : sec.name;
    if (nm && nm !== sec.name && canForm()) { sec.name = nm; await api('PUT', 'dealform', F); }
    await api('PUT', 'deals/' + d.id, { extra: ex });
    DEAL.editSec = null; toast('Сохранено'); await load(); render();
  } catch (x) { fail(x); b.disabled = false; }
}

// ---------- файлы к делу, комментарию и задаче ----------
const ATT_MAX = (window.CRM_PREVIEW ? 2 : 15) * 1048576;
const ATT_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.zip,.rar,.7z,.mp4,.mov';
const attBtn = () => `<label class="btn sm attb" title="Прикрепить документ, скриншот или фото">${I('clip')}<span>Файл</span><input type="file" id="cffi" multiple accept="${ATT_ACCEPT}" hidden></label>`;
const attBox = () => `<div class="cfatt" id="cfatt">${attChips()}</div>`;
const attChips = () => (DEAL && DEAL.att || []).map((f, i) => `<span class="attc">${f.type.startsWith('image/') && f.url ? `<img src="${f.url}" alt="">` : I('clip')}<span>${esc(f.name)}</span><small>${fsize(f.size)}</small><button type="button" data-rmatt="${i}" aria-label="Убрать файл ${esc(f.name)}">✕</button></span>`).join('');
function attAdd(list) {
  if (!DEAL) return; DEAL.att = DEAL.att || [];
  for (let f of list) {
    if (DEAL.att.length >= 10) { toast('Можно прикрепить не больше 10 файлов'); break; }
    if (f.size > ATT_MAX) { toast(`Файл «${f.name}» больше ${ATT_MAX / 1048576} МБ`); continue; }
    if (!f.name || f.name === 'image.png') { const d = new Date(); f = new File([f], `Скриншот ${p2(d.getDate())}.${p2(d.getMonth() + 1)} ${p2(d.getHours())}-${p2(d.getMinutes())}-${p2(d.getSeconds())}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: f.type }); }
    f.url = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
    DEAL.att.push(f);
  }
  const box = $('#cfatt'); if (box) box.innerHTML = attChips();
}
const attRead = () => Promise.all((DEAL.att || []).map(f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok({ name: f.name, data: String(r.result).split(',')[1] || '' }); r.onerror = () => no(new Error('Не удалось прочитать файл ' + f.name)); r.readAsDataURL(f); })));
document.addEventListener('change', e => { if (e.target.id === 'cffi') { attAdd([...e.target.files]); e.target.value = ''; } });
document.addEventListener('click', e => { const b = e.target.closest?.('[data-rmatt]'); if (b && DEAL) { DEAL.att.splice(+b.dataset.rmatt, 1); $('#cfatt').innerHTML = attChips(); } });
document.addEventListener('paste', e => { if (!e.target.closest?.('#dpane .composer')) return; const fl = [...(e.clipboardData?.files || [])]; if (fl.length) { e.preventDefault(); attAdd(fl); toast(fl.length > 1 ? 'Файлы прикреплены' : 'Скриншот прикреплён'); } });
document.addEventListener('dragover', e => { const c = e.target.closest?.('#dpane .composer'); if (c && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); c.classList.add('over'); } });
document.addEventListener('dragleave', e => { const c = e.target.closest?.('#dpane .composer'); if (c && !c.contains(e.relatedTarget)) c.classList.remove('over'); });
document.addEventListener('drop', e => { const c = e.target.closest?.('#dpane .composer'); if (c && e.dataTransfer?.files?.length) { e.preventDefault(); e.stopPropagation(); c.classList.remove('over'); attAdd([...e.dataTransfer.files]); } }, true);
document.addEventListener('focusin', e => { const c = e.target.closest?.('#dpane .composer'); if (c && !c.classList.contains('open') && e.target.name === 'title') { DEAL.cfopen = true; c.classList.add('open'); } });
// файлы в истории сделки
const DFCACHE = new Map();
const tlFiles = files => `<div class="tlf">${files.filter(f => f.img).map(f => `<button class="tlimg" data-act="df-view" data-f="${f.id}" title="${esc(f.name)}"><img data-dfsrc="${f.id}" alt="${esc(f.name)}"></button>`).join('')}${files.filter(f => !f.img).map(f => `<button class="tlfile" data-act="df-dl" data-f="${f.id}" data-n="${esc(f.name)}">${I('clip')}<span>${esc(f.name)}</span><small>${fsize(f.size)}</small></button>`).join('')}</div>`;
async function dfBlob(id) {
  if (DFCACHE.has(id)) return DFCACHE.get(id);
  const p = fetch(`/api/deals/${DEAL.id}/file/${id}`, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('Файл не найден'); return r.blob(); });
  DFCACHE.set(id, p); p.catch(() => DFCACHE.delete(id)); return p;
}
function dfHydrate() { document.querySelectorAll('img[data-dfsrc]:not([src])').forEach(async img => { try { const b = await dfBlob(+img.dataset.dfsrc); img.src = b.url || (b.url = URL.createObjectURL(b)); } catch { img.alt = 'не загрузилось'; } }); }
async function dfAct(k, a) {
  const id = +a.dataset.f, f = (DEAL.ev || []).flatMap(e => e.files || []).find(x => x.id === id);
  if (k === 'df-dl') { try { await saveFile(a.dataset.n || (f && f.name) || 'файл', await dfBlob(id)); } catch (e) { toast(e.message); } return; }
  try {
    const b = await dfBlob(id), url = b.url || (b.url = URL.createObjectURL(b));
    openModal(`<div class="imgv"><img src="${url}" alt="${esc(f ? f.name : '')}"></div><div class="acts"><span class="sub" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f ? f.name : '')}</span><button class="btn" type="button" id="imgdl">Скачать</button><button class="btn p" type="button" data-close>Закрыть</button></div>`, dlg => {
      dlg.classList.add('wide');
      dlg.querySelector('[data-close]').addEventListener('click', closeModal);
      dlg.querySelector('#imgdl').addEventListener('click', () => saveFile(f ? f.name : 'изображение.png', b));
    });
  } catch (e) { toast(e.message); }
}

// дело или задача в ленте сделки — карточка как в Битриксе
function tlTask(x) {
  const over = isOver(x), ed = may('tasks', 'e');
  return `<div class="tl"><span class="tl-ic" style="background:${over ? '#f97316' : x.kind === 'Задача' ? '#0ea5e9' : '#f59e0b'}">${I('tasks')}${over ? '<em class="tl-bad">!</em>' : ''}</span>
   <div class="tl-b tcard ${over ? 'over' : ''}"><div class="tl-h"><input type="checkbox" class="chk" data-act="done" data-id="${x.id}" aria-label="Отметить выполненным" ${ed ? '' : 'disabled'}>
    <b class="tcl" data-act="edit" data-e="tasks" data-id="${x.id}">${esc(x.title)}</b>${x.due ? `<span class="${over ? 'tover' : ''}">${over ? 'просрочено · ' : ''}${dueText(x)}</span>` : ''}
    ${x.kind === 'Задача' ? '<span class="pill">задача</span>' : ''}${x.prio === 'Высокий' ? '<span class="pill bad">важно</span>' : ''}${x.resp_id ? `<span class="tl-who" title="${esc(pname(x.resp_id))}">${avatar(pname(x.resp_id), x.resp_id, 's')}</span>` : ''}</div>
    ${x.note ? `<div class="tl-t tnote">${esc(x.note)}</div>` : ''}
    ${ed ? `<div class="tact"><button class="btn sm tok" data-act="tdone" data-id="${x.id}">Выполнено</button><button class="lnk tlater" data-act="tlater" data-id="${x.id}">Перенести на завтра</button><span class="sp"></span><button class="ib tmore" data-act="edit" data-e="tasks" data-id="${x.id}" title="Изменить" aria-label="Изменить">${I('more')}</button></div>` : ''}</div></div>`;
}

VIEWS.deal = (after = []) => {
  const d = dById(DEAL.id);
  if (!d) return `<div class="head"><div><h1>Сделка не найдена</h1><p class="sub">Возможно, она удалена или у вас нет к ней доступа.</p></div></div><div><a class="btn" href="#deals">${I('back')}К сделкам</a></div>`;
  const stages = [...D.stages].sort((a, b) => a.pos - b.pos), open = stages.filter(x => x.kind === 'open'), cur = stageOf(d.stage_id) || {};
  const ci = open.findIndex(x => x.id === d.stage_id), closed = cur.kind && cur.kind !== 'open';
  const c = cById(d.contact_id), tasks = D.tasks.filter(x => x.deal_id === d.id), openT = tasks.filter(x => !x.done).sort((a, b) => ((a.due || '9') + (a.due_time || '')) < ((b.due || '9') + (b.due_time || '')) ? -1 : 1);
  const pipe = open.map((s, i) => `<button class="chev ${closed || i <= ci ? 'on' : ''}" style="--c:${closed ? cur.color : s.color}" data-act="deal-stage" data-st="${s.id}">${esc(s.name)}</button>`).join('') +
    (closed ? `<button class="chev on fin" style="--c:${cur.color}" data-act="deal-finish">${esc(cur.name)}</button>` : `<button class="chev fin" style="--c:#10b981" data-act="deal-finish">Завершить сделку</button>`);
  const row = (l, v) => `<div class="fld"><span>${l}</span><div>${v || '<i class="mu2">не заполнено</i>'}</div></div>`;
  const contr = can('contracts') ? D.contracts.filter(x => x.deal_id === d.id) : [];
  const ev = [...(DEAL.ev || []).map(e => ({ ...e, ts: e.created_at })), ...tasks.filter(x => x.done).map(x => ({ type: 'done', text: x.title, user_id: x.resp_id, ts: x.updated_at || x.created_at }))].sort((a, b) => b.ts - a.ts);
  const day = ts => { const k = ds_(ts); return k === today() ? 'Сегодня' : fd(k); };
  let lastDay = '';
  const evHtml = ev.map(e => {
    const dl = day(e.ts), head = dl !== lastDay ? `<div class="tl-day"><span>${dl}</span></div>` : ''; lastDay = dl; const ic = EVI[e.type] || EVI.comment;
    return `${head}<div class="tl"><span class="tl-ic" style="background:${ic[1]}">${I(ic[0])}</span><div class="tl-b glass"><div class="tl-h"><b>${EVN[e.type] || 'Событие'}</b><span>${new Date(e.ts).toTimeString().slice(0, 5)}</span>${e.user_id && pname(e.user_id) ? `<span class="tl-who" title="${esc(pname(e.user_id))}">${avatar(pname(e.user_id), e.user_id, 's')}</span>` : ''}</div>${e.type === 'created' || !e.text ? '' : `<div class="tl-t">${esc(e.text)}</div>`}${e.files && e.files.length ? tlFiles(e.files) : ''}</div></div>`;
  }).join('');
  document.title = d.title + ' — ' + D.company;
  return `<div class="dhead"><div class="dt"><h1>${esc(d.title)} <span class="dnum">#${d.id}</span></h1><span class="sub">${c ? esc(c.name) + (c.company ? ' · ' + esc(c.company) : '') + ' · ' : ''}создана ${fd(ds_(d.created_at))}</span></div>
   <div class="bar"><button class="btn" data-act="edit" data-e="deals" data-id="${d.id}">${I('edit')}Изменить</button>${may('deals', 'd') ? `<button class="btn d" data-act="deal-del">${I('trash')}Удалить</button>` : ''}</div></div>
   <div class="pipe">${pipe}</div>
   <div class="dgrid"><div class="dcol">
    <section class="glass panel"><div class="ph"><h2>О сделке</h2><button class="lnk" data-act="edit" data-e="deals" data-id="${d.id}">изменить</button></div>
     ${row('Этап', `<span class="pill" style="background:${cur.color}22;color:${cur.color}">${esc(cur.name || '—')}</span>`)}
     ${money() ? row('Сумма', `<div class="sumrow">${inl(d, 'amount', `<span class="big">${d.amount ? rub(d.amount) : '<i class="mu2" style="font-size:15px;font-weight:500">не указана</i>'}</span>`)}${may('finance', 'c') ? `<button class="btn p sm" data-act="deal-pay">Принять оплату</button>` : ''}</div>`) + payBlock(d) : ''}
     ${row('Следующий шаг', inl(d, 'next', d.next ? esc(d.next) + (d.next_date ? ` <span class="sub">до ${fd(d.next_date)}</span>` : '') : ''))}
     ${row('Комментарий', inl(d, 'note', d.note ? `<span style="white-space:pre-wrap">${esc(d.note)}</span>` : ''))}</section>
    ${dealProducts(d)}
    ${dealSections(d)}
    <section class="glass panel"><div class="ph"><h2>Клиент</h2>${c && can('contacts') ? `<button class="lnk" data-act="edit" data-e="contacts" data-id="${c.id}">изменить</button>` : `<button class="lnk" data-act="edit" data-e="deals" data-id="${d.id}">выбрать</button>`}</div>
     ${c ? row('Имя', esc(c.name)) + row('Компания', esc(c.company || '')) + row('Должность', esc(c.position || '')) +
       row('Телефон', c.phone ? `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>` : '') + row('Email', c.email ? (may('mail', 'c') ? `<button class="lnk" data-act="mail-new" data-to="${esc(c.email)}">${esc(c.email)}</button>` : `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`) : '') + row('Источник', esc(c.source || '')) : row('Клиент', '')}</section>
    ${dealMailPanel(c, after)}
    <section class="glass panel"><div class="ph"><h2>Дополнительно</h2></div>
     ${row('Ответственный', d.resp_id ? `<div class="rp">${avatar(pname(d.resp_id), d.resp_id, 's')}<span><b>${esc(pname(d.resp_id))}</b><small>${esc(D.people.find(p => p.id === d.resp_id)?.position || '')}</small></span></div>` : '')}
     ${row('Создана', fd(ds_(d.created_at)))}${row('Изменена', d.updated_at ? fd(ds_(d.updated_at)) : '')}
     ${can('contracts') ? row('Договоры', contr.length ? contr.map(x => `<button class="lnk" data-act="edit" data-e="contracts" data-id="${x.id}">№ ${esc(x.num)} · ${esc(x.status || '')}</button>`).join('<br>') : '') : ''}</section>
   </div><div class="dcol tlcol">
    <div class="tl tlc"><span class="tl-ic" style="background:var(--acc)">${I('msg')}</span>
    <section class="glass panel composer ${DEAL.cfopen || (DEAL.mode || 'task') !== 'task' || (DEAL.att || []).length ? 'open' : ''}"><div class="tabs2">${[['task', 'Дело'], ['comment', 'Комментарий'], ['ztask', 'Задача']].map(x => `<button data-act="cmode" data-v="${x[0]}" class="${(DEAL.mode || 'task') === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}${c && c.email && can('mail') && may('mail', 'c') ? `<button data-act="mail-new" data-to="${esc(c.email)}">Письмо</button>` : ''}</div>
     ${(() => { const m = DEAL.mode || 'task', ppl = `<select name="resp_id" aria-label="Ответственный">${D.people.map(p => `<option value="${p.id}" ${p.id === (d.resp_id || D.me.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`;
       if (m === 'comment') return `<form id="cf" class="cform"><textarea name="text" placeholder="Напишите комментарий. Скриншот можно вставить через Ctrl+V" aria-label="Комментарий"></textarea>${attBox()}<div class="cfr">${attBtn()}<span class="sp"></span><button class="btn p sm">Отправить</button></div></form>`;
       if (m === 'ztask') return `<form id="cf" class="cform"><input name="title" placeholder="Название задачи" required aria-label="Название задачи"><textarea name="note" placeholder="Описание задачи" aria-label="Описание задачи"></textarea>
         <div class="cfr"><label>Крайний срок <input type="date" name="due" value="${today()}" required></label><label>Время <input type="time" name="due_time" value="18:00" required></label></div>
         ${attBox()}<div class="cfr"><label>Исполнитель ${ppl}</label><label class="ckl"><input type="checkbox" name="hi"> Важная</label>${attBtn()}<button class="btn p sm">Поставить задачу</button></div></form>`;
       return `<form id="cf" class="cform"><div class="cmain"><input name="title" placeholder="Что нужно сделать?" required aria-label="Что нужно сделать" autocomplete="off"><button type="button" class="cmore" data-act="cfopen">действия ${I('down')}</button></div><div class="cfr cextra"><label>Срок <input type="date" name="due" value="${today()}"></label><label>Время <input type="time" name="due_time"></label>${ppl}${attBtn()}<button class="btn p sm">Добавить дело</button></div><div class="cextra">${attBox()}</div></form>`; })()}</section></div>
    ${openT.length ? `<div class="tl-day"><span class="todo">Что нужно сделать</span></div>${openT.map(tlTask).join('')}` : ''}
    <div class="tl-list">${evHtml || '<p class="sub" style="text-align:center">История появится после первых действий</p>'}</div>
   </div></div>`;
};
function openFinish(d) {
  const fin = [...D.stages].sort((a, b) => a.pos - b.pos).filter(s => s.kind !== 'open');
  if (!fin.length) return toast('Добавьте этапы «Успешно» и «Отказ» в настройках этапов');
  openModal(`<h2>Завершить сделку</h2><p class="sub">Чем закончилась сделка «${esc(d.title)}»?</p><div class="acts">${fin.map(s => `<button class="btn" type="button" style="background:${s.color};color:#fff;border:0" data-fin="${s.id}">${esc(s.name)}</button>`).join('')}<span class="sp"></span><button class="btn" type="button" data-close>Отмена</button></div>`, dlg => {
    dlg.querySelectorAll('[data-fin]').forEach(b => b.addEventListener('click', () => { closeModal(); moveDeal(d, +b.dataset.fin); }));
  });
}
async function moveDeal(d, st) {
  if (!d || d.stage_id === st) return;
  d.stage_id = st; d.updated_at = Date.now(); render();
  try { await api('PUT', 'deals/' + d.id, { stage_id: st }); toast('Этап: ' + (stageOf(st)?.name || '')); await load(); render(); loadEvents(); } catch (er) { fail(er); await load(); render(); }
}

VIEWS.products = () => {
  const P_ = D.products || [], k = UI.prodKind || '';
  const list = P_.filter(x => (!k || (x.kind || 'Товар') === k) && match(x, ['name', 'sku', 'note'])).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  const used = id => D.deals.filter(d => { try { return JSON.parse(d.items || '[]').some(i => i.pid === id); } catch { return false; } }).length;
  return `<div class="head"><div><h1>Товары и услуги</h1><p class="sub">Каталог того, что вы продаёте. Отсюда товары выбираются в сделку</p></div><div class="bar"><button class="btn p" data-act="new" data-e="products">${I('plus')}Товар или услуга</button></div></div>
  <div class="tabs" style="align-self:flex-start">${[['', 'Все'], ['Товар', 'Товары'], ['Услуга', 'Услуги']].map(([v, l]) => `<button data-act="ui" data-k="prodKind" data-v="${v}" class="${k === v ? 'on' : ''}">${l} <i>${v ? P_.filter(x => (x.kind || 'Товар') === v).length : P_.length}</i></button>`).join('')}</div>
  <section class="glass panel ov-x">${list.length ? `<table class="tbl stack"><thead><tr><th>Название</th><th>Тип</th><th>Артикул</th><th>Единица</th>${money() ? '<th class="num">Цена</th>' : ''}<th class="num">В сделках</th></tr></thead><tbody>${list.map(x => `<tr class="cl" data-act="edit" data-e="products" data-id="${x.id}"><td data-l="Название"><b>${esc(x.name)}</b>${x.note ? `<div class="sub" style="font-size:12.5px">${esc(x.note.slice(0, 90))}</div>` : ''}</td><td data-l="Тип"><span class="pill ${(x.kind || 'Товар') === 'Услуга' ? 'ok' : ''}">${esc(x.kind || 'Товар')}</span></td><td data-l="Артикул">${esc(x.sku || '—')}</td><td data-l="Единица">${esc(x.unit || 'шт.')}</td>${money() ? `<td data-l="Цена" class="num"><b>${x.price != null ? rub(x.price) : '—'}</b></td>` : ''}<td data-l="В сделках" class="num">${used(x.id)}</td></tr>`).join('')}</tbody></table>`
    : empty(Q ? 'Ничего не найдено' : P_.length ? 'В этой группе пока пусто' : 'Каталог пуст. Добавьте товары и услуги, которые продаёте, — потом их можно будет выбирать в сделках.')}</section>`;
};
VIEWS.contacts = () => {
  const srcs = ['', 'Холодный звонок', 'Рекомендация', 'Сайт', 'Соцсети', 'Реклама', 'Другое'];
  const cs = D.contacts.filter(c => (!UI.src || c.source === UI.src) && match(c, ['name', 'company', 'phone', 'email', 'position'])).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  return `<div class="head"><div><h1>Клиенты</h1><p class="sub">${pl(D.contacts.length, ['клиент', 'клиента', 'клиентов'])} в базе</p></div>
  <div class="bar"><select class="f" data-ui="src" aria-label="Источник">${srcs.map(s => `<option value="${s}" ${UI.src === s ? 'selected' : ''}>${s || 'Все источники'}</option>`).join('')}</select><button class="btn p" data-act="new" data-e="contacts">${I('plus')}Клиент</button></div></div>
  <section class="glass panel ov-x">${cs.length ? `<table class="tbl stack"><thead><tr><th>Клиент</th><th>Компания</th><th>Телефон</th><th>Email</th><th>Источник</th><th class="num">Сделок</th></tr></thead><tbody>${cs.map(c => `<tr class="cl" data-act="edit" data-e="contacts" data-id="${c.id}"><td data-l="Клиент"><div class="who">${avatar(c.name, c.id, 's')}<div><b>${esc(c.name)}</b>${c.position ? `<div class="sub" style="font-size:12px">${esc(c.position)}</div>` : ''}</div></div></td><td data-l="Компания">${esc(c.company || '—')}</td><td data-l="Телефон" style="white-space:nowrap">${esc(c.phone || '—')}</td><td data-l="Email">${esc(c.email || '—')}</td><td data-l="Источник">${c.source ? `<span class="pill mu">${esc(c.source)}</span>` : '—'}</td><td data-l="Сделок" class="num">${D.deals.filter(d => d.contact_id === c.id).length}</td></tr>`).join('')}</tbody></table>` : empty(D.contacts.length ? 'Ничего не найдено' : 'Клиентов пока нет. Добавьте первого.')}</section>`;
};

VIEWS.tasks = () => {
  const t = today(), F = { open: x => !x.done, today: x => !x.done && x.due === t, over: isOver, done: x => x.done, all: () => true };
  const ts = D.tasks.filter(x => F[UI.taskTab](x) && (UI.taskMine === 'all' || x.resp_id === D.me.id) && match(x, ['title', 'note'])).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
  const T = [['open', 'Открытые'], ['today', 'Сегодня'], ['over', 'Просроченные'], ['done', 'Выполненные'], ['all', 'Все']];
  const cnt = k => D.tasks.filter(F[k]).length;
  return `<div class="head"><div><h1>Задачи</h1><p class="sub">${pl(cnt('today'), ['задача', 'задачи', 'задач'])} на сегодня${cnt('over') ? ', просрочено: ' + cnt('over') : ''}</p></div>
  <div class="bar"><div class="tabs">${T.map(x => `<button data-act="ui" data-k="taskTab" data-v="${x[0]}" class="${UI.taskTab === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div>
  <div class="tabs"><button data-act="ui" data-k="taskMine" data-v="all" class="${UI.taskMine === 'all' ? 'on' : ''}">Все</button><button data-act="ui" data-k="taskMine" data-v="mine" class="${UI.taskMine === 'mine' ? 'on' : ''}">Мои</button></div>
  <button class="btn p" data-act="new" data-e="tasks">${I('plus')}Задача</button></div></div>
  <section class="glass panel">${ts.length ? ts.map(taskRow).join('') : empty('Здесь задач нет')}</section>`;
};

const CST = { 'Черновик': 'mu', 'На согласовании': 'warn', 'Подписан': 'ok', 'Исполнен': '', 'Расторгнут': 'bad' };
VIEWS.contracts = () => {
  const cs = D.contracts.filter(c => (!UI.contractSt || c.status === UI.contractSt) && match(c, ['num', 'title', c => cById(c.contact_id)?.name, c => cById(c.contact_id)?.company])).sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);
  const signed = D.contracts.filter(c => c.status === 'Подписан');
  return `<div class="head"><div><h1>Договоры</h1><p class="sub">${pl(D.contracts.length, ['договор', 'договора', 'договоров'])}${money() && signed.length ? ', подписано на ' + rub(sum(signed, c => c.amount)) : ''}</p></div>
  <div class="bar"><select class="f" data-ui="contractSt" aria-label="Статус"><option value="">Все статусы</option>${Object.keys(CST).map(s => `<option ${UI.contractSt === s ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn p" data-act="new" data-e="contracts">${I('plus')}Договор</button></div></div>
  <section class="glass panel ov-x">${cs.length ? `<table class="tbl stack"><thead><tr><th>Номер</th><th>Предмет</th><th>Клиент</th><th>Дата</th><th>Статус</th>${money() ? '<th class="num">Сумма</th>' : ''}<th>Файл</th></tr></thead><tbody>${cs.map(c => `<tr class="cl" data-act="edit" data-e="contracts" data-id="${c.id}"><td data-l="Номер"><b>${esc(c.num)}</b></td><td data-l="Предмет">${esc(c.title || '—')}</td><td data-l="Клиент">${esc(cById(c.contact_id)?.name || '—')}</td><td data-l="Дата" style="white-space:nowrap">${fd(c.date)}</td><td data-l="Статус"><span class="pill ${CST[c.status] ?? 'mu'}">${esc(c.status || 'Черновик')}</span></td>${money() ? `<td data-l="Сумма" class="num">${c.amount ? rub(c.amount) : '—'}</td>` : ''}<td data-l="Файл">${/^https?:\/\//.test(c.link || '') ? `<a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer" data-stop>Открыть</a>` : '—'}</td></tr>`).join('')}</tbody></table>` : empty(D.contracts.length ? 'Ничего не найдено' : 'Договоров пока нет.')}</section>`;
};

VIEWS.finance = after => {
  const m = ym(today()), pm = monthShift(m, -1), tx = D.tx;
  const tot = (k, type) => sum(tx.filter(x => x.type === type && (!k || ym(x.date) === k)), x => x.amount);
  const inc = tot(m, 'Доход'), exp = tot(m, 'Расход'), profit = inc - exp, pprofit = tot(pm, 'Доход') - tot(pm, 'Расход');
  const ks = Array.from({ length: 12 }, (_, i) => monthShift(m, i - 11));
  after.push(barChart('ch2', ks.map(k => MS[+k.slice(5) - 1]), [{ name: 'доход', color: 'var(--acc)', vals: ks.map(k => tot(k, 'Доход')) }, { name: 'расход', color: 'var(--pink)', vals: ks.map(k => tot(k, 'Расход')) }], (v, s) => s ? shortRub(v) : rub(v)));
  const cats = {}; tx.filter(x => x.type === 'Расход' && ym(x.date) === m).forEach(x => { const c = x.cat || 'Без категории'; cats[c] = (cats[c] || 0) + (+x.amount || 0); });
  const ce = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const list = tx.filter(x => (UI.txType === 'all' || x.type === UI.txType) && match(x, ['cat', 'note'])).sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);
  const kp = [['finance', 'Доход за месяц', rub(inc), delta(inc, tot(pm, 'Доход')), ''], ['bag', 'Расход за месяц', rub(exp), delta(exp, tot(pm, 'Расход')), 'k'], ['up', 'Прибыль за месяц', rub(profit), delta(profit, pprofit), 'v'], ['target', 'Баланс за всё время', rub(tot('', 'Доход') - tot('', 'Расход')), '<span class="delta eq">доходы минус расходы</span>', 's']];
  return `<div class="head"><div><h1>Финансы</h1><p class="sub">${cap(MON[+m.slice(5) - 1])}: прибыль ${rub(profit)}</p></div><div class="bar"><button class="btn p" data-act="new" data-e="tx">${I('plus')}Операция</button></div></div>
  <div class="kpis">${kp.map(x => `<div class="kpi glass"><div class="ic ${x[4]}">${I(x[0])}</div><span>${x[1]}</span><b>${x[2]}</b>${x[3]}</div>`).join('')}</div>
  <div class="g2">${panel('Доходы и расходы за год', 'chart', `<div class="sub" style="margin:-6px 0 10px;display:flex;gap:16px"><span><span style="color:var(--acc)">●</span> доход</span><span><span style="color:var(--pink)">●</span> расход</span></div><div class="fig" id="ch2"><svg></svg><div class="tip"></div></div>`)}
  ${panel('Расходы месяца', 'pie', ce.length ? donut(ce.map(([n, v], i) => ({ n, v: Math.round(v), c: PALETTE[i % PALETTE.length], extra: '' })).map(x => ({ ...x, extra: rub(x.v) })), Math.round(sum(ce, x => x[1])), 'руб.').replace(/<b>(\d+)<\/b><span>руб\.<\/span>/, (s, n) => `<b style="font-size:20px">${shortRub(n)}</b><span>руб.</span>`) : empty('Расходов в этом месяце нет.'))}</div>
  <section class="glass panel"><div class="ph"><h2><span class="ic">${I('finance')}</span>Операции</h2><div class="tabs">${[['all', 'Все'], ['Доход', 'Доходы'], ['Расход', 'Расходы']].map(x => `<button data-act="ui" data-k="txType" data-v="${x[0]}" class="${UI.txType === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div></div>
  <div class="ov-x">${list.length ? `<table class="tbl stack"><thead><tr><th>Дата</th><th>Тип</th><th>Категория</th><th>Комментарий</th><th class="num">Сумма</th></tr></thead><tbody>${list.map(x => `<tr class="cl" data-act="edit" data-e="tx" data-id="${x.id}"><td data-l="Дата">${fd(x.date)}</td><td data-l="Тип"><span class="pill ${x.type === 'Доход' ? 'ok' : 'bad'}">${esc(x.type)}</span></td><td data-l="Категория">${esc(x.cat || '—')}</td><td data-l="Комментарий">${esc(x.note || '')}</td><td data-l="Сумма" class="num" style="font-weight:700;color:${x.type === 'Доход' ? 'var(--ok)' : 'var(--ink)'}">${x.type === 'Доход' ? '+' : '−'}${rub(x.amount)}</td></tr>`).join('')}</tbody></table>` : empty('Операций пока нет.')}</div></section>`;
};

const KBOPEN = new Set();
document.addEventListener('toggle', e => { const d = e.target; if (!d.matches || !d.matches('details[data-kb]')) return; const id = +d.dataset.kb; if (d.open) { KBOPEN.add(id); const x = D.kb.find(z => z.id === id), b = d.querySelector('.body'); if (x && b && !b.innerHTML) b.innerHTML = KBDOC.toHtml(x.body); } else KBOPEN.delete(id); }, true);
const KBI = { 'регламенты': 'contracts', 'продукт': 'bag', 'скрипты': 'msg' };
const kbFolders = () => [...(D.kbf || [])].sort((a, b) => (+a.pos || 0) - (+b.pos || 0) || a.id - b.id);
VIEWS.kb = () => {
  const F = kbFolders(), names = new Set(F.map(f => f.name)), cur = UI.kbCat;
  const inF = (x, n) => n === '__none' ? !x.cat || !names.has(x.cat) : x.cat === n;
  const none = D.kb.filter(x => inF(x, '__none')).length;
  const curF = F.find(f => f.name === cur);
  const a = D.kb.filter(x => (!cur || inF(x, cur)) && match(x, ['title', 'cat', 'body'])).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru'));
  const tile = (n, label, cnt, icon, f) => `<div class="kbt ${cur === n ? 'on' : ''}"><button class="kbt-b" data-act="ui" data-k="kbCat" data-v="${esc(n)}"><span class="ic">${I(icon)}</span><span class="kbt-t"><b>${esc(label)}</b><small>${pl(cnt, ['статья', 'статьи', 'статей'])}</small></span></button>${f && (may('kb', 'e') || may('kb', 'd')) ? `<button class="kbt-e" data-act="kbf" data-id="${f.id}" title="Настроить подраздел" aria-label="Настроить подраздел «${esc(label)}»">${I('more')}</button>` : ''}</div>`;
  const title = !cur ? 'Все статьи' : cur === '__none' ? 'Без подраздела' : cur;
  return `<div class="head"><div><h1>База знаний</h1><p class="sub">Регламенты, всё о продукте и скрипты продаж — в одном месте</p></div><div class="bar">${may('kb', 'c') ? `<button class="btn" data-act="kbf">${I('folder')}Подраздел</button>` : ''}<button class="btn p" data-act="kb-new">${I('plus')}Статья</button></div></div>
  <div class="kbtiles">${tile('', 'Все статьи', D.kb.length, 'kb')}${F.map(f => tile(f.name, f.name, D.kb.filter(x => x.cat === f.name).length, KBI[f.name.toLowerCase()] || 'folder', f)).join('')}${none && F.length ? tile('__none', 'Без подраздела', none, 'folder') : ''}</div>
  <div class="kbh"><h2>${esc(title)}</h2>${curF && may('kb', 'c') ? `<button class="btn sm" data-act="kb-new">${I('plus')}Добавить в «${esc(curF.name)}»</button>` : ''}</div>
  <div>${a.length ? a.map(x => { const m = kbMeta(x); return `<details class="kb glass" data-kb="${x.id}" ${KBOPEN.has(x.id) ? 'open' : ''}><summary>${I('kb')}<span class="kbs">${esc(x.title)}</span>${m ? `<span class="kbclip" title="Прикреплён файл">${I('clip')}</span>` : ''}${!cur && x.cat ? `<span class="pill">${esc(x.cat)}</span>` : ''}</summary>${KBOPEN.has(x.id) ? `<div class="body rich">${KBDOC.toHtml(x.body)}</div>` : '<div class="body rich"></div>'}
     <div class="kbact"><button class="btn sm" data-act="kb-dl" data-id="${x.id}" data-k="docx">${I('contracts')}Скачать Word</button>${m ? `<button class="btn sm" data-act="kb-dl" data-id="${x.id}" data-k="file">${I('clip')}${esc(m.name)} <small class="sub">${fsize(m.size)}</small></button>` : ''}<span class="sp"></span>${may('kb', 'e') ? `<button class="btn sm" data-act="edit" data-e="kb" data-id="${x.id}">${I('edit')}Редактировать</button>` : `<button class="btn sm" data-act="edit" data-e="kb" data-id="${x.id}">Открыть</button>`}</div></details>`; }).join('')
    : `<section class="glass">${empty(Q ? 'Ничего не найдено' : curF ? 'В подразделе «' + esc(curF.name) + '» пока нет статей' : 'Статей пока нет')}</section>`}</div>`;
};
// ---------- статья базы знаний: редактор с оформлением и документы ----------
const kbMeta = x => { try { return JSON.parse(x.file || 'null'); } catch { return null; } };
const fileSafe = s => String(s || 'Статья').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Статья';
// сохранить файл на компьютер (в предпросмотре — через окно подтверждения Claude)
async function saveFile(name, blob) {
  if (window.CRM_PREVIEW && window.claude && window.claude.use) {
    const dl = await window.claude.use('downloads').catch(() => null);
    if (!dl) return toast('В этом окне скачивание недоступно — на сервере файл скачается');
    try { await dl.save({ filename: name, data: blob }); } catch (e) { if (e && e.code === 'rejected_extension') toast('Этот формат здесь не скачивается — на сервере файл скачается'); else if (e && e.code !== 'declined') toast('Не удалось сохранить файл'); }
    return;
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function kbDownload(id, kind) {
  const x = D.kb.find(z => z.id === id); if (!x) return;
  try {
    if (kind === 'docx') return await saveFile(fileSafe(x.title) + '.docx', KBDOC.htmlToDocx(x.title, KBDOC.toHtml(x.body)));
    const m = kbMeta(x); const r = await fetch('/api/kb/' + id + '/file', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('Файл не найден');
    await saveFile(m.name, await r.blob());
  } catch (e) { toast(e.message || 'Не удалось скачать файл'); }
}
const RTE_FONTS = [['', 'Шрифт'], ['Manrope', 'Manrope'], ['Arial', 'Arial'], ['Times New Roman', 'Times New Roman'], ['Georgia', 'Georgia'], ['Verdana', 'Verdana'], ['Courier New', 'Courier New']];
const RTE_SIZES = [['', 'Размер'], ['12px', '12'], ['14px', '14'], ['16px', '16'], ['18px', '18'], ['20px', '20'], ['24px', '24'], ['32px', '32']];
const RTE_COLORS = ['#141a3a', '#e11d48', '#ea580c', '#d97706', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#64748b'];
const rb = (cmd, icon, title, extra = '') => `<button type="button" class="rtb" data-cmd="${cmd}" title="${title}" aria-label="${title}" ${extra}>${icon}</button>`;
function openKb(id, preset = {}) {
  const x = id ? D.kb.find(z => z.id === id) : null;
  if (id && !x) return;
  const ro = id ? !may('kb', 'e') : !may('kb', 'c');
  if (ro && !id) return toast('У вас нет права добавлять статьи');
  const st = { file: x ? kbMeta(x) : null, upload: null, removeFile: false };
  const L = kbFolders().map(f => f.name), cat = x ? x.cat : preset.cat || '';
  const tools = ro ? '' : `<div class="rtbar" role="toolbar" aria-label="Оформление текста">
     <select data-rt="block" aria-label="Стиль абзаца"><option value="p">Обычный текст</option><option value="h1">Заголовок 1</option><option value="h2">Заголовок 2</option><option value="h3">Заголовок 3</option></select>
     <select data-rt="font" aria-label="Шрифт">${RTE_FONTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
     <select data-rt="size" aria-label="Размер">${RTE_SIZES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
     <span class="rts"></span>
     ${rb('bold', '<b>Ж</b>', 'Жирный (Ctrl+B)')}${rb('italic', '<i>К</i>', 'Курсив (Ctrl+I)')}${rb('underline', '<u>Ч</u>', 'Подчёркнутый (Ctrl+U)')}${rb('strikeThrough', '<s>З</s>', 'Зачёркнутый')}${rb('upper', 'АА', 'Прописные буквы')}${rb('lower', 'аа', 'Строчные буквы')}
     <span class="rts"></span>
     <span class="rtc"><button type="button" class="rtb" data-pop="fc" title="Цвет текста" aria-label="Цвет текста"><span class="rtA">А</span></button><button type="button" class="rtb" data-pop="bc" title="Цвет выделения" aria-label="Цвет выделения"><span class="rtM">А</span></button>
      <div class="rtpop" hidden>${RTE_COLORS.map(c => `<button type="button" style="background:${c}" data-color="${c}" aria-label="Цвет ${c}"></button>`).join('')}<button type="button" class="rtnone" data-color="" aria-label="Без цвета">✕</button></div></span>
     <span class="rts"></span>
     ${rb('insertUnorderedList', '•≡', 'Маркированный список')}${rb('insertOrderedList', '1≡', 'Нумерованный список')}${rb('justifyLeft', '⇤', 'По левому краю')}${rb('justifyCenter', '↔', 'По центру')}${rb('justifyRight', '⇥', 'По правому краю')}
     <span class="rts"></span>
     ${rb('removeFormat', 'T̸', 'Убрать оформление')}${rb('undo', '↶', 'Отменить (Ctrl+Z)')}${rb('redo', '↷', 'Повторить')}
    </div>`;
  openModal(`<form id="kbf" class="kbform" novalidate><h2>${id ? (ro ? 'Статья' : 'Редактирование статьи') : 'Новая статья'}</h2>
    <label>Заголовок *<input name="title" value="${esc(x ? x.title : '')}" required maxlength="300" ${ro ? 'readonly' : ''}></label>
    <label>Подраздел *<select name="cat" required ${ro ? 'disabled' : ''}>${!cat || !L.includes(cat) ? '<option value="" disabled selected>Выберите подраздел</option>' : ''}${L.map(n => `<option value="${esc(n)}" ${n === cat ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    ${ro ? '' : `<div class="kbdrop" id="kbdrop"><span class="ic">${I('upload')}</span><div><b>Загрузить документ</b><small>Word, PDF или TXT — текст сам появится в статье, а файл прикрепится к ней. Можно перетащить файл сюда.</small></div><label class="btn sm">Выбрать файл<input type="file" id="kbfi" accept=".docx,.pdf,.txt,.doc,.rtf,.odt" hidden></label></div>`}
    <div id="kbfile"></div>
    <div class="rtwrap"><div class="sub" style="font-size:13px;font-weight:600">Текст статьи</div>${tools}
     <div class="rte" id="rte" ${ro ? '' : 'contenteditable="true"'} role="textbox" aria-multiline="true" aria-label="Текст статьи" data-ph="Напишите текст или загрузите документ выше">${x ? KBDOC.toHtml(x.body) : ''}</div></div>
    <p class="sub" style="font-size:12.5px;margin:0">${I('contracts')} Из каждой статьи можно скачать документ Word с этим текстом и оформлением.</p>
    <p class="err" id="kbe" role="alert"></p>
    <div class="acts">${id && may('kb', 'd') ? `<button class="btn d" type="button" data-kbdel>${I('trash')}Удалить</button>` : ''}<span class="sp"></span><button class="btn" type="button" data-close>${ro ? 'Закрыть' : 'Отмена'}</button>${ro ? '' : `<button class="btn p">${id ? 'Сохранить' : 'Создать статью'}</button>`}</div>
   </form>`, dlg => {
    dlg.classList.add('wide');
    const f = dlg.querySelector('form'), ed = dlg.querySelector('#rte'), er = dlg.querySelector('#kbe'), fileBox = dlg.querySelector('#kbfile');
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    const drawFile = () => {
      const m = st.upload ? { name: st.upload.name, size: st.upload.size } : st.removeFile ? null : st.file;
      fileBox.innerHTML = m ? `<div class="kbfile">${I('clip')}<span><b>${esc(m.name)}</b><small>${fsize(m.size)} · прикреплён к статье</small></span>${ro ? '' : '<button type="button" class="lnk" data-rmfile>убрать</button>'}</div>` : '';
      fileBox.querySelector('[data-rmfile]')?.addEventListener('click', () => { st.upload = null; st.removeFile = !!st.file; drawFile(); });
    };
    drawFile();
    if (ro) return;
    try { document.execCommand('styleWithCSS', false, true); document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {}
    // выделение сохраняем, чтобы списки и цвета применялись к нему
    let range = null;
    const keep = () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
    const restore = () => { ed.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
    document.addEventListener('selectionchange', keep);
    const off = new MutationObserver(() => { if (!document.body.contains(ed)) { document.removeEventListener('selectionchange', keep); off.disconnect(); } });
    off.observe(document.body, { childList: true, subtree: true });
    const wrapStyle = (prop, val) => { // шрифт и размер: каждый кусочек выделенного текста оборачиваем в span
      restore(); const sl = getSelection(); if (!sl.rangeCount || sl.isCollapsed) return toast('Сначала выделите текст');
      const r = sl.getRangeAt(0), rootN = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer;
      const tw = document.createTreeWalker(rootN, NodeFilter.SHOW_TEXT), nodes = [];
      for (let n = tw.nextNode(); n; n = tw.nextNode()) if (r.intersectsNode(n) && n.data.length) nodes.push(n);
      if (rootN.nodeType === 3) nodes.push(rootN);
      const sc = r.startContainer, so = r.startOffset, ec = r.endContainer, eo = r.endOffset, made = [];
      for (let n of nodes) {
        let a = n === sc ? so : 0, z = n === ec ? eo : n.length; if (a >= z) continue;
        if (z < n.length) n.splitText(z);
        if (a > 0) n = n.splitText(a);
        const par = n.parentNode;
        if (par.tagName === 'SPAN' && par.childNodes.length === 1) { par.style[prop] = val; made.push(par); continue; }
        const sp = document.createElement('span'); sp.style[prop] = val; par.insertBefore(sp, n); sp.appendChild(n); made.push(sp);
      }
      if (made.length) { const nr = document.createRange(); nr.setStart(made[0], 0); nr.setEnd(made[made.length - 1], made[made.length - 1].childNodes.length); sl.removeAllRanges(); sl.addRange(nr); }
      keep();
    };
    dlg.querySelectorAll('.rtb[data-cmd]').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
    dlg.querySelector('.rtbar').addEventListener('click', e => {
      const b = e.target.closest('[data-cmd]'); if (!b) return;
      const c = b.dataset.cmd; restore();
      if (c === 'upper' || c === 'lower') { // меняем регистр букв, сохраняя оформление
        const sl = getSelection(); if (!sl.rangeCount || sl.isCollapsed) return toast('Сначала выделите текст');
        const r = sl.getRangeAt(0), tw = document.createTreeWalker(r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
        const sc = r.startContainer, so = r.startOffset, ec = r.endContainer, eo = r.endOffset;
        for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!r.intersectsNode(n)) continue; const a = n === sc ? so : 0, z = n === ec ? eo : n.length, v = n.data; const mid = v.slice(a, z); n.data = v.slice(0, a) + (c === 'upper' ? mid.toUpperCase() : mid.toLowerCase()) + v.slice(z); }
        const nr = document.createRange(); nr.setStart(sc, so); nr.setEnd(ec, eo); sl.removeAllRanges(); sl.addRange(nr); return keep();
      }
      document.execCommand(c, false, null); keep();
    });
    const pop = dlg.querySelector('.rtpop'); let popMode = 'fc';
    dlg.querySelectorAll('[data-pop]').forEach(b => { b.addEventListener('mousedown', e => e.preventDefault()); b.addEventListener('click', () => { popMode = b.dataset.pop; pop.hidden = !pop.hidden; pop.dataset.mode = popMode; }); });
    pop.addEventListener('mousedown', e => e.preventDefault());
    pop.addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (!b) return; restore(); const c = b.dataset.color; if (popMode === 'fc') document.execCommand('foreColor', false, c || '#141a3a'); else document.execCommand('hiliteColor', false, c || 'transparent'); pop.hidden = true; keep(); });
    dlg.querySelector('[data-rt=block]').addEventListener('change', e => { restore(); document.execCommand('formatBlock', false, e.target.value); keep(); e.target.value = 'p'; });
    dlg.querySelector('[data-rt=font]').addEventListener('change', e => { if (e.target.value) wrapStyle('fontFamily', e.target.value); e.target.value = ''; });
    dlg.querySelector('[data-rt=size]').addEventListener('change', e => { if (e.target.value) wrapStyle('fontSize', e.target.value); e.target.value = ''; });
    // вставка из Word и сайтов: оставляем только оформление текста
    ed.addEventListener('paste', e => {
      const h = e.clipboardData.getData('text/html'), t = e.clipboardData.getData('text/plain');
      e.preventDefault(); document.execCommand('insertHTML', false, h ? KBDOC.clean(h.replace(/<!--[\s\S]*?-->/g, '')) : KBDOC.textToHtml(t));
    });
    // загрузка документа
    const take = async file => {
      if (!file) return; er.textContent = '';
      const max = (window.CRM_MAX_FILE_MB || 20) * 1048576;
      if (file.size > max) return er.textContent = `Файл больше ${Math.round(max / 1048576)} МБ`;
      if (!/\.(docx|pdf|txt|doc|rtf|odt)$/i.test(file.name)) return er.textContent = 'Подходят файлы Word (DOCX, DOC), PDF, TXT, RTF и ODT';
      const drop = dlg.querySelector('#kbdrop'); drop.classList.add('busy');
      try {
        const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(new Error('Не удалось прочитать файл')); r.readAsDataURL(file); });
        st.upload = { name: file.name, size: file.size, data }; st.removeFile = false; drawFile();
        if (!f.title.value.trim()) f.title.value = file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
        try {
          const html = KBDOC.clean(await KBDOC.fileToHtml(file));
          const emptyEd = !ed.textContent.trim();
          if (emptyEd || await ask('Заменить текст статьи?', 'В статье уже есть текст. Заменить его текстом из документа «' + file.name + '»?', { yes: 'Заменить', no: 'Оставить мой текст', ok: 1 })) ed.innerHTML = html;
          toast('Текст из документа добавлен, файл прикреплён');
        } catch (x) { er.textContent = x.message + (x.scan ? '. Файл прикреплён к статье, текст можно вписать вручную' : ''); }
      } catch (x) { er.textContent = x.message; }
      drop.classList.remove('busy');
    };
    dlg.querySelector('#kbfi').addEventListener('change', e => { take(e.target.files[0]); e.target.value = ''; });
    const dz = dlg.querySelector('#kbdrop');
    ['dragenter', 'dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', e => take(e.dataTransfer.files[0]));
    dlg.querySelector('[data-kbdel]')?.addEventListener('click', async () => {
      if (!await ask('Удалить статью?', 'Статья «' + x.title + '» будет удалена вместе с прикреплённым файлом.')) return;
      try { await api('DELETE', 'kb/' + id); closeModal(); toast('Статья удалена'); await load(); render(); } catch (z) { er.textContent = z.message; }
    });
    f.addEventListener('submit', async e => {
      e.preventDefault(); er.textContent = '';
      const title = f.title.value.trim(), c = f.cat.value, body = KBDOC.clean(ed.innerHTML);
      if (!title) return er.textContent = 'Введите заголовок';
      if (!c) return er.textContent = 'Выберите подраздел';
      if (!ed.textContent.trim() && !st.upload && !(st.file && !st.removeFile)) return er.textContent = 'Напишите текст статьи или загрузите документ';
      const b = f.querySelector('button.p'); b.disabled = true;
      try {
        const payload = { title, cat: c, body };
        if (st.upload) payload.upload = { name: st.upload.name, data: st.upload.data }; else if (st.removeFile) payload.removeFile = true;
        await api(id ? 'PUT' : 'POST', 'kb' + (id ? '/' + id : ''), payload);
        closeModal(); toast(id ? 'Статья сохранена' : 'Статья создана'); UI.kbCat = c; await load(); render();
      } catch (z) { er.textContent = z.message; b.disabled = false; }
    });
    setTimeout(() => (id ? ed : f.title).focus(), 40);
  });
}

function openKbf(id) {
  const f = id ? (D.kbf || []).find(x => x.id === id) : { name: '' };
  if (!f) return;
  const n = id ? D.kb.filter(x => x.cat === f.name).length : 0, F = kbFolders(), idx = F.findIndex(x => x.id === id);
  openModal(`<form id="kff"><div style="display:grid;gap:14px"><h2>${id ? 'Подраздел' : 'Новый подраздел'}</h2>
   <label>Название *<input name="name" value="${esc(f.name)}" required maxlength="60" placeholder="Например, Возражения"></label>
   ${id && n && may('kb', 'd') && F.length > 1 ? `<label>При удалении перенести ${pl(n, ['статью', 'статьи', 'статей'])} в<select name="moveTo">${F.filter(x => x.id !== id).map(x => `<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</select></label>` : ''}
   ${id && may('kb', 'e') && F.length > 1 ? `<div class="bar"><button class="btn sm" type="button" data-mv="-1" ${idx <= 0 ? 'disabled' : ''}>← Левее</button><button class="btn sm" type="button" data-mv="1" ${idx >= F.length - 1 ? 'disabled' : ''}>Правее →</button></div>` : ''}
   <p class="err" id="kfe"></p>
   <div class="acts">${id && may('kb', 'd') && F.length > 1 ? '<button class="btn d" type="button" data-del>Удалить</button>' : ''}<span class="sp"></span><button class="btn" type="button" data-close>Отмена</button>${(id ? may('kb', 'e') : may('kb', 'c')) ? `<button class="btn p">${id ? 'Сохранить' : 'Создать'}</button>` : ''}</div></div></form>`, dlg => {
    const fm = dlg.querySelector('form'), er = dlg.querySelector('#kfe');
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    fm.addEventListener('submit', async e => {
      e.preventDefault(); const name = fm.name.value.trim(); if (!name) return er.textContent = 'Введите название';
      try { await api(id ? 'PUT' : 'POST', 'kbf' + (id ? '/' + id : ''), { name }); closeModal(); if (!id || UI.kbCat === f.name) UI.kbCat = name; toast(id ? 'Подраздел сохранён' : 'Подраздел создан'); await load(); render(); } catch (x) { er.textContent = x.message; }
    });
    fm.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', async () => {
      const L = F.slice(), j = idx + +b.dataset.mv;[L[idx], L[j]] = [L[j], L[idx]];
      try { await Promise.all(L.map((x, i) => +x.pos === i ? null : api('PUT', 'kbf/' + x.id, { pos: i }))); await load(); render(); openKbf(id); } catch (x) { er.textContent = x.message; }
    }));
    fm.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!await ask('Удалить подраздел?', 'Подраздел «' + f.name + '» будет удалён.' + (n ? ' ' + cap(pl(n, ['статья перейдёт', 'статьи перейдут', 'статей перейдут'])) + ' в подраздел «' + (fm.moveTo?.value || '') + '».' : ''))) return;
      try { await api('DELETE', 'kbf/' + id, { moveTo: fm.moveTo?.value }); closeModal(); if (UI.kbCat === f.name) UI.kbCat = ''; toast('Подраздел удалён'); await load(); render(); } catch (x) { er.textContent = x.message; }
    });
  });
}

const SEC_NAMES = { dashboard: 'Дашборд', deals: 'Сделки', contacts: 'Клиенты', products: 'Товары', tasks: 'Задачи', contracts: 'Договоры', finance: 'Финансы', kb: 'База знаний' };
VIEWS.team = () => {
  const T = (D.team || []).filter(x => match(x, ['name', 'email', 'position']));
  const emp = (D.team || []).filter(x => x.role !== 'director');
  const access = accessSummary;
  const st = x => x.role === 'director' ? '<span class="pill">Директор</span>' : x.status === 'active' ? '<span class="pill ok">Активен</span>' : x.status === 'blocked' ? '<span class="pill bad">Заблокирован</span>' : '<span class="pill warn">Ждёт пароль</span>';
  return `<div class="head"><div><h1>Сотрудники</h1><p class="sub">Кто в сети, когда заходил и что видит</p></div><div class="bar"><button class="btn p" data-act="invite">${I('send')}Пригласить сотрудника</button></div></div>
  <div class="stats"><span class="pill ok" style="padding:8px 14px">В сети: ${emp.filter(x => x.online).length}</span><span class="pill mu" style="padding:8px 14px">Всего сотрудников: ${emp.length}</span><span class="pill warn" style="padding:8px 14px">Ждут активации: ${emp.filter(x => x.status === 'invited').length}</span></div>
  <section class="glass panel ov-x"><table class="tbl stack"><thead><tr><th>Сотрудник</th><th>Логин</th><th>Статус</th><th>Активность</th><th>Доступ</th><th></th></tr></thead><tbody>
  ${T.map(x => `<tr ${x.role !== 'director' && x.id !== D.me.id ? `class="cl" data-act="member" data-id="${x.id}"` : ''}><td data-l="Сотрудник"><div class="who">${avatar(x.name, x.id, '', x.status === 'active' ? x.online : undefined)}<div><b>${esc(x.name)}</b><div class="sub" style="font-size:12px">${esc(x.position || '')}</div></div></div></td>
  <td data-l="Логин">${esc(x.email)}</td><td data-l="Статус">${st(x)}</td><td data-l="Активность">${online(x)}${workPill(x)}</td>
  <td data-l="Доступ" style="max-width:340px">${access(x)}</td><td>${x.role !== 'director' && x.id !== D.me.id ? `<button class="btn sm" data-act="member" data-id="${x.id}">Настроить</button>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
};

const RST = { new: ['Новая', 'warn'], approved: ['Одобрена', 'ok'], rejected: ['Отклонена', 'bad'] };
VIEWS.requests = () => {
  const all = D.requests || [], st = UI.reqSt || 'new';
  const R = all.filter(r => (st === 'all' || r.status === st) && match(r, ['company', 'inn', 'name', 'email', 'phone'])).sort((a, b) => b.created_at - a.created_at);
  const doc = (r, x, i) => /^data:image/.test(x.url) ? `<button class="lnk" data-act="preview" data-r="${r.id}" data-i="${i}">${esc(x.name)}</button>` : /^data:/.test(x.url) ? `<span>${esc(x.name)}</span>` : `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`;
  return `<div class="head"><div><h1>Заявки на подключение</h1><p class="sub">Компании, которые оставили заявку. Проверьте документы и оплату — после подключения директор получит пароль на почту.</p></div></div>
  <div class="tabs" style="align-self:flex-start">${[['new', 'Новые'], ['approved', 'Одобренные'], ['rejected', 'Отклонённые'], ['all', 'Все']].map(x => `<button data-act="ui" data-k="reqSt" data-v="${x[0]}" class="${st === x[0] ? 'on' : ''}">${x[1]} <em class="sub">${x[0] === 'all' ? all.length : all.filter(r => r.status === x[0]).length}</em></button>`).join('')}</div>
  <section class="glass panel ov-x">${R.length ? `<table class="tbl stack"><thead><tr><th>Компания</th><th>Контакт</th><th>Документы</th><th>Тариф</th><th>Дата</th><th>Статус</th><th></th></tr></thead><tbody>${R.map(r => `<tr>
   <td data-l="Компания"><b>${esc(r.company)}</b><div class="sub" style="font-size:12px">ИНН ${esc(r.inn)}</div></td>
   <td data-l="Контакт">${esc(r.name)}<div class="sub" style="font-size:12px">${esc(r.phone)}<br>${esc(r.email)}</div></td>
   <td data-l="Документы">${(r.files || []).map((x, i) => doc(r, x, i)).join('<br>') || '—'}</td>
   <td data-l="Тариф">${r.plan ? `${esc(planOf(r.plan).name)} · ${rub(r.amount)}` : '—'}</td>
   <td data-l="Дата" style="white-space:nowrap">${fdt(r.created_at)}</td>
   <td data-l="Статус"><span class="pill ${RST[r.status][1]}">${RST[r.status][0]}</span></td>
   <td>${r.status === 'new' ? `<div class="bar" style="flex-wrap:nowrap"><button class="btn sm p" data-act="req-ok" data-id="${r.id}">Подключить</button><button class="btn sm d" data-act="req-no" data-id="${r.id}">Отклонить</button></div>` : ''}</td></tr>`).join('')}</tbody></table>` : empty(st === 'new' ? 'Новых заявок нет' : 'Здесь пока пусто')}</section>`;
};

VIEWS.profile = () => `<div class="head"><div><h1>Настройки</h1><p class="sub">Профиль, пароль и оформление</p></div></div>
  <div class="g2e"><section class="glass panel profsec"><div class="ph"><h2><span class="ic">${I('user')}</span>Профиль</h2></div>
   <div class="who pwho" style="display:flex;gap:16px;align-items:center"><button class="avedit" data-act="ava-pick" title="Сменить фото" aria-label="Сменить фото профиля">${avatar(D.me.name, D.me.id, 'xl')}<span>${I('upload')}</span></button><div><b style="font-size:17px">${esc(D.me.name)}</b><div class="sub">${dir() ? 'Директор' : esc(D.me.position || 'Сотрудник')}</div><div class="sub">Логин: ${esc(D.me.email)}</div><div class="bar" style="margin-top:12px;gap:8px"><button class="btn" data-act="ava-pick">${I('upload')}${AVA[D.me.id] ? 'Сменить фото' : 'Загрузить фото'}</button>${AVA[D.me.id] ? '<button class="btn d" data-act="ava-del">Удалить фото</button>' : ''}</div></div></div>
   <div class="ptheme"><h2 style="margin:0 0 12px">Тема оформления</h2><div class="themesw" style="max-width:360px"><button data-act="theme" data-v="light" class="${theme() === 'light' ? 'on' : ''}">${I('sun')}Светлая</button><button data-act="theme" data-v="dark" class="${theme() === 'dark' ? 'on' : ''}">${I('moon')}Тёмная</button></div></div></section>
  <section class="glass panel"><div class="ph"><h2><span class="ic">${I('lock')}</span>Смена пароля</h2></div>
   <form id="pf" class="dlg" style="box-shadow:none;border:0;padding:0;background:none;width:100%"><label>Текущий пароль<input type="password" name="old" autocomplete="current-password" required></label>
   <label>Новый пароль<input type="password" name="password" autocomplete="new-password" minlength="8" required></label><label>Повторите новый пароль<input type="password" name="password2" autocomplete="new-password" required></label>
   <p class="err" id="pe"></p><div><button class="btn p">Сменить пароль</button></div><p class="sub" style="font-size:13px">После смены пароля другие ваши устройства будут разлогинены.</p></form></section></div>`;

// ---------- формы ----------
const SRC = ['', 'Холодный звонок', 'Рекомендация', 'Сайт', 'Соцсети', 'Реклама', 'Другое'];
const FIELDS = {
  deals: [{ k: 'title', l: 'Клиент / название сделки', req: 1 }, { k: 'contact_id', l: 'Контакт клиента', t: 'contact' }, { k: 'stage_id', l: 'Этап', t: 'stage', h: 1 }, { k: 'resp_id', l: 'Ответственный', t: 'person', h: 1, own: 1 },
    { k: 'amount', l: 'Сумма сделки, руб.', t: 'money' }, { k: 'next', l: 'Следующий шаг', h: 1 }, { k: 'next_date', l: 'Дата шага', t: 'date', h: 1 }, { k: 'note', l: 'Комментарий', t: 'area' }],
  contacts: [{ k: 'name', l: 'Имя клиента', req: 1 }, { k: 'company', l: 'Компания', h: 1 }, { k: 'position', l: 'Должность', h: 1 }, { k: 'phone', l: 'Телефон', t: 'tel', h: 1 }, { k: 'email', l: 'Email', t: 'email', h: 1 }, { k: 'source', l: 'Источник', t: 'sel', o: SRC }, { k: 'note', l: 'Заметки', t: 'area' }],
  tasks: [{ k: 'title', l: 'Задача', req: 1 }, { k: 'kind', l: 'Тип', t: 'sel', o: ['Задача', 'Дело'], h: 1 }, { k: 'prio', l: 'Приоритет', t: 'sel', o: ['Обычный', 'Высокий'], h: 1 }, { k: 'due', l: 'Крайний срок', t: 'date', h: 1 }, { k: 'due_time', l: 'Время', t: 'time', h: 1 }, { k: 'resp_id', l: 'Ответственный', t: 'person', h: 1 }, { k: 'deal_id', l: 'Сделка', t: 'deal', h: 1 }, { k: 'note', l: 'Описание', t: 'area' }],
  contracts: [{ k: 'num', l: 'Номер договора', req: 1, h: 1 }, { k: 'date', l: 'Дата', t: 'date', h: 1 }, { k: 'title', l: 'Предмет договора' }, { k: 'contact_id', l: 'Клиент', t: 'contact0', h: 1 }, { k: 'deal_id', l: 'Сделка', t: 'deal', h: 1 },
    { k: 'status', l: 'Статус', t: 'sel', o: Object.keys(CST), h: 1 }, { k: 'amount', l: 'Сумма, руб.', t: 'money', h: 1 }, { k: 'link', l: 'Ссылка на файл договора (Яндекс Диск, Google Drive)', t: 'url' }, { k: 'note', l: 'Комментарий', t: 'area' }],
  kb: [{ k: 'title', l: 'Заголовок', req: 1 }, { k: 'cat', l: 'Подраздел', t: 'kbf', req: 1 }, { k: 'body', l: 'Текст', t: 'area', lg: 1 }],
  products: [{ k: 'name', l: 'Название', req: 1 }, { k: 'kind', l: 'Тип', t: 'sel', o: ['Товар', 'Услуга'], h: 1 }, { k: 'unit', l: 'Единица', t: 'sel', o: ['шт.', 'услуга', 'час', 'день', 'мес.', 'комплект', 'кг', 'м', 'м²', 'л'], h: 1 }, { k: 'price', l: 'Цена, руб.', t: 'money', h: 1 }, { k: 'sku', l: 'Артикул', h: 1 }, { k: 'note', l: 'Описание', t: 'area' }],
  tx: [{ k: 'type', l: 'Тип', t: 'sel', o: ['Доход', 'Расход'], h: 1 }, { k: 'date', l: 'Дата', t: 'date', req: 1, h: 1 }, { k: 'amount', l: 'Сумма, руб.', t: 'num', req: 1 }, { k: 'cat', l: 'Категория (Оплата клиента, Реклама, Зарплата…)' }, { k: 'note', l: 'Комментарий' }],
};
const TITLES = { products: ['Новый товар или услуга', 'Товар или услуга'], deals: ['Новая сделка', 'Сделка'], contacts: ['Новый клиент', 'Клиент'], tasks: ['Новая задача', 'Задача'], contracts: ['Новый договор', 'Договор'], kb: ['Новая статья', 'Статья'], tx: ['Новая операция', 'Операция'] };
function fieldHtml(f, v) {
  const r = f.req ? 'required' : '', o = (arr, sel) => arr.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(sel ?? '') ? 'selected' : ''}>${esc(lab)}</option>`).join('');
  let h;
  switch (f.t) {
    case 'sel': h = `<select name="${f.k}">${o(f.o.map(x => [x, x || '—']), v)}</select>`; break;
    case 'contact': case 'contact0': h = `<select name="${f.k}" data-nc><option value="">—</option>${f.t === 'contact' && can('contacts') ? '<option value="__new">+ Новый клиент…</option>' : ''}${o(D.contacts.map(c => [c.id, c.name + (c.company ? ' (' + c.company + ')' : '')]), v)}</select>`; break;
    case 'kbf': { const L = kbFolders().map(f => f.name); if (v && !L.includes(v)) L.push(v); h = `<select name="${f.k}" required>${!v || !L.includes(v) ? '<option value="" disabled selected>Выберите подраздел</option>' : ''}${o(L.map(n => [n, n]), v)}</select>`; break; }
    case 'stage': h = `<select name="${f.k}">${o([...D.stages].sort((a, b) => a.pos - b.pos).map(s => [s.id, s.name]), v)}</select>`; break;
    case 'person': h = `<select name="${f.k}"><option value="">—</option>${o(D.people.map(p => [p.id, p.name]), v)}</select>`; break;
    case 'deal': h = `<select name="${f.k}"><option value="">—</option>${o(D.deals.map(d => [d.id, d.title]), v)}</select>`; break;
    case 'area': h = `<textarea name="${f.k}" class="${f.lg ? 'lg' : ''}">${esc(v)}</textarea>`; break;
    case 'date': h = `<input type="date" name="${f.k}" value="${esc(v)}" ${r}>`; break;
    case 'time': h = `<input type="time" name="${f.k}" value="${esc(v)}">`; break;
    case 'money': case 'num': h = `<input type="number" inputmode="decimal" min="0" step="0.01" name="${f.k}" value="${esc(v ?? '')}" ${r}>`; break;
    case 'tel': case 'email': case 'url': h = `<input type="${f.t}" name="${f.k}" value="${esc(v)}" autocomplete="off">`; break;
    default: h = `<input name="${f.k}" value="${esc(v)}" ${r} autocomplete="off">`;
  }
  return `<label>${f.l}${f.req ? ' *' : ''}${h}</label>`;
}
function openModal(html, mount) {
  const m = $('#modal'); m.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  mount && mount(m.firstElementChild);
  setTimeout(() => m.querySelector('input:not([readonly]),select,textarea')?.focus(), 30);
}
function ask(title, text, o = {}) {
  return new Promise(res => {
    let c = $('#cfm');
    if (!c) { c = document.createElement('div'); c.id = 'cfm'; c.className = 'ov cfm'; document.body.appendChild(c); }
    c.innerHTML = `<div class="dlg sm" role="alertdialog" aria-modal="true" aria-labelledby="cfmt"><h2 id="cfmt">${esc(title)}</h2><p class="sub">${esc(text)}</p><div class="acts"><button class="btn" type="button" data-a="0">${esc(o.no || 'Нет')}</button><span class="sp"></span><button class="btn ${o.ok ? 'p' : 'dl'}" type="button" data-a="1">${esc(o.yes || 'Да')}</button></div></div>`;
    c.hidden = false;
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    const done = v => { c.hidden = true; c.innerHTML = ''; document.removeEventListener('keydown', key, true); res(v); };
    document.addEventListener('keydown', key, true);
    c.onclick = e => { e.stopPropagation(); const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1'); else if (e.target === c) done(false); };
    c.querySelector('[data-a="0"]').focus();
  });
}
const closeModal = () => { $('#modal').hidden = true; $('#modal').innerHTML = ''; };
const ITEMS = { products: () => D.products || [], deals: () => D.deals, contacts: () => D.contacts, tasks: () => D.tasks, contracts: () => D.contracts, kb: () => D.kb, tx: () => D.tx };
function openForm(e, id, preset = {}) {
  if (e === 'kb') return openKb(id, preset);
  const sec = SEC_OF[e], ro = id ? !may(sec, 'e') : !may(sec, 'c');
  if (ro && !id) return toast('У вас нет права добавлять записи в этом разделе');
  const it = id ? ITEMS[e]().find(x => x.id === id) || {} : { ...preset };
  if (!id) { if (e === 'tx') { it.type = it.type || 'Доход'; it.date = today(); } if (e === 'contracts') { it.date = today(); it.status = 'Черновик'; } if (e === 'deals') { it.stage_id = it.stage_id || [...D.stages].sort((a, b) => a.pos - b.pos)[0]?.id; it.resp_id = it.resp_id || D.me.id; } if (e === 'tasks') { it.resp_id = it.resp_id || D.me.id; it.kind = it.kind || 'Задача'; } }
  const fs = FIELDS[e].filter(f => (f.t !== 'money' || money()) && !(f.own && P().onlyOwn));
  let body = '', buf = [];
  const flush = () => { if (buf.length) { body += buf.length === 2 ? `<div class="two">${buf.join('')}</div>` : buf.join(''); buf = []; } };
  fs.forEach(f => { const h = fieldHtml(f, it[f.k]); if (f.h) { buf.push(h); if (buf.length === 2) flush(); } else { flush(); body += h; } if (f.t === 'contact') { flush(); body += `<div class="two" id="nc" hidden><label>Имя нового клиента *<input name="nc_name"></label><label>Телефон<input name="nc_phone" type="tel"></label><label>Компания<input name="nc_company"></label><label>Источник<select name="nc_source">${SRC.map(s => `<option>${s}</option>`).join('')}</select></label></div>`; } });
  flush();
  const extra = e === 'contacts' && id ? (() => { const ds = D.deals.filter(d => d.contact_id === id); return ds.length ? `<div class="note"><b>Сделки клиента:</b> ${ds.map(d => esc(d.title) + ' — ' + esc(stageOf(d.stage_id)?.name || '')).join('; ')}</div>` : ''; })() : '';
  openModal(`<form id="ef"><div style="display:grid;gap:14px"><h2>${id ? TITLES[e][1] : TITLES[e][0]}${ro ? ' <span class="pill mu">просмотр</span>' : ''}</h2>${body}${extra}<p class="err" id="fe"></p>
   ${ro ? `<p class="note">У вас нет права изменять эту запись — только просмотр.</p><div class="acts"><button class="btn" type="button" data-close>Закрыть</button><span class="sp"></span>${id && may(sec, 'd') ? '<button class="btn d" type="button" data-del>Удалить</button>' : ''}</div>` : `<div class="acts"><button class="btn p" type="submit">Сохранить</button><button class="btn" type="button" data-close>Отмена</button><span class="sp"></span>${id && may(sec, 'd') ? '<button class="btn d" type="button" data-del>Удалить</button>' : ''}</div>`}</div></form>`, dlg => {
    const f = dlg.querySelector('form');
    if (ro) f.querySelectorAll('input,select,textarea').forEach(x => x.disabled = true);
    f.querySelector('[data-nc]')?.addEventListener('change', ev => { const show = ev.target.value === '__new'; $('#nc').hidden = !show; f.nc_name.required = show; });
    f.addEventListener('submit', async ev => {
      ev.preventDefault(); const v = Object.fromEntries(new FormData(f)), b = f.querySelector('[type=submit]'); b.disabled = true;
      try {
        if (v.contact_id === '__new') { const r = await api('POST', 'contacts', { name: v.nc_name, phone: v.nc_phone, company: v.nc_company, source: v.nc_source }); v.contact_id = r.id; }
        ['nc_name', 'nc_phone', 'nc_company', 'nc_source'].forEach(k => delete v[k]);
        await api(id ? 'PUT' : 'POST', e + (id ? '/' + id : ''), v);
        closeModal(); toast('Сохранено'); await load(); render();
      } catch (er) { $('#fe').textContent = er.message; b.disabled = false; }
    });
    f.querySelector('[data-del]')?.addEventListener('click', async ev => {
      if (!await ask('Удалить запись?', 'Запись «' + (it.title || it.name || it.num || it.cat || 'без названия') + '» будет удалена без возможности восстановления.')) return;
      try { await api('DELETE', e + '/' + id); closeModal(); toast('Удалено'); await load(); render(); } catch (er) { $('#fe').textContent = er.message; }
    });
  });
}

// этапы
function openStage(id) {
  const s = id ? stageOf(id) : { name: '', color: PALETTE[D.stages.length % PALETTE.length], kind: 'open' };
  const sorted = [...D.stages].sort((a, b) => a.pos - b.pos), idx = sorted.findIndex(x => x.id === id), n = id ? D.deals.filter(d => d.stage_id === id).length : 0;
  openModal(`<form id="sf"><div style="display:grid;gap:14px"><h2>${id ? 'Настройка этапа' : 'Новый этап сделки'}</h2>
  <label>Название этапа *<input name="name" value="${esc(s.name)}" required maxlength="60"></label>
  <div><div class="sub" style="font-size:13px;font-weight:600;margin-bottom:6px">Цвет столбца</div><div class="sws">${PALETTE.map(c => `<label><input type="radio" name="color" value="${c}" ${c === s.color ? 'checked' : ''} aria-label="${c}"><span style="background:${c}"></span></label>`).join('')}</div></div>
  <label>Тип этапа<select name="kind"><option value="open" ${s.kind === 'open' ? 'selected' : ''}>Рабочий этап</option><option value="won" ${s.kind === 'won' ? 'selected' : ''}>Успешное завершение (сделка выиграна)</option><option value="lost" ${s.kind === 'lost' ? 'selected' : ''}>Отказ (сделка проиграна)</option></select></label>
  ${id && may('stages', 'e') ? `<div class="bar"><button class="btn sm" type="button" data-mv="-1" ${idx <= 0 ? 'disabled' : ''}>← Левее</button><button class="btn sm" type="button" data-mv="1" ${idx >= sorted.length - 1 ? 'disabled' : ''}>Правее →</button></div>` : ''}
  ${id && n ? `<label>При удалении перенести ${pl(n, ['сделку', 'сделки', 'сделок'])} в этап<select name="moveTo">${sorted.filter(x => x.id !== id).map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>` : ''}
  <p class="err" id="se"></p><div class="acts">${(id ? may('stages', 'e') : may('stages', 'c')) ? '<button class="btn p" type="submit">Сохранить</button>' : ''}<button class="btn" type="button" data-close>Отмена</button><span class="sp"></span>${id && D.stages.length > 1 && may('stages', 'd') ? '<button class="btn d" type="button" data-del>Удалить этап</button>' : ''}</div></div></form>`, dlg => {
    const f = dlg.querySelector('form');
    f.addEventListener('submit', async ev => { ev.preventDefault(); try { await api(id ? 'PUT' : 'POST', 'stages' + (id ? '/' + id : ''), Object.fromEntries(new FormData(f))); closeModal(); toast(id ? 'Этап сохранён' : 'Этап добавлен'); await load(); render(); } catch (er) { $('#se').textContent = er.message; } });
    f.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', async () => {
      const ids = sorted.map(x => x.id), j = idx + +b.dataset.mv;[ids[idx], ids[j]] = [ids[j], ids[idx]];
      try { await api('POST', 'stages/order', { ids }); await load(); render(); openStage(id); } catch (er) { $('#se').textContent = er.message; }
    }));
    f.querySelector('[data-del]')?.addEventListener('click', async ev => {
      if (!await ask('Удалить этап?', 'Этап «' + s.name + '» будет удалён.' + (n ? ' Его сделки перейдут в выбранный этап.' : ''))) return;
      try { await api('DELETE', 'stages/' + id, { moveTo: f.moveTo?.value }); closeModal(); toast('Этап удалён'); await load(); render(); } catch (er) { $('#se').textContent = er.message; }
    });
  });
}

// сотрудники: матрица прав «раздел × действие»
const ACC_SEC = { dashboard: 'Дашборд', deals: 'Сделки', stages: 'Этапы сделок', contacts: 'Клиенты', products: 'Товары и услуги', tasks: 'Задачи', contracts: 'Договоры', finance: 'Финансы', kb: 'База знаний', mail: 'Почта' };
const ACC_ACT = [['v', 'Видеть'], ['c', 'Добавлять'], ['e', 'Изменять'], ['d', 'Удалять']];
const ACC_HINT = { mail: { v: 'читать свою почту в Орбите', c: 'отправлять письма' }, deals: { e: 'вести: двигать по этапам, менять, писать комментарии' }, stages: { c: 'новые столбцы воронки', e: 'название, цвет, порядок', d: 'удалять столбцы' } };
function permsHtml(p) {
  const n = p && p.acl ? PERMS.normalize(p) : PERMS.preset('sales');
  const mine = P();
  return `<div><div class="sub" style="font-size:13px;font-weight:600;margin-bottom:8px">Шаблон прав</div>
   <div class="seg" role="group" aria-label="Шаблон прав">${Object.entries(PERMS.PRESETS).map(([k, x]) => `<button type="button" class="pre" data-preset="${k}">${x.name}</button>`).join('')}</div>
   <p class="sub" style="font-size:12px;margin:6px 0 0">Шаблон заполнит таблицу — потом любую галочку можно поменять.</p></div>
  <div class="ov-x"><table class="acl"><thead><tr><th>Раздел</th>${ACC_ACT.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
   ${PERMS.SECTIONS.map(s => `<tr><th scope="row">${ACC_SEC[s]}</th>${ACC_ACT.map(([a, l]) => PERMS.ACTIONS[s].includes(a)
     ? `<td><label class="cb" title="${esc((ACC_HINT[s] || {})[a] || l)}"><input type="checkbox" name="p_${s}_${a}" ${n.acl[s][a] ? 'checked' : ''} ${mine.director || mine.acl[s][a] ? '' : 'disabled'} aria-label="${ACC_SEC[s]}: ${l}"></label></td>`
     : '<td class="na">—</td>').join('')}</tr>`).join('')}</tbody></table></div>
  <p class="sub" style="font-size:12px;margin:-4px 0 0">«Изменять» в сделках — это вести сделку: двигать по этапам, менять поля, писать комментарии. «Этапы сделок» — настройка столбцов воронки.</p>
  <label class="sw"><input type="checkbox" name="money" ${n.money ? 'checked' : ''} ${mine.director || mine.money ? '' : 'disabled'}><span><b>Видит суммы и доходность</b><small>Суммы сделок и договоров, раздел «Финансы». Без этой отметки суммы скрыты полностью.</small></span></label>
  <label class="sw"><input type="checkbox" name="onlyOwn" ${n.onlyOwn ? 'checked' : ''}><span><b>Только свои клиенты</b><small>Видит лишь сделки, где он ответственный, и клиентов этих сделок. Защищает базу от выгрузки.</small></span></label>
  ${mine.director ? `<label class="sw"><input type="checkbox" name="team" ${n.team ? 'checked' : ''}><span><b>Может приглашать сотрудников</b><small>Видит раздел «Сотрудники» и выдаёт права — не шире своих собственных.</small></span></label>` : ''}`;
}
const readPerms = f => {
  const acl = Object.fromEntries(PERMS.SECTIONS.map(s => [s, Object.fromEntries(PERMS.ALL.map(a => [a, !!f.querySelector(`[name=p_${s}_${a}]`)?.checked]))]));
  return { acl, money: f.money.checked, onlyOwn: f.onlyOwn.checked, team: !!f.team?.checked };
};
function bindPerms(f) {
  const box = (s, a) => f.querySelector(`[name=p_${s}_${a}]`);
  const set = (s, a, v) => { const b = box(s, a); if (b && !b.disabled) b.checked = v; };
  const tidy = () => {
    for (const s of PERMS.SECTIONS) {
      if (s === 'stages') continue;
      const v = box(s, 'v');
      ['c', 'e', 'd'].forEach(a => { const b = box(s, a); if (b) b.disabled = !v.checked || !(P().director || P().acl[s][a]); });
    }
    ['c', 'e', 'd'].forEach(a => { const b = box('stages', a); b.disabled = !box('deals', 'v').checked || !(P().director || P().acl.stages[a]); });
    const fin = !f.money.checked;
    PERMS.ACTIONS.finance.forEach(a => { const b = box('finance', a); if (fin) b.checked = false; b.disabled = fin || !(P().director || P().acl.finance[a]) || (a !== 'v' && !box('finance', 'v').checked); });
  };
  f.addEventListener('change', e => {
    const m = (e.target.name || '').match(/^p_(\w+)_([vced])$/);
    if (m) {
      const [, s, a] = m;
      if (a === 'v' && !e.target.checked) ['c', 'e', 'd'].forEach(x => set(s, x, false));
      if (s === 'deals' && a === 'v' && !e.target.checked) ['c', 'e', 'd'].forEach(x => set('stages', x, false));
      if (s === 'finance' && e.target.checked) f.money.checked = true;
    }
    f.querySelectorAll('.pre').forEach(b => b.classList.remove('on'));
    tidy();
  });
  f.querySelectorAll('.pre').forEach(b => b.addEventListener('click', () => {
    const n = PERMS.preset(b.dataset.preset);
    PERMS.SECTIONS.forEach(s => PERMS.ACTIONS[s].forEach(a => { const x = box(s, a); if (x) x.checked = n.acl[s][a] && (P().director || P().acl[s][a]); }));
    f.money.checked = n.money && (P().director || P().money); f.onlyOwn.checked = n.onlyOwn;
    f.querySelectorAll('.pre').forEach(x => x.classList.toggle('on', x === b));
    tidy();
  }));
  tidy();
}
// краткое описание прав для таблицы сотрудников
function accessSummary(x) {
  if (x.role === 'director') return '<span class="pill">Полный доступ</span>';
  const A = x.perms.acl || {}, W = { c: 'добавляет', e: 'изменяет', d: 'удаляет' }, WM = { c: 'отправляет' };
  const parts = PERMS.SECTIONS.filter(s => s !== 'stages' && A[s] && A[s].v).map(s => {
    const acts = ['c', 'e', 'd'].filter(a => A[s][a]);
    return `<span class="pill ${acts.length ? '' : 'mu'}">${ACC_SEC[s]}${s === 'dashboard' ? '' : acts.length === PERMS.ACTIONS[s].length - 1 && acts.length > 1 ? ' · всё' : acts.length ? ' · ' + acts.map(a => (s === 'mail' ? WM : W)[a]).join(', ') : ' · просмотр'}</span>`;
  });
  if (A.stages && (A.stages.c || A.stages.e || A.stages.d)) parts.push('<span class="pill">настраивает этапы</span>');
  return parts.join(' ') + (x.perms.money ? ' <span class="pill ok">видит суммы</span>' : ' <span class="pill bad">без сумм</span>') + (x.perms.onlyOwn ? ' <span class="pill warn">только свои</span>' : '') + (x.perms.team ? ' <span class="pill">приглашает сотрудников</span>' : '');
}
function showLink(r, name) {
  if (r.mailed) return toast('Письмо со ссылкой отправлено ' + name);
  openModal(`<h2>Ссылка для сотрудника</h2><p class="sub">Почта на сервере не настроена или письмо не ушло. Отправьте эту ссылку сотруднику сами (в мессенджере или почтой) — по ней он придумает пароль. Ссылка действует 7 дней.</p>
  <div class="copy"><input value="${esc(r.link)}" readonly id="lnk"><button class="btn p" type="button" id="cp">Копировать</button></div><div class="acts"><button class="btn" data-close>Готово</button></div>`, dlg => {
    $('#cp').addEventListener('click', async () => { try { await navigator.clipboard.writeText(r.link); toast('Ссылка скопирована'); } catch { $('#lnk').select(); toast('Выделите и скопируйте ссылку'); } });
  });
}
function openInvite() {
  openModal(`<form id="if"><div style="display:grid;gap:14px"><h2>Пригласить сотрудника</h2><p class="sub" style="margin-top:-8px">На почту придёт письмо со ссылкой. Сотрудник придумает пароль, и его кабинет станет активным.</p>
  <label>Имя и фамилия *<input name="name" required></label><label>Должность<input name="position"></label>
  <label>Email *<input name="email" type="email" required></label>${permsHtml()}
  <p class="err" id="ie2"></p><div class="acts"><button class="btn p" type="submit">${I('send')}Отправить приглашение</button><button class="btn" type="button" data-close>Отмена</button></div></div></form>`, dlg => {
    const f = dlg.querySelector('form'); bindPerms(f);
    f.addEventListener('submit', async ev => {
      ev.preventDefault(); const b = f.querySelector('[type=submit]'); b.disabled = true;
      try { const r = await api('POST', 'team', { name: f.name.value, position: f.position.value, email: f.email.value, perms: readPerms(f) }); closeModal(); await load(); render(); showLink(r, 'на ' + f.email.value); }
      catch (er) { $('#ie2').textContent = er.message; b.disabled = false; }
    });
  });
}
function openMember(id) {
  const x = D.team.find(t => t.id === id); if (!x) return;
  openModal(`<form id="mf"><div style="display:grid;gap:14px"><div class="who" style="display:flex;gap:12px;align-items:center">${avatar(x.name, x.id, '', x.status === 'active' ? x.online : undefined)}<div><h2>${esc(x.name)}</h2><div class="sub">${esc(x.email)} · ${online(x)}</div></div></div>
  <label>Имя и фамилия<input name="name" value="${esc(x.name)}" required></label><label>Должность<input name="position" value="${esc(x.position || '')}"></label>${permsHtml(x.perms)}
  <p class="err" id="me"></p><div class="acts"><button class="btn p" type="submit">Сохранить</button><button class="btn" type="button" data-resend>${I('send')}${x.status === 'active' ? 'Сбросить пароль' : 'Отправить приглашение снова'}</button>
  ${x.status === 'blocked' ? '<button class="btn" type="button" data-st="active">Разблокировать</button>' : x.status === 'active' ? '<button class="btn d" type="button" data-st="blocked">Заблокировать</button>' : ''}<span class="sp"></span><button class="btn d" type="button" data-del>Удалить</button></div></div></form>`, dlg => {
    const f = dlg.querySelector('form'); bindPerms(f);
    const err = er => $('#me').textContent = er.message;
    f.addEventListener('submit', async ev => { ev.preventDefault(); try { await api('PUT', 'team/' + id, { name: f.name.value, position: f.position.value, perms: readPerms(f) }); closeModal(); toast('Доступ обновлён'); await load(); render(); } catch (er) { err(er); } });
    f.querySelector('[data-resend]').addEventListener('click', async () => { try { const r = await api('POST', 'team/' + id + '/resend'); closeModal(); showLink(r, 'на ' + x.email); } catch (er) { err(er); } });
    f.querySelector('[data-st]')?.addEventListener('click', async ev => { try { await api('PUT', 'team/' + id, { status: ev.currentTarget.dataset.st }); closeModal(); toast(ev.currentTarget.dataset.st === 'blocked' ? 'Сотрудник заблокирован' : 'Доступ восстановлен'); await load(); render(); } catch (er) { err(er); } });
    f.querySelector('[data-del]').addEventListener('click', async ev => { if (!await ask('Удалить сотрудника?', x.name + ' потеряет доступ к CRM, а его сделки и задачи останутся без ответственного.')) return; try { await api('DELETE', 'team/' + id); closeModal(); toast('Сотрудник удалён'); await load(); render(); } catch (er) { err(er); } });
  });
}

// ---------- события ----------
document.addEventListener('click', async e => {
  if (e.target.closest('[data-stop]')) return;
  if (e.target.closest('[data-close]')) return closeModal();
  const a = e.target.closest('[data-act]'); if (!a || a.dataset.act === 'done') return;
  if (a.closest('#sres')) { $('#sres').remove(); if (a.dataset.act !== 'go') { Q = ''; render(); } else KEEPQ = true; }
  const k = a.dataset.act;
  if (k === 'register') { if (!D && location.hash !== '#register') { location.hash = 'register'; return; } return showRegister(); }
  if (k === 'ld-reg') { REG = { step: 1, f: {}, files: [], plan: a.dataset.plan || (REG && REG.plan) || 'y1' }; if (location.hash === '#register') showRegister(); else location.hash = 'register'; return; }
  if (k === 'ld-top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (k === 'to-land') { history.replaceState(null, '', location.pathname); return showLanding(); }
  if (k === 'to-login') { if (!D && location.hash !== '#login') { location.hash = 'login'; return; } return showLogin(); }
  if (k === 'theme') setTheme(a.dataset.v || (theme() === 'dark' ? 'light' : 'dark'));
  else if (k === 'burger') { $('#side')?.classList.toggle('open'); $('.scrim')?.classList.toggle('open'); }
  else if (k === 'logout') { try { await api('POST', 'logout'); } catch {} D = null; LAST = ''; mailReset(); history.replaceState(null, '', location.pathname + '#login'); showLogin(); }
  else if (k === 'ui') { UI[a.dataset.k] = a.dataset.v; render(); }
  else if (k === 'new') openForm(a.dataset.e);
  else if (k === 'new-deal') openForm('deals', null, { stage_id: +a.dataset.stage });
  else if (k === 'edit') openForm(a.dataset.e, +a.dataset.id);
  else if (k === 'req-ok' || k === 'req-no') {
    const r = (D.requests || []).find(x => x.id === +a.dataset.id); if (!r) return;
    const ok = k === 'req-ok';
    if (!await ask(ok ? 'Подключить компанию?' : 'Отклонить заявку?', ok ? `Подтвердите, что документы проверены и оплата по тарифу «${planOf(r.plan).name}» получена. Компания ${/[«"]/.test(r.company) ? r.company : "«" + r.company + "»"} получит доступ к Орбите, а на ${r.email} уйдёт пароль для входа.` : `Компания ${/[«"]/.test(r.company) ? r.company : "«" + r.company + "»"} не получит доступ. Заявку можно будет найти во вкладке «Отклонённые».`, ok ? { yes: 'Подключить и выслать пароль', no: 'Отмена', ok: 1 } : { yes: 'Отклонить', no: 'Отмена' })) return;
    try {
      const res = await api('POST', 'requests/' + r.id + '/' + (ok ? 'approve' : 'reject')); await load(); render();
      if (!ok) return toast('Заявка отклонена');
      if (res.mailed) return toast('Компания подключена, пароль отправлен на ' + r.email);
      openModal(`<h2>Компания подключена</h2><p class="sub">Письмо не отправлено: почта на сервере не настроена. Передайте директору данные для входа сами.</p><label>Логин<input value="${esc(r.email)}" readonly></label><label>Пароль<input value="${esc(res.password)}" readonly id="np"></label><div class="acts"><button class="btn p" type="button" id="cpp">Копировать логин и пароль</button><button class="btn" data-close>Готово</button></div>`, () => {
        $('#cpp').addEventListener('click', async () => { try { await navigator.clipboard.writeText('Логин: ' + r.email + '\nПароль: ' + res.password); toast('Скопировано'); } catch { $('#np').select(); toast('Выделите и скопируйте пароль'); } });
      });
    } catch (er) { fail(er); }
  }
  else if (k === 'preview') { const r = (D.requests || []).find(x => x.id === +a.dataset.r), f = r && r.files[+a.dataset.i]; if (f) openModal(`<h2>${esc(f.name)}</h2><img src="${esc(f.url)}" alt="${esc(f.name)}" style="max-width:100%;border-radius:12px"><div class="acts"><button class="btn" data-close>Закрыть</button></div>`); }
  else if (k === 'open-deal') location.hash = 'deal-' + a.dataset.id;
  else if (k === 'deal-close') location.hash = BASE;
  else if (k === 'df-view' || k === 'df-dl') dfAct(k, a);
  else if (k === 'dp-add') { const d = dById(DEAL.id); if (d) openProductPicker(d); }
  else if (k === 'dp-rm') { const d = dById(DEAL.id), it = ditems(d); it.splice(+a.dataset.i, 1); saveItems(d, it, 'Убрано из сделки'); }
  else if (k === 'deal-pay') { const d = dById(DEAL.id); if (d) openPay(d); }
  else if (k.startsWith('ds-')) dsAct(k, a);
  else if (k === 'kbf') openKbf(+a.dataset.id || 0);
  else if (k === 'kb-dl') kbDownload(+a.dataset.id, a.dataset.k);
  else if (k === 'kb-new') openForm('kb', null, { cat: UI.kbCat && UI.kbCat !== '__none' ? UI.kbCat : '' });
  else if (k === 'go') { if (location.hash.slice(1) === a.dataset.v) { KEEPQ = false; render(); } else location.hash = a.dataset.v; }
  else if (k === 'deal-task') openForm('tasks', null, { deal_id: +a.dataset.id, resp_id: dById(+a.dataset.id)?.resp_id || D.me.id, kind: 'Дело', due: today() });
  else if (k === 'deal-stage') moveDeal(dById(DEAL.id), +a.dataset.st);
  else if (k === 'deal-finish') openFinish(dById(DEAL.id));
  else if (k === 'cmode') { DEAL.mode = a.dataset.v; render(); $('#cf [name]')?.focus(); }
  else if (k === 'cfopen') { DEAL.cfopen = !DEAL.cfopen; a.closest('.composer').classList.toggle('open', DEAL.cfopen); if (DEAL.cfopen) $('#cf [name=title]')?.focus(); }
  else if (k === 'tdone' || k === 'tlater') {
    const x = D.tasks.find(z => z.id === +a.dataset.id); if (!x) return;
    const body = k === 'tdone' ? { done: 1 } : { due: dstr(new Date(Date.now() + 864e5)) };
    try { await api('PUT', 'tasks/' + x.id, body); Object.assign(x, body); toast(k === 'tdone' ? 'Выполнено' : 'Перенесено на завтра'); await load(); render(); } catch (er) { fail(er); }
  }
  else if (k === 'deal-del') { const d = dById(DEAL.id); if (d && await ask('Удалить сделку?', 'Сделка «' + d.title + '» будет удалена без возможности восстановления.')) { try { await api('DELETE', 'deals/' + d.id); toast('Сделка удалена'); location.hash = 'deals'; await load(); render(); } catch (er) { fail(er); } } }
  else if (k === 'stage') openStage(+a.dataset.id);
  else if (k === 'stage-new') openStage();
  else if (k === 'invite') openInvite();
  else if (k === 'work') workMenu(a);
  else if (k === 'ava-pick') pickAvatar();
  else if (k === 'ava-del') removeAvatar();
  else if (k === 'umenu') userMenu(a);
  else if (k === 'tariff') openTariff();
  else if (k === 'help') openHelp();
  else if (k.startsWith('mail-')) mailAct(k, a);
  else if (k === 'member') openMember(+a.dataset.id);
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.act === 'done') {
    const x = D.tasks.find(z => z.id === +t.dataset.id); if (!x) return;
    x.done = t.checked ? 1 : 0; render();
    try { await api('PUT', 'tasks/' + x.id, { done: x.done }); toast(x.done ? 'Задача выполнена' : 'Задача снова открыта'); await load(); render(); } catch (er) { fail(er); }
  } else if (t.dataset.ui !== undefined) { UI[t.dataset.ui] = t.value; render(); }
});
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  Q = e.target.value;
  if (VIEW === 'mail' && MB.acc) { clearTimeout(MB.qt); MB.qt = setTimeout(() => { MB.q = Q.trim(); MB.page = 1; MB.sel = null; mailList(); }, 600); return; }
  render(); showSearch();
});
// поиск по всей CRM: выпадающий список под строкой поиска
function searchHits(q) {
  q = q.trim().toLowerCase(); const dq = q.replace(/\D/g, '');
  const has = v => String(v ?? '').toLowerCase().includes(q);
  const ph = v => dq.length >= 3 && String(v || '').replace(/\D/g, '').includes(dq);
  const out = [];
  if (can('deals')) out.push(['Сделки', 'deals', D.deals.filter(d => { const c = cById(d.contact_id) || {}; return has(d.title) || has(d.next) || has(d.note) || has(c.name) || has(c.company) || ph(c.phone); }).map(d => ({ act: `data-act="open-deal" data-id="${d.id}"`, t: d.title, s: [cById(d.contact_id)?.name, (stageOf(d.stage_id) || {}).name].filter(Boolean).join(' · ') }))]);
  if (can('contacts')) out.push(['Клиенты', 'contacts', D.contacts.filter(c => has(c.name) || has(c.company) || has(c.email) || has(c.position) || ph(c.phone)).map(c => ({ act: `data-act="edit" data-e="contacts" data-id="${c.id}"`, t: c.name, s: [c.company, c.phone, c.email].filter(Boolean).join(' · ') }))]);
  if (can('products')) out.push(['Товары и услуги', 'products', (D.products || []).filter(x => has(x.name) || has(x.sku) || has(x.note)).map(x => ({ act: `data-act="edit" data-e="products" data-id="${x.id}"`, t: x.name, s: [x.kind, x.sku, money() && x.price != null ? rub(x.price) : ''].filter(Boolean).join(' · ') }))]);
  if (can('tasks')) out.push(['Задачи', 'tasks', D.tasks.filter(x => has(x.title) || has(x.note)).map(x => ({ act: `data-act="edit" data-e="tasks" data-id="${x.id}"`, t: x.title, s: (x.done ? 'выполнена' : dueText(x) ? 'срок ' + dueText(x) : '') }))]);
  if (can('contracts')) out.push(['Договоры', 'contracts', D.contracts.filter(c => has(c.num) || has(c.title) || has(cById(c.contact_id)?.name)).map(c => ({ act: `data-act="edit" data-e="contracts" data-id="${c.id}"`, t: '№ ' + c.num + (c.title ? ' · ' + c.title : ''), s: [cById(c.contact_id)?.name, c.status].filter(Boolean).join(' · ') }))]);
  if (can('kb')) out.push(['База знаний', 'kb', D.kb.filter(x => has(x.title) || has(x.cat) || has(x.body)).map(x => ({ act: `data-act="edit" data-e="kb" data-id="${x.id}"`, t: x.title, s: x.cat || '' }))]);
  if (P().team && D.team) out.push(['Сотрудники', 'team', D.team.filter(x => has(x.name) || has(x.email) || has(x.position)).map(x => ({ act: x.role !== 'director' && x.id !== D.me.id ? `data-act="member" data-id="${x.id}"` : 'data-act="go" data-v="team"', t: x.name, s: [x.position, x.email].filter(Boolean).join(' · ') }))]);
  return out.filter(g => g[2].length);
}
function showSearch() {
  $('#sres')?.remove();
  const q = Q.trim(), box = $('.tsearch'); if (!box || q.length < 2) return;
  const groups = searchHits(q);
  const html = groups.length ? groups.map(([name, sec, items]) => `<div class="sg"><div class="sgh">${I(sec === 'team' ? 'team' : sec)}<span>${name}</span><em>${items.length}</em></div>${items.slice(0, 5).map(x => `<button class="si" ${x.act}><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ''}</button>`).join('')}${items.length > 5 ? `<button class="si more" data-act="go" data-v="${sec}">Показать все ${items.length} в разделе «${name}»</button>` : ''}</div>`).join('')
    : `<div class="sempty">По запросу «${esc(q)}» ничего не нашлось</div>`;
  const d = document.createElement('div'); d.id = 'sres'; d.className = 'sres'; d.setAttribute('role', 'listbox'); d.innerHTML = html; box.appendChild(d);
}
document.addEventListener('mousedown', e => { if (!e.target.closest?.('.tsearch')) $('#sres')?.remove(); });
document.addEventListener('keydown', e => {
  if (e.target.id !== 'q') return;
  if (e.key === 'Enter') { const f = $('#sres .si'); if (f) { e.preventDefault(); f.click(); } }
  if (e.key === 'Escape') { $('#sres')?.remove(); e.target.blur(); }
  if (e.key === 'ArrowDown') { const f = $('#sres .si'); if (f) { e.preventDefault(); f.focus(); } }
});
document.addEventListener('submit', async e => {
  if (e.target.id === 'cf' && DEAL) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button.p');
    if ((DEAL.mode || 'task') === 'comment' && !String(f.text || '').trim() && !(DEAL.att || []).length) return toast('Напишите комментарий или прикрепите файл');
    b.disabled = true;
    try {
      const mode = DEAL.mode || 'task', files = await attRead();
      if (mode === 'task') { await api('POST', 'tasks', { title: f.title, due: f.due, due_time: f.due_time || '', resp_id: f.resp_id, deal_id: DEAL.id, prio: 'Обычный', kind: 'Дело', files }); toast('Дело добавлено'); }
      else if (mode === 'ztask') { await api('POST', 'tasks', { title: f.title, note: f.note, due: f.due, due_time: f.due_time, resp_id: f.resp_id, deal_id: DEAL.id, prio: f.hi ? 'Высокий' : 'Обычный', kind: 'Задача', files }); toast('Задача поставлена'); }
      else { await api('POST', 'deals/' + DEAL.id + '/events', { text: f.text, files }); toast('Комментарий добавлен'); }
      DEAL.att = []; DEAL.cfopen = false;
      document.activeElement?.blur(); await load(); render(); await loadEvents(); render();
    } catch (er) { fail(er); b.disabled = false; }
    return;
  }
  if (e.target.id === 'mcf') return mailConnect(e);
  if (e.target.id === 'dsf') { e.preventDefault(); return saveSection(e.target); }
  if (e.target.id !== 'pf') return; e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (f.password !== f.password2) return $('#pe').textContent = 'Пароли не совпадают';
  try { await api('POST', 'password', f); e.target.reset(); $('#pe').textContent = ''; toast('Пароль изменён'); } catch (er) { $('#pe').textContent = er.message; }
});
// перетаскивание карточек
document.addEventListener('dragstart', e => { const c = e.target.closest?.('.dc'); if (!c) return; dragging = true; c.classList.add('drag'); e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; });
document.addEventListener('dragend', e => { dragging = false; e.target.closest?.('.dc')?.classList.remove('drag'); document.querySelectorAll('.col.over').forEach(c => c.classList.remove('over')); });
document.addEventListener('dragover', e => { const c = e.target.closest?.('.col'); if (!c) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => x !== c && x.classList.remove('over')); c.classList.add('over'); });
document.addEventListener('drop', async e => {
  const c = e.target.closest?.('.col'); if (!c) return; e.preventDefault(); dragging = false;
  const d = D.deals.find(x => x.id === +e.dataTransfer.getData('text/plain'));
  if (!d || d.stage_id === +c.dataset.stage) return render();
  moveDeal(d, +c.dataset.stage);
});
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('#modal').hidden) closeModal(); else if (VIEW === 'deal' && ($('#cfm')?.hidden ?? true)) location.hash = BASE; });
addEventListener('hashchange', () => { if (D) route(); else pubRoute(); });
addEventListener('pagehide', () => { if (D) navigator.sendBeacon?.('/api/bye'); });

// обновление данных и «в сети»
setInterval(async () => {
  if (!D || document.hidden || busy()) return;
  try { if (await load() && VIEW !== 'mail') render(); if (DEAL) loadEvents(); } catch {}
}, 25000);
// новые письма: счётчик во «Входящих» раз в минуту
setInterval(async () => {
  if (!D || document.hidden || !can('mail') || !MB.acc) return;
  try { const { unseen } = await api('GET', 'mail/unseen'); const more = unseen > MB.unseen; setMailBadge(unseen); if (more && VIEW === 'mail' && MB.folder === 'INBOX' && MB.page === 1 && !MB.q && !busy()) mailList(true); } catch {}
}, 60000);
document.addEventListener('visibilitychange', async () => { if (D && !document.hidden) { try { if (await load()) render(); } catch {} } });

// ---------- почта ----------
const MB = {};
function mailReset() { Object.assign(MB, { acc: undefined, folders: [], folder: 'INBOX', list: null, page: 1, q: '', sel: null, msg: null, err: '', loading: false, img: false, unseen: 0, msgErr: '' }); }
mailReset();
const FOLD_IC = { inbox: 'inbox', sent: 'send', drafts: 'draft', junk: 'spam', trash: 'trash', archive: 'folder', '': 'folder' };
const FOLD_NAME = { inbox: 'Входящие', sent: 'Отправленные', drafts: 'Черновики', junk: 'Спам', trash: 'Корзина', archive: 'Архив' };
const enc = encodeURIComponent;
function setMailBadge(n) {
  MB.unseen = +n || 0;
  document.querySelectorAll('.rnav a[href="#mail"]').forEach(a => { let em = a.querySelector('em'); if (!MB.unseen) return em && em.remove(); if (!em) { em = document.createElement('em'); a.appendChild(em); } em.textContent = MB.unseen; });
  const f = MB.folders.find(x => x.special === 'inbox'); if (f) f.unseen = MB.unseen;
  document.querySelectorAll('.mfold [data-special=inbox] em').forEach(e => e.textContent = MB.unseen || '');
}
async function mailInit(force) {
  if (MB.acc !== undefined && !force) return;
  try { MB.acc = (await api('GET', 'mail/account')).account; MB.err = ''; } catch (e) { MB.acc = null; MB.err = e.message; }
  if (MB.acc) await mailFolders();
  if (VIEW === 'mail' && !busy()) render();
}
async function mailFolders() {
  try { const r = await api('GET', 'mail/folders'); MB.folders = r.folders; const ib = r.folders.find(f => f.special === 'inbox'); setMailBadge(ib ? ib.unseen : 0); MB.err = ''; }
  catch (e) { MB.err = e.message; }
}
async function mailList(quiet) {
  MB.loading = true; if (!quiet && VIEW === 'mail') render();
  try { MB.list = await api('GET', `mail/list?folder=${enc(MB.folder)}&page=${MB.page}&q=${enc(MB.q)}`); MB.err = ''; }
  catch (e) { MB.err = e.message; MB.list = MB.list || { items: [], page: 1, pages: 1, total: 0 }; }
  MB.loading = false; if (VIEW === 'mail' && !busy()) render();
}
async function mailOpen(uid) {
  MB.sel = uid; MB.msg = null; MB.img = false; MB.msgErr = ''; render();
  const it = MB.list?.items.find(x => x.uid === uid);
  try {
    const m = await api('GET', `mail/msg?folder=${enc(MB.folder)}&uid=${uid}`);
    if (MB.sel !== uid) return;
    MB.msg = { ...m, uid, folder: MB.folder };
    if (it && !it.seen) { it.seen = true; if (MB.folder === 'INBOX' || (MB.folders.find(f => f.path === MB.folder) || {}).special === 'inbox') setMailBadge(Math.max(0, MB.unseen - 1)); }
  } catch (e) { MB.msgErr = e.message; }
  if (VIEW === 'mail') render();
}
const fdate = ts => { if (!ts) return ''; const d = new Date(ts), t = new Date(); return dstr(d) === dstr(t) ? p2(d.getHours()) + ':' + p2(d.getMinutes()) : d.getFullYear() === t.getFullYear() ? d.getDate() + ' ' + MS_[d.getMonth()] : fd(dstr(d)); };
const MS_ = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const who = a => a ? (a.name || a.email) : '';
const contactBy = email => email && D.contacts.find(c => String(c.email || '').trim().toLowerCase() === String(email).toLowerCase());
// HTML письма показываем в изолированной рамке: без скриптов, картинки из интернета — по кнопке
function mailDoc(html, img) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,iframe,frame,object,embed,form,meta,base,link').forEach(x => x.remove());
  let blocked = 0;
  doc.querySelectorAll('*').forEach(el => {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      else if (/^(href|src|action|formaction|xlink:href)$/i.test(a.name) && /^\s*(javascript|vbscript):/i.test(a.value)) el.removeAttribute(a.name);
    }
    if (img) return;
    if (el.tagName === 'IMG' && /^\s*(https?:)?\/\//i.test(el.getAttribute('src') || '')) { el.removeAttribute('src'); el.removeAttribute('srcset'); if (+el.getAttribute('width') <= 3 || +el.getAttribute('height') <= 3 || !el.getAttribute('alt')) el.style.display = 'none'; blocked++; }
    if (el.hasAttribute('background')) { el.removeAttribute('background'); blocked++; }
    const st = el.getAttribute('style'); if (st && /url\s*\(/i.test(st)) { el.setAttribute('style', st.replace(/url\s*\([^)]*\)/gi, 'none')); blocked++; }
  });
  if (!img) doc.querySelectorAll('style').forEach(x => { if (/url\s*\(|@import/i.test(x.textContent)) { x.textContent = x.textContent.replace(/@import[^;]+;/gi, '').replace(/url\s*\([^)]*\)/gi, 'none'); blocked++; } });
  const css = '<base target="_blank"><style>html,body{margin:0}body{padding:2px 4px 16px;font:14px/1.55 Arial,Helvetica,sans-serif;color:#1d2340;background:#fff;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#4f46e5}blockquote{margin:0 0 0 6px;padding-left:12px;border-left:3px solid #d9dcf0;color:#4b5275}table{max-width:100%}</style>';
  return { html: '<!doctype html><html><head><meta charset="utf-8">' + css + doc.head.innerHTML + '</head><body>' + doc.body.innerHTML + '</body></html>', blocked };
}
const linkify = t => esc(t).replace(/\bhttps?:\/\/[^\s<>"']+/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
const htmlText = h => { const d = new DOMParser().parseFromString(h || '', 'text/html'); d.querySelectorAll('script,style,head,title').forEach(x => x.remove()); d.querySelectorAll('br').forEach(b => b.replaceWith('\n')); d.querySelectorAll('p,div,tr,li,h1,h2,h3').forEach(b => b.append('\n')); return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim(); };

function mailConnectHtml() {
  const a = MB.acc || {};
  return `<div class="head"><div><h1>Почта</h1><p class="sub">Подключите свой рабочий ящик — письма клиентам будут прямо в Орбите</p></div></div>
  ${window.CRM_PREVIEW ? `<div class="note glass">В предварительном просмотре настоящая почта не подключается: браузер не умеет соединяться с почтовым сервером напрямую. Введите любой адрес и пароль — откроется пример ящика. На вашем сервере Орбита подключится к настоящей почте.</div>` : ''}
  <div class="mconn"><section class="glass panel"><div class="ph"><h2><span class="ic">${I('mail')}</span>Подключить почту</h2></div>
   <form id="mcf" class="fm" novalidate>
    <label>Адрес почты<input name="email" type="email" required autocomplete="email" placeholder="ivan@yandex.ru" value="${esc(a.email || '')}"></label>
    <label>Пароль<input name="pass" type="password" required autocomplete="new-password" placeholder="${a.email ? 'оставьте пустым, чтобы не менять' : ''}"></label>
    <details class="madv" ${a.imap_host && !/yandex|mail\.ru|rambler|gmail|office365/.test(a.imap_host) ? 'open' : ''}><summary>Корпоративная почта</summary>
     <p class="sub" style="font-size:13px;margin:4px 0 10px">Для Яндекса, Mail.ru, Рамблера и Gmail серверы подставятся сами.</p>
     <label>Логин <small class="sub">если отличается от адреса</small><input name="login" autocomplete="off" value="${esc(a.login && a.login !== a.email ? a.login : '')}"></label>
     <div class="r2"><label>Сервер IMAP<input name="imap_host" placeholder="imap.example.ru" value="${esc(a.imap_host || '')}" autocomplete="off"></label><label>Порт<input name="imap_port" inputmode="numeric" placeholder="993" value="${esc(a.imap_port || '')}"></label></div>
     <div class="r2"><label>Сервер SMTP<input name="smtp_host" placeholder="smtp.example.ru" value="${esc(a.smtp_host || '')}" autocomplete="off"></label><label>Порт<input name="smtp_port" inputmode="numeric" placeholder="465" value="${esc(a.smtp_port || '')}"></label></div>
    </details>
    <p class="err" id="mce" role="alert"></p>
    <div class="acts" style="justify-content:flex-start">${a.email ? `<button class="btn" type="button" data-act="mail-cancel">Отмена</button>` : ''}<button class="btn p">Подключить</button></div>
   </form></section>
   <section class="glass panel mhelp"><div class="ph"><h2><span class="ic">${I('lock')}</span>Инструкция</h2></div>
    <p class="sub">Почтовые сервисы не пускают внешние программы по обычному паролю. Создайте отдельный пароль приложения — он работает только для почты, и его можно отозвать в любой момент.</p>
    <details open><summary>Яндекс Почта и Яндекс 360</summary><ol><li>Откройте Яндекс ID → «Безопасность» → «Пароли приложений».</li><li>Выберите «Почта», придумайте название, например «Орбита», и скопируйте пароль.</li><li>В настройках Почты → «Почтовые программы» включите доступ по протоколу IMAP.</li></ol></details>
    <details><summary>Mail.ru, Inbox, List, Bk</summary><ol><li>Откройте настройки почты → «Безопасность» → «Пароли для внешних приложений».</li><li>Нажмите «Добавить», выберите полный доступ к почте и скопируйте пароль.</li></ol></details>
    <details><summary>Gmail</summary><ol><li>Включите двухэтапную аутентификацию в аккаунте Google.</li><li>Откройте myaccount.google.com/apppasswords, создайте пароль и скопируйте его.</li></ol></details>
    <details><summary>Корпоративная почта</summary><p>Спросите у администратора адреса серверов IMAP и SMTP и укажите их в блоке «Корпоративная почта» слева.</p></details>
    <p class="sub" style="font-size:13px">Пароль хранится на сервере Орбиты в зашифрованном виде. Вашу переписку видите только вы: директор и коллеги её не видят.</p>
   </section></div>`;
}
async function mailConnect(e) {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f)), er = $('#mce'), b = f.querySelector('button.p');
  er.textContent = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return er.textContent = 'Укажите адрес почты полностью, например ivan@yandex.ru';
  if (!v.pass && !(MB.acc && MB.acc.email === v.email.trim().toLowerCase())) return er.textContent = 'Введите пароль';
  b.disabled = true; b.textContent = 'Подключаем…';
  try {
    await api('POST', 'mail/account', v);
    MB.acc = undefined; MB.list = null; MB.sel = null; MB.msg = null; MB.folder = 'INBOX'; MB.editing = false;
    await mailInit(true); toast('Почта подключена');
  } catch (x) {
    er.textContent = x.message; b.disabled = false; b.textContent = 'Подключить';
    if (/серверы IMAP/.test(x.message)) f.querySelector('details.madv').open = true;
  }
}
VIEWS.mail = after => {
  if (MB.acc === undefined) { after.push(() => mailInit()); return `<div class="head"><div><h1>Почта</h1><p class="sub">Открываем ящик…</p></div></div>`; }
  if (!MB.acc || MB.editing) return mailConnectHtml();
  if (!MB.list && !MB.loading) after.push(() => mailList());
  const L = MB.list || { items: [] };
  const fl = MB.folders.length ? MB.folders : [{ path: 'INBOX', name: 'Входящие', special: 'inbox' }];
  const curF = fl.find(f => f.path === MB.folder) || fl[0];
  const fname = f => FOLD_NAME[f.special] || f.name;
  const folders = fl.map(f => `<button class="${f.path === MB.folder ? 'on' : ''}" data-act="mail-folder" data-v="${esc(f.path)}" data-special="${f.special}">${I(FOLD_IC[f.special] || 'folder')}<span>${esc(fname(f))}</span><em>${f.special === 'inbox' && MB.unseen ? MB.unseen : ''}</em></button>`).join('');
  const sentF = curF.special === 'sent' || curF.special === 'drafts';
  const items = L.items.map(x => { const p = sentF ? (x.to[0] || {}) : x.from, ct = contactBy(p.email);
    return `<button class="mi ${x.seen ? '' : 'new'} ${MB.sel === x.uid ? 'on' : ''}" data-act="mail-open" data-uid="${x.uid}">
     ${avatar(who(p), (p.email || '').length)}<span class="mi-b"><span class="mi-h"><b>${esc(sentF ? 'Кому: ' + who(p) : who(p))}</b><time>${fdate(x.date)}</time></span>
     <span class="mi-s">${x.att ? I('clip', 'clip') : ''}${esc(x.subject)}</span>${ct ? `<span class="mi-c">${I('user')}клиент из базы</span>` : ''}</span></button>`; }).join('');
  const pager = L.pages > 1 ? `<div class="mpg"><button class="btn sm" data-act="mail-page" data-v="-1" ${L.page <= 1 ? 'disabled' : ''}>Назад</button><span class="sub">${L.page} из ${L.pages}</span><button class="btn sm" data-act="mail-page" data-v="1" ${L.page >= L.pages ? 'disabled' : ''}>Дальше</button></div>` : '';
  const list = MB.loading && !MB.list ? '<div class="mempty">Загружаем письма…</div>' : MB.err && !L.items.length ? `<div class="mempty"><b>Не получилось открыть почту</b><span>${esc(MB.err)}</span><button class="btn sm" data-act="mail-refresh">Повторить</button></div>`
    : L.items.length ? items + pager : `<div class="mempty">${MB.q ? 'По запросу «' + esc(MB.q) + '» писем нет' : 'В этой папке пока пусто'}</div>`;
  let read = `<div class="mempty mnosel">${I('mail')}<span>Выберите письмо слева</span></div>`;
  if (MB.sel) {
    const m = MB.msg;
    if (MB.msgErr) read = `<div class="mempty"><b>Письмо не открылось</b><span>${esc(MB.msgErr)}</span></div>`;
    else if (!m) read = '<div class="mempty">Открываем письмо…</div>';
    else {
      const ct = contactBy(m.from.email), deals = ct ? D.deals.filter(d => d.contact_id === ct.id) : [];
      const doc = m.html ? mailDoc(m.html, MB.img) : null;
      if (doc) after.push(() => { const fr = $('#mframe'); if (fr) fr.srcdoc = doc.html; });
      read = `<div class="mrh"><button class="ib mback" data-act="mail-back" aria-label="К списку писем">${I('back')}</button><h2>${esc(m.subject || '(без темы)')}</h2></div>
       <div class="mfrom">${avatar(who(m.from), (m.from.email || '').length)}<div><b>${esc(who(m.from))}</b> <span class="sub">${esc(m.from.email)}</span><div class="sub" style="font-size:12.5px">Кому: ${esc(m.to.map(who).join(', ') || '—')}${m.cc.length ? ' · Копия: ' + esc(m.cc.map(who).join(', ')) : ''} · ${m.date ? fdt(m.date) : ''}</div></div></div>
       <div class="mtools">${may('mail', 'c') ? `<button class="btn sm" data-act="mail-reply">${I('reply')}Ответить</button>${m.cc.length || m.to.length > 1 ? `<button class="btn sm" data-act="mail-reply" data-all="1">${I('reply')}Ответить всем</button>` : ''}<button class="btn sm" data-act="mail-fwd">${I('fwd')}Переслать</button>` : ''}
        <span class="sp"></span><button class="ib" data-act="mail-unread" title="Отметить непрочитанным" aria-label="Отметить непрочитанным">${I('unread')}</button><button class="ib" data-act="mail-del" title="Удалить" aria-label="Удалить письмо">${I('trash')}</button></div>
       ${ct ? `<div class="mclient">${I('user')}<span>Клиент из базы: <b>${esc(ct.name)}</b>${ct.company ? ', ' + esc(ct.company) : ''}</span>${deals.slice(0, 3).map(d => `<a class="pill" href="#deal-${d.id}">${esc(d.title)}</a>`).join('')}</div>` : ''}
       ${m.atts.length ? `<div class="matts">${m.atts.map(x => window.CRM_PREVIEW ? `<button class="matt" data-act="mail-att">${I('clip')}<span>${esc(x.name)}</span><small>${fsize(x.size)}</small></button>` : `<a class="matt" href="/api/mail/att?folder=${enc(m.folder)}&uid=${m.uid}&i=${x.i}" download="${esc(x.name)}">${I('clip')}<span>${esc(x.name)}</span><small>${fsize(x.size)}</small></a>`).join('')}</div>` : ''}
       ${doc && doc.blocked && !MB.img ? `<div class="mimg">Картинки из интернета скрыты, чтобы отправитель не узнал о прочтении. <button class="lnk" data-act="mail-img">Показать картинки</button></div>` : ''}
       ${doc ? `<iframe id="mframe" class="mframe" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" title="Текст письма"></iframe>` : `<div class="mtext">${linkify(m.text || '')}</div>`}`;
    }
  }
  return `<div class="head"><div><h1>Почта</h1><p class="sub">${esc(MB.acc.email)}</p></div><div class="bar"><button class="ib" data-act="mail-refresh" title="Проверить почту" aria-label="Проверить почту">${I('refresh')}</button>${may('mail', 'c') ? `<button class="btn p" data-act="mail-new">${I('plus')}Написать</button>` : ''}</div></div>
   ${window.CRM_PREVIEW ? `<div class="note glass">Это пример ящика для предпросмотра. На вашем сервере здесь будут ваши настоящие письма.</div>` : ''}
   <div class="mbox ${MB.sel ? 'reading' : ''}">
    <aside class="mfold glass">${folders}<div class="sp"></div><button data-act="mail-acc">${I('profile')}<span>Настройки</span></button></aside>
    <section class="mlist glass">${MB.q ? `<div class="mq">Поиск: «${esc(MB.q)}» <button class="lnk" data-act="mail-q0">сбросить</button></div>` : ''}${MB.loading && MB.list ? '<div class="mload"></div>' : ''}${list}</section>
    <section class="mread glass">${read}</section>
   </div>`;
};
// панель «Переписка» в карточке сделки
function dealMailPanel(c, after) {
  if (!c || !c.email || !can('mail')) return '';
  const email = String(c.email).trim().toLowerCase();
  if (!DEAL.mail || DEAL.mail.email !== email) { DEAL.mail = { email, items: null }; after.push(() => loadDealMail()); }
  const st = DEAL.mail;
  const body = st.noacc ? `<p class="sub">Подключите свою почту в разделе <a href="#mail">«Почта»</a> — и здесь появится переписка с клиентом.</p>`
    : st.err ? `<p class="sub">${esc(st.err)}</p>` : !st.items ? '<p class="sub">Загружаем письма…</p>'
    : st.items.length ? st.items.slice(0, 8).map(x => `<button class="mrow" data-act="mail-goto" data-f="${esc(x.folder)}" data-uid="${x.uid}"><span class="mdir ${x.dir}">${I(x.dir === 'in' ? 'inbox' : 'send')}</span><span class="mrs ${x.seen ? '' : 'new'}">${esc(x.subject)}</span><time>${fdate(x.date)}</time></button>`).join('')
    : `<p class="sub">Писем с ${esc(email)} пока нет</p>`;
  return `<section class="glass panel"><div class="ph"><h2>Переписка</h2>${may('mail', 'c') && !st.noacc ? `<button class="lnk" data-act="mail-new" data-to="${esc(email)}">написать</button>` : ''}</div>${body}</section>`;
}
async function loadDealMail() {
  const st = DEAL && DEAL.mail; if (!st) return;
  try {
    if (MB.acc === undefined) MB.acc = (await api('GET', 'mail/account')).account;
    if (!MB.acc) st.noacc = true;
    else st.items = (await api('GET', 'mail/contact?email=' + enc(st.email))).items;
  } catch (e) { st.err = e.message; }
  if (VIEW === 'deal' && !busy()) render();
}

function openCompose(o = {}) {
  if (!may('mail', 'c')) return toast('У вас нет права отправлять письма');
  if (MB.acc === undefined) return mailInit().then(() => MB.acc ? openCompose(o) : (toast('Сначала подключите почту'), location.hash = 'mail'));
  if (!MB.acc) { toast('Сначала подключите почту'); location.hash = 'mail'; return; }
  const files = [], opts = [...new Map(D.contacts.filter(c => c.email).map(c => [c.email.trim().toLowerCase(), c])).values()];
  openModal(`<h2>${esc(o.title || 'Новое письмо')}</h2><form id="mc" class="fm mcomp" novalidate>
    <label>Кому<input name="to" list="mlc" value="${esc(o.to || '')}" placeholder="client@example.ru" autocomplete="off" required></label>
    <label>Копия<input name="cc" list="mlc" value="${esc(o.cc || '')}" autocomplete="off" placeholder="необязательно"></label>
    <datalist id="mlc">${opts.map(c => `<option value="${esc(c.email.trim())}">${esc(c.name)}${c.company ? ' · ' + esc(c.company) : ''}</option>`).join('')}</datalist>
    <label>Тема<input name="subject" value="${esc(o.subject || '')}" autocomplete="off"></label>
    <label>Текст письма<textarea name="text" rows="10">${esc(o.text || '')}</textarea></label>
    ${o.forward ? `<p class="sub" style="font-size:13px;margin:0">${I('clip')} Вложения исходного письма отправятся вместе с письмом</p>` : ''}
    <div class="mfl" id="mfl"></div>
    <label class="btn sm mattach">${I('clip')}Прикрепить файлы<input type="file" multiple id="mfi" hidden></label>
    <p class="err" id="mce2" role="alert"></p>
    <div class="acts"><button class="btn" type="button" data-close>Отмена</button><span class="sp"></span><button class="btn p">${I('send')}Отправить</button></div></form>`, dlg => {
    const f = dlg.querySelector('#mc'), er = dlg.querySelector('#mce2'), fl = dlg.querySelector('#mfl');
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    const draw = () => { fl.innerHTML = files.map((x, i) => `<span class="pill">${esc(x.name)} · ${fsize(x.size)} <button type="button" class="lnk" data-rm="${i}" aria-label="Убрать файл">✕</button></span>`).join(' '); fl.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { files.splice(+b.dataset.rm, 1); draw(); })); };
    dlg.querySelector('#mfi').addEventListener('change', e => {
      for (const file of e.target.files) {
        if (files.length >= 10) { er.textContent = 'Можно прикрепить не больше 10 файлов'; break; }
        if (sum(files, x => x.size) + file.size > 20 * 1048576) { er.textContent = 'Вместе вложения не должны быть больше 20 МБ'; break; }
        files.push(file);
      }
      e.target.value = ''; draw();
    });
    if (!o.to) setTimeout(() => f.to.focus(), 40); else if (o.text && !o.forward) setTimeout(() => { f.text.focus(); f.text.setSelectionRange(0, 0); f.text.scrollTop = 0; }, 40); else setTimeout(() => f.subject.focus(), 40);
    f.addEventListener('submit', async e => {
      e.preventDefault(); er.textContent = '';
      const v = Object.fromEntries(new FormData(f));
      const bad = v.to.split(/[,;\s]+/).concat(v.cc.split(/[,;\s]+/)).filter(Boolean).find(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
      if (!v.to.trim()) return er.textContent = 'Укажите, кому отправить письмо';
      if (bad) return er.textContent = `Адрес «${bad}» указан неверно`;
      const b = f.querySelector('button.p'); b.disabled = true; b.lastChild.textContent = 'Отправляем…';
      try {
        const attachments = await Promise.all(files.map(x => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok({ name: x.name, type: x.type, data: String(r.result).split(',')[1] || '' }); r.onerror = () => no(new Error('Не удалось прочитать файл ' + x.name)); r.readAsDataURL(x); })));
        const r = await api('POST', 'mail/send', { ...v, inReplyTo: o.inReplyTo, references: o.references, forward: o.forward, attachments });
        closeModal(); toast(r.deals ? 'Письмо отправлено и добавлено в историю сделки' : 'Письмо отправлено');
        if (DEAL) { DEAL.mail = null; await loadEvents(); render(); }
        if (VIEW === 'mail' && /sent/.test((MB.folders.find(x => x.path === MB.folder) || {}).special || '')) mailList(true);
      } catch (x) { er.textContent = x.message; b.disabled = false; b.lastChild.textContent = 'Отправить'; }
    });
  });
}
function quoteOf(m) {
  const t = (m.text || htmlText(m.html)).trim();
  return '\n\n\n' + (m.date ? fdt(m.date) + ', ' : '') + who(m.from) + ' <' + m.from.email + '> пишет:\n' + t.split('\n').map(l => '> ' + l).join('\n');
}
async function mailAct(k, a) {
  const m = MB.msg;
  if (k === 'mail-new') return openCompose({ to: a.dataset.to || '' });
  if (k === 'mail-folder') { MB.folder = a.dataset.v; MB.page = 1; MB.sel = null; MB.msg = null; MB.list = null; MB.q = ''; Q = ''; return mailList(); }
  if (k === 'mail-open') return mailOpen(+a.dataset.uid);
  if (k === 'mail-back') { MB.sel = null; MB.msg = null; return render(); }
  if (k === 'mail-page') { MB.page = Math.max(1, MB.page + +a.dataset.v); MB.sel = null; return mailList(); }
  if (k === 'mail-q0') { MB.q = ''; Q = ''; MB.page = 1; return mailList(); }
  if (k === 'mail-refresh') { MB.err = ''; await mailFolders(); return mailList(); }
  if (k === 'mail-img') { MB.img = true; return render(); }
  if (k === 'mail-att') return toast('В предпросмотре вложения не скачиваются — на сервере файл откроется');
  if (k === 'mail-cancel') { MB.editing = false; return render(); }
  if (k === 'mail-goto') { MB.folder = a.dataset.f; MB.page = 1; MB.q = ''; MB.list = null; location.hash = 'mail'; mailList(true); return mailOpen(+a.dataset.uid); }
  if (k === 'mail-acc') return openModal(`<h2>Настройки почты</h2><p class="sub">Подключён ящик <b>${esc(MB.acc.email)}</b>. Сервер получения: ${esc(MB.acc.imap_host)}, отправки: ${esc(MB.acc.smtp_host)}.</p>
     <div class="acts"><button class="btn dl" type="button" id="mdis">Отключить почту</button><span class="sp"></span><button class="btn" type="button" data-close>Закрыть</button><button class="btn p" type="button" id="medit">Изменить</button></div>`, dlg => {
    dlg.querySelector('[data-close]').addEventListener('click', closeModal);
    dlg.querySelector('#medit').addEventListener('click', () => { closeModal(); MB.editing = true; render(); });
    dlg.querySelector('#mdis').addEventListener('click', async () => {
      closeModal();
      if (!await ask('Отключить почту?', 'Письма останутся в вашем почтовом ящике, но в Орбите вы их больше не увидите, пока не подключите почту снова.')) return;
      try { await api('DELETE', 'mail/account'); mailReset(); MB.acc = null; setMailBadge(0); render(); toast('Почта отключена'); } catch (x) { fail(x); }
    });
  });
  if (!m) return;
  if (k === 'mail-reply') {
    const all = !!a.dataset.all, me = MB.acc.email;
    const cc = all ? [...m.to, ...m.cc].map(x => x.email).filter(x => x && x !== me && x !== m.from.email) : [];
    return openCompose({ title: 'Ответ', to: m.from.email, cc: [...new Set(cc)].join(', '), subject: /^re:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject, text: quoteOf(m), inReplyTo: m.messageId, references: [m.references, m.messageId].filter(Boolean).join(' ') });
  }
  if (k === 'mail-fwd') return openCompose({ title: 'Пересылка', subject: /^fwd?:/i.test(m.subject) ? m.subject : 'Fwd: ' + m.subject, text: '\n\n\n---------- Пересланное письмо ----------\nОт: ' + who(m.from) + ' <' + m.from.email + '>\n' + (m.date ? 'Дата: ' + fdt(m.date) + '\n' : '') + 'Тема: ' + m.subject + '\n\n' + (m.text || htmlText(m.html)), forward: m.atts.length ? { folder: m.folder, uid: m.uid } : null });
  if (k === 'mail-unread') { try { await api('POST', 'mail/seen', { folder: m.folder, uid: m.uid, seen: false }); const it = MB.list?.items.find(x => x.uid === m.uid); if (it) it.seen = false; if ((MB.folders.find(f => f.path === m.folder) || {}).special === 'inbox') setMailBadge(MB.unseen + 1); MB.sel = null; MB.msg = null; render(); } catch (x) { fail(x); } return; }
  if (k === 'mail-del') {
    if (!await ask('Удалить письмо?', (MB.folders.find(f => f.path === m.folder) || {}).special === 'trash' ? 'Письмо будет удалено из корзины навсегда.' : 'Письмо переместится в корзину почтового ящика.')) return;
    try { await api('DELETE', `mail/msg?folder=${enc(m.folder)}&uid=${m.uid}`); if (MB.list) MB.list.items = MB.list.items.filter(x => x.uid !== m.uid); MB.sel = null; MB.msg = null; render(); toast('Письмо удалено'); mailFolders().then(() => VIEW === 'mail' && !busy() && render()); } catch (x) { fail(x); }
  }
}

// ---------- главная страница (лендинг) для тех, кто ещё не вошёл ----------
const ldLogo = `<span class="ldmk">${I('orbit')}</span>`;
const LD_FEATURES = [
  ['deals', 'Воронка сделок', 'Перетаскивайте сделки между этапами, этапы настраиваются под ваш процесс. Сумма по каждому этапу видна сразу.'],
  ['lock', 'База клиентов под замком', 'Директор устанавливает права для сотрудников, а сотрудники видят только те сделки, в которых они ответственные.'],
  ['tasks', 'Дела и задачи со сроками', 'Срок до минуты, просроченные дела подсвечиваются и поднимаются наверх. Ничего не теряется между звонками.'],
  ['mail', 'Почта внутри CRM', 'Сотрудник подключает свой ящик и пишет клиентам прямо из Орбиты. Переписка также видна в сделке.'],
  ['products', 'Товары и оплата', 'Каталог товаров и услуг: выбираете позиции в сделку, сумма считается сама. Оплаты видно по каждой сделке.'],
  ['finance', 'Финансы и дашборд', 'Выручка, воронка и источники клиентов на одном экране. Доходы и расходы компании — в разделе «Финансы».'],
  ['kb', 'База знаний', 'Регламенты, скрипты и всё о продукте — всё в одном разделе.'],
  ['team', 'Команда онлайн', 'Видно, кто в сети и кто начал рабочий день.'],
];
function showLanding() {
  document.title = BRAND + ' — CRM для бизнеса';
  const reg = !CFG || CFG.register !== false;
  const cta = (txt, cls = 'p', plan = '') => reg ? `<button class="btn ${cls} ldcta" data-act="ld-reg" ${plan ? `data-plan="${plan}"` : ''}>${txt}</button>` : `<button class="btn ${cls} ldcta" data-act="to-login">Войти</button>`;
  const col = (name, color, cards) => `<div class="ldcol"><div class="ldsh" style="--c:${color}">${name}</div>${cards.map(([t, s, b, red]) => `<div class="ldcard ${red ? 'red' : ''}">${red ? '<i>Просрочено</i>' : ''}<b>${t}</b><span>${s}</span><small>${b}</small></div>`).join('')}</div>`;
  $('#root').innerHTML = `<div class="ld">
  <header class="ldnav"><a class="ldbrand" href="#" data-act="ld-top">${ldLogo}<span>Орбита</span></a>
    <nav class="ldlinks"><a href="#" data-ld="ldf">Возможности</a><a href="#" data-ld="ldp">Тарифы</a><a href="#" data-ld="ldq">Вопросы</a></nav>
    <span class="sp"></span><button class="ib ldtheme" data-act="theme" aria-label="Сменить тему">${I(theme() === 'dark' ? 'sun' : 'moon')}</button>
    <button class="btn ldin" data-act="to-login">Войти</button>${reg ? `<button class="btn p ldtop" data-act="ld-reg">Подключить компанию</button>` : ''}</header>
  <section class="ldhero"><div class="ldhtxt"><span class="ldbadge">CRM для бизнеса</span>
    <h1>Выведите бизнес<br>на орбиту</h1>
    <p>Сделки, клиенты, задачи, почта и финансы в одном окне. Директор видит всю картину, а сотрудники — только то, что им нужно для работы.</p>
    <div class="ldbtns">${cta('Подключить компанию')}<button class="btn ldghost" data-ld="ldf">Что умеет Орбита</button></div>
    <ul class="ldchecks"><li>${I('tasks')}Без ограничений по сотрудникам</li><li>${I('lock')}Права доступа для каждого</li><li>${I('upload')}Работает в браузере и на телефоне</li></ul></div>
    <div class="ldmock" aria-hidden="true"><div class="ldmtop"><i></i><i></i><i></i><span>Сделки</span></div><div class="ldmb">
      ${col('Новый лид', '#6366f1', [['Футболки с логотипом', '57 500 руб.', 'ООО «Текстиль»', true], ['Кружки для офиса', '18 000 руб.', 'ИП Смирнов']])}
      ${col('Переговоры', '#8b5cf6', [['Мебель для кафе', '240 000 руб.', 'Кафе «Лето»'], ['Сайт под ключ', '95 000 руб.', 'Студия «Бриз»']])}
      ${col('Договор', '#f59e0b', [['Поставка бумаги', '64 300 руб.', 'ООО «Офис+»']])}</div></div></section>
  <section class="ldsec" id="ldf"><h2>Ни одна сделка больше не потеряется</h2><p class="ldlead">Каждый клиент, звонок и договорённость — на своём месте.</p>
    <div class="ldgrid">${LD_FEATURES.map(([ic, t, d]) => `<div class="ldf"><span class="ldic">${I(ic)}</span><b>${t}</b><p>${d}</p></div>`).join('')}</div></section>
  <section class="ldsec ldsafe"><div><h2>Ваши клиенты остаются вашими</h2><p class="ldlead">Менеджеры не уносят базу при увольнении и не видят выручку всей компании — если вы этого не хотите.</p>
    <ul class="ldlist"><li><b>Права по каждому разделу.</b> Видеть, добавлять, изменять, удалять — отдельно для сделок, клиентов, задач и остального.</li><li><b>Суммы только для своих.</b> Можно скрыть от сотрудника все деньги: суммы сделок, оплаты и финансы.</li><li><b>Только свои клиенты.</b> Менеджер видит лишь свои сделки и клиентов из них — выгрузить всю базу не получится.</li><li><b>Надёжная защита входа.</b> У каждого сотрудника свой логин и пароль. Если человек ушёл из компании, директор закрывает ему доступ в один клик.</li></ul></div>
    <div class="ldacl" aria-hidden="true"><div class="ldah"><span></span><b>Видеть</b><b>Добавлять</b><b>Изменять</b><b>Удалять</b></div>${[['Сделки', 1, 1, 1, 0], ['Клиенты', 1, 1, 0, 0], ['Задачи', 1, 1, 1, 1], ['Финансы', 0, 0, 0, 0]].map(([n, ...v]) => `<div class="ldar"><span>${n}</span>${v.map(x => `<i class="${x ? 'on' : ''}">${x ? '✓' : ''}</i>`).join('')}</div>`).join('')}</div></section>
  <section class="ldsec" id="ldsteps"><h2>Как подключиться</h2><div class="ldsteps">
    <div><em>1</em><b>Оставьте заявку</b><p>Название компании, ИНН, контакты и документы — пара минут.</p></div>
    <div><em>2</em><b>Согласуйте оплату</b><p>Менеджер свяжется с вами, проверит документы и выставит счёт.</p></div>
    <div><em>3</em><b>Получите доступ</b><p>Логин и пароль придут на почту. Приглашайте сотрудников и работайте.</p></div></div></section>
  <section class="ldsec" id="ldp"><h2>Тарифы</h2><p class="ldlead">Все возможности в любом тарифе. Сотрудники без ограничений.</p>
    <div class="ldplans">${PLANS.map((p, i) => `<div class="ldplan ${i === 2 ? 'best' : ''}">${i === 2 ? '<span class="ldtag">Выгоднее всего</span>' : i === 1 ? '<span class="ldtag soft">Популярный</span>' : ''}<b>${p.name}</b><div class="ldprice">${rub(p.price)}</div><small>${p.months > 1 ? rub(p.price / p.months) + ' в месяц' : 'без обязательств'}</small>${p.save > 0 ? `<span class="ldsave">Экономия ${rub(p.save)}</span>` : '<span class="ldsave mu">&nbsp;</span>'}${cta('Выбрать', i === 2 ? 'p' : '', p.id)}</div>`).join('')}</div></section>
  <section class="ldsec" id="ldq"><h2>Частые вопросы</h2><div class="ldfaq">
    <details><summary>Можно ли попробовать перед оплатой?</summary><p>Оставьте заявку — менеджер покажет Орбиту и ответит на вопросы до оплаты.</p></details>
    <details><summary>Сколько сотрудников можно подключить?</summary><p>Сколько угодно, цена тарифа от этого не меняется. Каждому сотруднику директор настраивает свои права.</p></details>
    <details><summary>Как оплатить?</summary><p>После проверки документов менеджер выставит счёт на вашу компанию или ИП.</p></details>
    <details><summary>Что будет, если сотрудник уволится?</summary><p>Директор блокирует его доступ одной кнопкой — он сразу выходит из Орбиты на всех устройствах. Все его сделки, клиенты и задачи остаются в компании, их можно передать другому менеджеру.</p></details>
    <details><summary>Работает ли на телефоне?</summary><p>Да, Орбита открывается в браузере на компьютере, планшете и телефоне, ничего устанавливать не нужно.</p></details></div></section>
  <section class="ldfinal"><h2>Готовы навести порядок в бизнесе?</h2><p>Оставьте заявку — менеджер свяжется с вами в течение рабочего дня.</p>${cta('Подключить компанию')}</section>
  <footer class="ldfoot"><span>© ${new Date().getFullYear()} Орбита</span><button class="lnk" data-legal="privacy">Политика конфиденциальности</button><button class="lnk" data-legal="offer">Договор-оферта</button><button class="lnk" data-legal="consent">Согласие на обработку данных</button><span class="sp"></span><button class="lnk" data-act="to-login">Войти в Орбиту</button></footer>
  </div>`;
  document.querySelectorAll('.ld [data-legal]').forEach(b => b.addEventListener('click', () => openLegal(b.dataset.legal)));
  document.querySelectorAll('.ld [data-ld]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.getElementById(a.dataset.ld)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
}
// для тех, кто не вошёл: главная, вход или регистрация по адресу
async function pubRoute() {
  await config();
  const h = location.hash.slice(1);
  if (h === 'login') return showLogin();
  if (h === 'register') return showRegister();
  return showLanding();
}

// ---------- запуск ----------
async function startApp() {
  mailReset();
  await load();
  route();
  if (can('mail')) mailInit();
}
(async function boot() {
  const u = new URL(location.href);
  if (u.pathname === '/invite' && u.searchParams.get('token')) return showInvite(u.searchParams.get('token'));
  try { const r = await fetch('/api/me', { credentials: 'same-origin' }); if (r.status === 401) return pubRoute(); } catch {}
  try { await startApp(); } catch { if (!D) pubRoute(); }
})();
})();
