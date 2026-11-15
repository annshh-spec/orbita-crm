'use strict';
// CRM-система: сервер (Node.js 22+, без внешней базы данных — SQLite встроен в Node)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

// ---------- настройки из .env ----------
(function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();
const env = process.env;
const PORT = +env.PORT || 3000;
const APP_URL = (env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SECURE = APP_URL.startsWith('https://');
const COMPANY = env.COMPANY_NAME || 'Моя компания';
const TRUST_PROXY = env.TRUST_PROXY === '1';
const ALLOW_REG = env.ALLOW_REGISTRATION !== '0';
const BRAND = env.APP_NAME || 'Орбита';
const UPLOADS = path.join(__dirname, 'data', 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(env.DB_PATH || path.join(DATA_DIR, 'crm.db'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');

// ---------- схема данных ----------
const SECTIONS = ['dashboard', 'deals', 'contacts', 'tasks', 'contracts', 'finance', 'kb'];
const E = {
  deals:     { sec: 'deals',     req: 'title', f: ['title', 'contact_id', 'stage_id', 'resp_id', 'next', 'next_date', 'note'], money: ['amount'], ids: ['contact_id', 'stage_id', 'resp_id'] },
  contacts:  { sec: 'contacts',  req: 'name',  f: ['name', 'company', 'position', 'phone', 'email', 'source', 'note'] },
  tasks:     { sec: 'tasks',     req: 'title', f: ['title', 'due', 'due_time', 'kind', 'resp_id', 'deal_id', 'prio', 'note', 'done'], ids: ['resp_id', 'deal_id'] },
  contracts: { sec: 'contracts', req: 'num',   f: ['num', 'title', 'contact_id', 'deal_id', 'date', 'status', 'link', 'note'], money: ['amount'], ids: ['contact_id', 'deal_id'] },
  kb:        { sec: 'kb',        req: 'title', f: ['title', 'cat', 'body'] },
  kbf:       { sec: 'kb',        req: 'name',  f: ['name', 'pos'] }, // подразделы базы знаний
  products:  { sec: 'products',  req: 'name',  f: ['name', 'kind', 'unit', 'sku', 'note'], money: ['price'] }, // каталог товаров и услуг
  tx:        { sec: 'finance',   req: 'date',  f: ['type', 'date', 'cat', 'note', 'amount', 'deal_id'], ids: ['deal_id'] },
};
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE COLLATE NOCASE, name, position, role, pass, status,
  perms, invite_hash, invite_exp, last_seen INTEGER DEFAULT 0, logged_out INTEGER DEFAULT 1, last_login INTEGER, created_at INTEGER);
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, user_id INTEGER, exp INTEGER);
CREATE TABLE IF NOT EXISTS stages(id INTEGER PRIMARY KEY, name, color, pos, kind);
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v);
CREATE TABLE IF NOT EXISTS companies(id INTEGER PRIMARY KEY, name, inn, created_at INTEGER);
CREATE TABLE IF NOT EXISTS reg_requests(id INTEGER PRIMARY KEY, company, inn, name, phone, email, pass, files, status, created_at INTEGER, decided_at INTEGER, ip);
CREATE TABLE IF NOT EXISTS mail_accounts(user_id INTEGER PRIMARY KEY, email, login, pass_enc, name, imap_host, imap_port, smtp_host, smtp_port, save_sent, created_at INTEGER);
CREATE TABLE IF NOT EXISTS deal_files(id INTEGER PRIMARY KEY, company_id INTEGER, deal_id INTEGER, event_id INTEGER, name, size INTEGER, ext, stored, created_by INTEGER, created_at INTEGER);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, deal_id INTEGER, type, text, user_id INTEGER, created_at INTEGER);
CREATE INDEX IF NOT EXISTS events_deal ON events(deal_id);
`);
for (const [t, s] of Object.entries(E)) {
  const cols = [...new Set([...s.f, ...(s.money || [])])];
  db.exec(`CREATE TABLE IF NOT EXISTS ${t}(id INTEGER PRIMARY KEY, ${cols.join(', ')}, created_by, created_at, updated_at, closed_at)`);
  const have = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
  for (const c of [...cols, 'created_by', 'created_at', 'updated_at', 'closed_at']) if (!have.includes(c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c}`);
}
for (const [t, c] of [['users', 'platform'], ['companies', 'inn'], ['reg_requests', 'plan'], ['reg_requests', 'amount'], ['reg_requests', 'pay_status'], ['reg_requests', 'payment_id'], ['reg_requests', 'pay_token'], ['reg_requests', 'method'], ['reg_requests', 'consent_at'], ['reg_requests', 'paid_at'], ['kb', 'file'], ['deals', 'extra'], ['deals', 'items'], ['users', 'work_state'], ['users', 'work_since'], ['companies', 'plan'], ['companies', 'paid_until']]) if (!db.prepare(`PRAGMA table_info(${t})`).all().some(x => x.name === c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c}`);
// Компании: у каждой свои сотрудники, этапы и данные
const TENANT = ['users', 'stages', ...Object.keys(E)];
for (const t of TENANT) {
  if (!db.prepare(`PRAGMA table_info(${t})`).all().some(c => c.name === 'company_id')) db.exec(`ALTER TABLE ${t} ADD COLUMN company_id INTEGER`);
  db.exec(`CREATE INDEX IF NOT EXISTS ${t}_company ON ${t}(company_id)`);
}
function addStages(cid) {
  const ins = db.prepare('INSERT INTO stages(name,color,pos,kind,company_id) VALUES(?,?,?,?,?)');
  [['Новый лид', '#6366f1', 'open'], ['Квалификация', '#3b82f6', 'open'], ['КП отправлено', '#06b6d4', 'open'],
   ['Переговоры', '#8b5cf6', 'open'], ['Договор', '#f59e0b', 'open'], ['Успешно', '#10b981', 'won'], ['Отказ', '#ef4444', 'lost']]
    .forEach((s, i) => ins.run(s[0], s[1], i, s[2], cid));
}
// перенос данных из версии без компаний
const hasOld = TENANT.some(t => db.prepare(`SELECT 1 FROM ${t} WHERE company_id IS NULL LIMIT 1`).get());
if (hasOld || (env.ADMIN_EMAIL && !db.prepare('SELECT 1 FROM companies').get())) {
  if (!db.prepare('SELECT 1 FROM companies WHERE id=1').get()) db.prepare('INSERT INTO companies(id,name,created_at) VALUES(1,?,?)').run(COMPANY, Date.now());
  for (const t of TENANT) db.exec(`UPDATE ${t} SET company_id=1 WHERE company_id IS NULL`);
  if (!db.prepare('SELECT 1 FROM stages WHERE company_id=1').get()) addStages(1);
}
// подразделы базы знаний: по умолчанию «Регламенты», «Продукт», «Скрипты» и разделы из старых статей
const KB_DEFAULT = ['Регламенты', 'Продукт', 'Скрипты'];
function ensureKbf(cid) {
  const key = 'kbf_init:' + cid;
  if (db.prepare('SELECT 1 FROM settings WHERE k=?').get(key)) return;
  const names = [...KB_DEFAULT];
  for (const r of db.prepare("SELECT DISTINCT cat FROM kb WHERE company_id=? AND cat IS NOT NULL AND cat<>''").all(cid)) if (!names.some(n => n.toLowerCase() === String(r.cat).toLowerCase())) names.push(r.cat);
  const ins = db.prepare('INSERT INTO kbf(name,pos,company_id,created_at,updated_at) VALUES(?,?,?,?,?)');
  names.forEach((n, i) => ins.run(n, i, cid, Date.now(), Date.now()));
  db.prepare('INSERT INTO settings(k,v) VALUES(?,?)').run(key, '1');
}
// файлы статей базы знаний
const KB_DIR = path.join(UPLOADS, 'kb');
const KB_TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', txt: 'text/plain; charset=utf-8', rtf: 'application/rtf', odt: 'application/vnd.oasis.opendocument.text' };
function kbSaveFile(cid, up) {
  const name = String(up.name || 'документ').slice(0, 150), ext = name.split('.').pop().toLowerCase();
  if (!KB_TYPES[ext]) fail(400, 'Подходят файлы PDF, DOCX, DOC, TXT, RTF и ODT');
  const buf = Buffer.from(String(up.data || ''), 'base64');
  if (!buf.length) fail(400, 'Файл пустой');
  if (buf.length > 20 * 1048576) fail(400, 'Файл больше 20 МБ');
  const dir = path.join(KB_DIR, String(cid)); fs.mkdirSync(dir, { recursive: true });
  const stored = crypto.randomBytes(12).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(dir, stored), buf);
  return JSON.stringify({ name, size: buf.length, ext, stored });
}
function kbDropFile(cid, meta) { try { const m = JSON.parse(meta || 'null'); if (m && m.stored) fs.unlinkSync(path.join(KB_DIR, String(cid), path.basename(m.stored))); } catch {} }
// файлы к делам, комментариям и задачам в сделке: документы, скриншоты, фото
const DEAL_DIR = path.join(UPLOADS, 'deals');
const DF_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8', rtf: 'application/rtf', odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet', zip: 'application/zip', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed', mp4: 'video/mp4', mov: 'video/quicktime' };
const DF_IMG = /^(jpe?g|png|gif|webp)$/;
function dealFilesCheck(files) {
  if (!Array.isArray(files) || !files.length) return [];
  if (files.length > 10) fail(400, 'Можно прикрепить не больше 10 файлов за раз');
  let total = 0;
  return files.map(f => {
    const name = String(f.name || 'файл').replace(/[\\/\r\n]/g, ' ').slice(0, 150), ext = (name.split('.').pop() || '').toLowerCase();
    if (!DF_TYPES[ext]) fail(400, `Файл «${name}» не подходит: прикрепляйте фото, скриншоты, PDF, Word, Excel, презентации или архивы`);
    const buf = Buffer.from(String(f.data || ''), 'base64'); if (!buf.length) fail(400, `Файл «${name}» пустой`);
    if (buf.length > 15 * 1048576) fail(400, `Файл «${name}» больше 15 МБ`);
    total += buf.length; if (total > 30 * 1048576) fail(400, 'Вместе файлы больше 30 МБ');
    return { name, ext, buf };
  });
}
function dealFilesSave(cid, dealId, eventId, uid, list) {
  if (!list.length) return;
  const dir = path.join(DEAL_DIR, String(cid)); fs.mkdirSync(dir, { recursive: true });
  const ins = db.prepare('INSERT INTO deal_files(company_id,deal_id,event_id,name,size,ext,stored,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)');
  for (const f of list) { const stored = crypto.randomBytes(12).toString('hex') + '.' + f.ext; fs.writeFileSync(path.join(dir, stored), f.buf); ins.run(cid, dealId, eventId, f.name, f.buf.length, f.ext, stored, uid, Date.now()); }
}
const companyName = cid => (db.prepare('SELECT name FROM companies WHERE id=?').get(cid) || {}).name || COMPANY;

// ---------- пароли и токены ----------
const now = () => Date.now();
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
function hashPass(p) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `s1:${salt}:${crypto.scryptSync(p, salt, 64).toString('hex')}`;
}
function checkPass(p, stored) {
  if (!stored) return false;
  const [, salt, h] = stored.split(':');
  const a = crypto.scryptSync(String(p), salt, 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const passProblem = p => (typeof p !== 'string' || p.length < 8) ? 'Пароль должен быть не короче 8 символов'
  : (!/[A-Za-zА-Яа-я]/.test(p) || !/\d/.test(p)) ? 'Пароль должен содержать буквы и цифры' : null;

// ---------- директор ----------
const cli = process.argv.slice(2);
if (cli[0] === 'reset-admin') {
  const [, email, pass] = cli;
  if (!email || passProblem(pass)) { console.log('Использование: node server.js reset-admin почта@домен ПарольИзБукв123'); process.exit(1); }
  const d = db.prepare("SELECT id FROM users WHERE email=? AND role='director'").get(email) || db.prepare("SELECT id FROM users WHERE role='director' AND company_id=1").get();
  if (d) db.prepare('UPDATE users SET email=?, pass=?, status=? WHERE id=?').run(email, hashPass(pass), 'active', d.id);
  else {
    if (!db.prepare('SELECT 1 FROM companies WHERE id=1').get()) { db.prepare('INSERT INTO companies(id,name,created_at) VALUES(1,?,?)').run(COMPANY, now()); addStages(1); }
    db.prepare('INSERT INTO users(email,name,position,role,pass,status,perms,created_at,company_id) VALUES(?,?,?,?,?,?,?,?,1)')
      .run(email, env.ADMIN_NAME || 'Директор', 'Директор', 'director', hashPass(pass), 'active', '{}', now());
  }
  db.prepare('DELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE email=?)').run(email);
  console.log('Готово: вход директора — ' + email); process.exit(0);
}
if (!db.prepare("SELECT id FROM users WHERE role='director' AND company_id=1").get() && env.ADMIN_EMAIL) {
  if (env.ADMIN_PASSWORD && !passProblem(env.ADMIN_PASSWORD) && !db.prepare('SELECT 1 FROM users WHERE email=?').get(env.ADMIN_EMAIL)) {
    db.prepare('INSERT INTO users(email,name,position,role,pass,status,perms,created_at,company_id) VALUES(?,?,?,?,?,?,?,?,1)')
      .run(env.ADMIN_EMAIL, env.ADMIN_NAME || 'Директор', 'Директор', 'director', hashPass(env.ADMIN_PASSWORD), 'active', '{}', now());
    console.log('Создана учётная запись директора: ' + env.ADMIN_EMAIL);
  } else console.warn('ВНИМАНИЕ: директор из .env не создан: проверьте ADMIN_PASSWORD (от 8 символов, буквы и цифры)');
}
if (env.ADMIN_EMAIL) db.prepare('UPDATE users SET platform=1 WHERE email=? AND role=\'director\'').run(env.ADMIN_EMAIL);
for (const e of String(env.PLATFORM_ADMINS || '').split(',').map(x => x.trim()).filter(Boolean)) db.prepare('UPDATE users SET platform=1 WHERE email=?').run(e);
if (!ALLOW_REG && !db.prepare('SELECT 1 FROM users').get()) console.warn('ВНИМАНИЕ: регистрация выключена и пользователей нет. Укажите ADMIN_EMAIL и ADMIN_PASSWORD в .env');

const logEvent = (dealId, type, text, uid) => db.prepare('INSERT INTO events(deal_id,type,text,user_id,created_at) VALUES(?,?,?,?,?)').run(dealId, type, String(text || '').slice(0, 5000), uid, Date.now());
const stageName = id => (db.prepare('SELECT name FROM stages WHERE id=?').get(id) || {}).name || '—';

// ---------- права ----------
const PERMS = require('./public/perms-core.js');
const DF = require('./public/dealform-core.js');
// товары в сделке: берём из каталога, цену может поменять только тот, кто видит суммы
function dealItems(raw, cid, P, oldItems) {
  if (!Array.isArray(raw)) fail(400, 'Неверный список товаров');
  if (raw.length > 100) fail(400, 'Не больше 100 позиций в сделке');
  let old = []; try { old = JSON.parse(oldItems || '[]'); } catch {}
  const out = raw.map(x => {
    const p = db.prepare('SELECT id, name, price, unit, kind FROM products WHERE id=? AND company_id=?').get(+x.pid, cid);
    const prev = old.find(o => o.pid === +x.pid);
    if (!p && !prev) fail(400, 'Товар не найден в каталоге');
    const qty = Math.round(Math.min(1e6, Math.max(0, +String(x.qty ?? 1).replace(',', '.') || 0)) * 1000) / 1000 || 1;
    const base = p ? +p.price || 0 : +prev.price || 0;
    const price = P.money && x.price != null && x.price !== '' ? Math.max(0, Math.round((+String(x.price).replace(/\s/g, '').replace(',', '.') || 0) * 100) / 100) : (prev ? +prev.price : base);
    return { pid: +x.pid, name: p ? p.name : prev.name, unit: p ? p.unit || 'шт.' : prev.unit, kind: p ? p.kind || 'Товар' : prev.kind, qty, price };
  });
  return { items: JSON.stringify(out), amount: Math.round(out.reduce((s, x) => s + x.qty * x.price, 0) * 100) / 100 };
}
const dealForm = cid => { try { return DF.cleanForm(JSON.parse((db.prepare('SELECT v FROM settings WHERE k=?').get('dealform:' + cid) || {}).v || '{}')); } catch { return DF.cleanForm({}); } };
// ---------- почта сотрудников ----------
const MAIL = require('./mail.js');
const MAIL_KEY = env.MAIL_SECRET || (() => { const f = path.join(DATA_DIR, 'mail.key'); if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 }); return fs.readFileSync(f, 'utf8').trim(); })();
const mailCipher = MAIL.cipher(MAIL_KEY);
function mailAcc(uid) {
  const r = db.prepare('SELECT * FROM mail_accounts WHERE user_id=?').get(uid); if (!r) return null;
  try { return { ...r, pass: mailCipher.dec(r.pass_enc) }; } catch { return null; }
}
const unseenCache = new Map();
const permsOf = PERMS.permsOf;
const cleanPerms = (p, P) => JSON.stringify(PERMS.clamp(PERMS.normalize(p), P));
const ONLINE_MS = 70000;
const presence = u => ({ online: !u.logged_out && now() - (u.last_seen || 0) < ONLINE_MS, last_seen: u.last_seen || 0 });

// Видимые записи с учётом «только свои клиенты»
function visible(u, P, t) {
  const rows = db.prepare(`SELECT * FROM ${t} WHERE company_id=? ORDER BY id DESC`).all(u.company_id).map(r => ({ ...r }));
  if (!P.onlyOwn || t === 'kb' || t === 'kbf' || t === 'tx' || t === 'products') return rows;
  const myDeals = db.prepare('SELECT id, contact_id FROM deals WHERE resp_id=? OR created_by=?').all(u.id, u.id);
  const dealIds = new Set(myDeals.map(d => d.id));
  const contactIds = new Set(myDeals.map(d => d.contact_id).filter(Boolean));
  for (const c of db.prepare('SELECT id FROM contacts WHERE created_by=?').all(u.id)) contactIds.add(c.id);
  if (t === 'deals') return rows.filter(r => dealIds.has(r.id));
  if (t === 'contacts') return rows.filter(r => contactIds.has(r.id));
  if (t === 'tasks') return rows.filter(r => r.resp_id === u.id || r.created_by === u.id);
  if (t === 'contracts') return rows.filter(r => r.created_by === u.id || dealIds.has(r.deal_id) || contactIds.has(r.contact_id));
  return [];
}
function strip(P, t, rows) {
  if (P.money || !E[t].money) return rows;
  if (t === 'deals') rows = rows.map(r => { if (!r.items) return r; try { return { ...r, items: JSON.stringify(JSON.parse(r.items).map(({ price, ...x }) => x)) }; } catch { return r; } });
  return rows.map(r => { const c = { ...r }; for (const m of E[t].money) delete c[m]; return c; });
}
const canSection = (P, t) => !!P.sections[E[t].sec];
const may = (P, t, a) => !!(P.acl[E[t].sec] && P.acl[E[t].sec][a]);
const ACT_NAME = { c: 'добавлять записи', e: 'изменять записи', d: 'удалять записи' };
const need = (P, t, a) => { if (!may(P, t, a)) fail(403, `У вас нет права ${ACT_NAME[a]} в этом разделе`); };

// ---------- почта ----------
// системные письма (приглашения, пароли, заявки) уходят через SMTP из .env — без сторонних пакетов
let mailer = null;
if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  const fm = String(env.SMTP_FROM || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const acc = { email: fm ? fm[2].trim() : env.SMTP_USER, login: env.SMTP_USER, pass: env.SMTP_PASS, smtp_host: env.SMTP_HOST, smtp_port: +env.SMTP_PORT || 465, save_sent: 0 };
  const fromName = fm && fm[1].trim() ? fm[1].trim() : BRAND;
  mailer = { sendMail: ({ to, subject, text, html }) => MAIL.send(acc, { fromName, to: String(to).split(',').map(x => x.trim()).filter(Boolean).map(email => ({ email })), cc: [], subject, text, html }) };
}
// название в кавычках, если их ещё нет: ООО «Ромашка» остаётся как есть
const q = s => /[«"]/.test(String(s)) ? String(s) : `«${s}»`;
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function sendInvite(u, link, reset, company) {
  if (!mailer) return false;
  const subj = reset ? `Сброс пароля в CRM «${BRAND}» — ${q(company)}` : `Приглашение в CRM «${BRAND}» — ${q(company)}`;
  const text = reset ? 'Чтобы задать новый пароль, перейдите по ссылке:' : 'Вас пригласили в CRM-систему. Чтобы активировать личный кабинет, придумайте пароль по ссылке:';
  try {
    await mailer.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER, to: u.email, subject: subj,
      text: `Здравствуйте, ${u.name}!\n\n${text}\n${link}\n\nСсылка действует 7 дней.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#141a3a;max-width:520px">
        <h2 style="margin:0 0 12px">${escH(subj)}</h2><p>Здравствуйте, ${escH(u.name)}!</p><p>${text}</p>
        <p><a href="${link}" style="display:inline-block;background:#5b5ff0;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none">Придумать пароль</a></p>
        <p style="color:#6b7194;font-size:13px">Ссылка действует 7 дней. Если кнопка не открывается, скопируйте адрес: ${link}</p></div>`,
    });
    return true;
  } catch (e) { console.error('Ошибка отправки письма:', e.message); return false; }
}
function newInvite(userId) {
  const t = token();
  db.prepare('UPDATE users SET invite_hash=?, invite_exp=? WHERE id=?').run(sha(t), now() + 7 * 864e5, userId);
  return `${APP_URL}/invite?token=${t}`;
}

// ---------- HTTP ----------
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  ...(SECURE ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
};
function send(res, code, obj, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...headers });
  res.end(JSON.stringify(obj));
}
class HttpErr extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const fail = (code, msg) => { throw new HttpErr(code, msg); };
function readBody(req, limit = 2e6) {
  return new Promise((ok, no) => {
    let size = 0, chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { no(new HttpErr(413, 'Слишком большой запрос')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { no(new HttpErr(400, 'Неверный формат')); } });
    req.on('error', no);
  });
}
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const ip = req => (TRUST_PROXY && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress) || '?';
const sessionCookie = (t, maxAge) => `sid=${t}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;
function startSession(res, u) {
  const t = token();
  db.prepare('INSERT INTO sessions(hash,user_id,exp) VALUES(?,?,?)').run(sha(t), u.id, now() + 30 * 864e5);
  db.prepare('UPDATE users SET last_login=?, last_seen=?, logged_out=0 WHERE id=?').run(now(), now(), u.id);
  return sessionCookie(t, 30 * 86400);
}
function auth(req) {
  const t = cookies(req).sid; if (!t) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE hash=?').get(sha(t));
  if (!s || s.exp < now()) return null;
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(s.user_id);
  if (!u || u.status !== 'active') return null;
  if (u.logged_out || now() - (u.last_seen || 0) > 15000) db.prepare('UPDATE users SET last_seen=?, logged_out=0 WHERE id=?').run(now(), u.id);
  return { ...u, sessionHash: s.hash };
}
const workOf = u => { const st = ['on', 'pause'].includes(u.work_state) && u.work_since && new Date(u.work_since).toDateString() === new Date().toDateString() ? u.work_state : 'off'; return { work_state: st, work_since: st === 'off' ? null : u.work_since }; };
const me = u => ({ id: u.id, email: u.email, name: u.name, position: u.position, role: u.role, perms: permsOf(u), company_id: u.company_id, platform: !!u.platform, ...workOf(u) });
function innOk(v) { return /^(\d{10}|\d{12})$/.test(v); }
// ---------- тарифы (оплату проводит менеджер) ----------
const PLANS = { m1: { name: '1 месяц', price: 2990 }, m6: { name: '6 месяцев', price: 2790 * 6 }, y1: { name: '12 месяцев', price: 2390 * 12 } };

// пароль из букв и цифр без похожих символов (0/O, 1/l)
const genPass = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', d = '23456789', all = a + d; let p = a[crypto.randomInt(a.length)] + d[crypto.randomInt(d.length)]; while (p.length < 10) p += all[crypto.randomInt(all.length)]; return p.split('').sort(() => crypto.randomInt(3) - 1).join(''); };
const DOC_TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
function createCompany({ company, inn, name, email, pass }, platform) {
  const cid = Number(db.prepare('INSERT INTO companies(name,inn,created_at) VALUES(?,?,?)').run(company, inn || null, now()).lastInsertRowid);
  addStages(cid);
  const uid = Number(db.prepare('INSERT INTO users(email,name,position,role,pass,status,perms,created_at,company_id,platform) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(email, name, 'Директор', 'director', pass, 'active', '{}', now(), cid, platform ? 1 : 0).lastInsertRowid);
  return db.prepare('SELECT * FROM users WHERE id=?').get(uid);
}
const reqOut = r => ({ id: r.id, company: r.company, inn: r.inn, name: r.name, phone: r.phone, email: r.email, status: r.status, created_at: r.created_at, plan: r.plan, amount: r.amount, pay_status: r.pay_status || 'none', paid_at: r.paid_at,
  files: JSON.parse(r.files || '[]').map((f, i) => ({ name: f.name, size: f.size, url: `/api/requests/${r.id}/file/${i}` })) });
async function mail(to, subject, text) {
  if (!mailer || !to) return false;
  try { await mailer.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, text }); return true; } catch (e) { console.error('Ошибка отправки письма:', e.message); return false; }
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// ссылки на записи только внутри своей компании
const REF = { resp_id: 'users', contact_id: 'contacts', deal_id: 'deals', stage_id: 'stages' };
function checkRefs(v, cid) { for (const [k, t] of Object.entries(REF)) if (v[k] != null && !db.prepare(`SELECT 1 FROM ${t} WHERE id=? AND company_id=?`).get(v[k], cid)) v[k] = k === 'stage_id' ? undefined : null; for (const k in v) if (v[k] === undefined) delete v[k]; }

// защита от подбора пароля
const tries = new Map();
function limited(key) {
  const r = tries.get(key);
  if (r && r.until > now()) return Math.ceil((r.until - now()) / 60000);
  return 0;
}
function failTry(key) {
  const r = tries.get(key) || { n: 0, until: 0 };
  r.n++; if (r.n >= 5) { r.until = now() + 15 * 60000; r.n = 0; }
  tries.set(key, r);
}

// приведение значений
function pick(t, body, P, partial) {
  const s = E[t], out = {};
  const fields = [...s.f, ...(P.money ? s.money || [] : [])];
  for (const k of fields) {
    if (!(k in body)) { if (!partial) out[k] = null; continue; }
    let v = body[k];
    if ((s.ids || []).includes(k)) v = v === '' || v == null ? null : (Number.isInteger(+v) ? +v : null);
    else if (k === 'amount' || k === 'price') v = v === '' || v == null ? null : Math.round((+String(v).replace(',', '.') || 0) * 100) / 100;
    else if (k === 'done') v = v ? 1 : 0;
    else v = v == null ? '' : String(v).slice(0, t === 'kb' && k === 'body' ? 600000 : k === 'body' || k === 'note' ? 20000 : 500).trim();
    out[k] = v;
  }
  return out;
}

async function api(req, res, parts) {
  const M = req.method, body = M === 'GET' ? {} : await readBody(req, parts[0] === 'register' ? 80e6 : parts[0] === 'mail' || parts[0] === 'kb' || parts[0] === 'deals' || parts[0] === 'tasks' ? 40e6 : 2e6);
  if (M !== 'GET' && req.headers['x-crm'] !== '1' && parts[0] !== 'bye') fail(403, 'Запрос отклонён');
  const [a, b, c] = parts;

  // --- без входа ---
  if (a === 'config') return send(res, 200, { company: BRAND, register: ALLOW_REG });
  if (a === 'register' && M === 'POST') {
    if (!ALLOW_REG) fail(403, 'Регистрация закрыта');
    const key = 'reg|' + ip(req), wait = limited(key);
    if (wait) fail(429, `Слишком много заявок. Попробуйте через ${wait} мин.`);
    const company = String(body.company || '').trim().slice(0, 150), inn = String(body.inn || '').replace(/\D/g, ''), name = String(body.name || '').trim().slice(0, 100);
    const phone = String(body.phone || '').trim().slice(0, 40), email = String(body.email || '').trim().toLowerCase();
    if (!company) fail(400, 'Укажите название компании');
    if (!innOk(inn)) fail(400, 'Проверьте ИНН: 10 цифр у организации или 12 у ИП');
    if (!name) fail(400, 'Укажите ваше имя');
    if (phone.replace(/\D/g, '').length !== 11) fail(400, 'Введите телефон полностью: +7 и ещё 10 цифр');
    if (!EMAIL_RE.test(email)) fail(400, 'Укажите корректный email — он станет вашим логином');
    if (body.consent !== true) fail(400, 'Нужно согласие на обработку персональных данных и принятие оферты');
    const plan = PLANS[body.plan] ? body.plan : null; if (!plan) fail(400, 'Выберите тариф');
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) fail(400, 'Этот email уже зарегистрирован. Войдите или укажите другой');
    if (db.prepare("SELECT 1 FROM reg_requests WHERE email=? AND status='new'").get(email)) fail(400, 'Заявка с этим email уже отправлена — менеджер скоро свяжется с вами');
    const files = Array.isArray(body.files) ? body.files : [];
    if (!files.length) fail(400, 'Прикрепите хотя бы один документ компании');
    if (files.length > 5) fail(400, 'Можно прикрепить не больше 5 файлов');
    const bufs = files.map(f => {
      const ext = String(f.name || '').split('.').pop().toLowerCase();
      if (!DOC_TYPES[ext]) fail(400, `Файл «${f.name}» не подходит: нужен PDF, JPG, PNG или DOC`);
      const buf = Buffer.from(String(f.data || ''), 'base64');
      if (!buf.length) fail(400, `Файл «${f.name}» пустой`);
      if (buf.length > 10 * 1048576) fail(400, `Файл «${f.name}» больше 10 МБ`);
      return { name: String(f.name).slice(0, 150), ext, buf };
    });
    failTry(key);
    // самая первая регистрация на пустом сервере сразу становится владельцем платформы
    if (!db.prepare('SELECT 1 FROM users').get()) {
      const pw = genPass(), nu = createCompany({ company, inn, name, email, pass: hashPass(pw) }, true);
      mail(email, `Ваш пароль в CRM «${BRAND}»`, `Здравствуйте, ${name}!\n\nВаш логин: ${email}\nПароль: ${pw}\n\nВход: ${APP_URL}`);
      return send(res, 200, { approved: true, password: pw, me: me(nu) }, { 'Set-Cookie': startSession(res, nu) });
    }
    const rid = Number(db.prepare("INSERT INTO reg_requests(company,inn,name,phone,email,pass,files,status,created_at,ip,plan,amount,pay_status,pay_token,method,consent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(company, inn, name, phone, email, null, '[]', 'new', now(), ip(req), plan, PLANS[plan].price, 'none', null, null, now()).lastInsertRowid);
    const dir = path.join(UPLOADS, String(rid)); fs.mkdirSync(dir, { recursive: true });
    const meta = bufs.map(f => { const file = crypto.randomBytes(12).toString('hex') + '.' + f.ext; fs.writeFileSync(path.join(dir, file), f.buf); return { name: f.name, file, size: f.buf.length, ext: f.ext }; });
    db.prepare('UPDATE reg_requests SET files=? WHERE id=?').run(JSON.stringify(meta), rid);
    const admins = db.prepare('SELECT email FROM users WHERE platform=1').all().map(x => x.email).join(',');
    mail(admins, `Новая заявка в CRM «${BRAND}»: ${company}`, `Компания: ${company}\nИНН: ${inn}\nКонтакт: ${name}, ${phone}, ${email}\nТариф: ${PLANS[plan].name}, ${PLANS[plan].price.toLocaleString('ru-RU')} руб.\nДокументов: ${meta.length}\n\nОткройте раздел «Заявки»: ${APP_URL}/#requests`);
    return send(res, 200, { sent: true });
  }
  if (a === 'login' && M === 'POST') {
    const key = ip(req) + '|' + String(body.email || '').toLowerCase();
    const wait = limited(key) || limited(ip(req));
    if (wait) fail(429, `Слишком много попыток. Попробуйте через ${wait} мин.`);
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email || '').trim());
    if (!u) { const rq = db.prepare('SELECT * FROM reg_requests WHERE email=? ORDER BY id DESC').get(String(body.email || '').trim().toLowerCase());
      if (rq && rq.status !== 'approved') fail(403, rq.status === 'rejected' ? 'Заявка на подключение отклонена. Свяжитесь с нами, чтобы уточнить детали' : 'Заявка ещё на проверке. Пароль придёт на почту после проверки документов и оплаты'); }
    if (!u || !checkPass(body.password || '', u.pass)) { failTry(key); fail(401, 'Неверный логин или пароль'); }
    if (u.status === 'blocked') fail(403, 'Доступ заблокирован. Обратитесь к директору.');
    if (u.status !== 'active') fail(403, 'Учётная запись ещё не активирована. Задайте пароль по ссылке из письма.');
    tries.delete(key);
    return send(res, 200, { me: me(u) }, { 'Set-Cookie': startSession(res, u) });
  }
  if (a === 'invite') {
    const t = M === 'GET' ? new URL(req.url, 'http://x').searchParams.get('token') : body.token;
    const u = t && db.prepare('SELECT * FROM users WHERE invite_hash=?').get(sha(t));
    if (!u || u.invite_exp < now() || u.status === 'blocked') fail(400, 'Ссылка недействительна или устарела. Попросите директора отправить новую.');
    if (M === 'GET') return send(res, 200, { name: u.name, email: u.email, company: companyName(u.company_id), reset: u.status === 'active' });
    const pp = passProblem(body.password); if (pp) fail(400, pp);
    db.prepare("UPDATE users SET pass=?, status='active', invite_hash=NULL, invite_exp=NULL WHERE id=?").run(hashPass(body.password), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
    const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(u.id);
    return send(res, 200, { me: me(fresh) }, { 'Set-Cookie': startSession(res, fresh) });
  }

  const u = auth(req);
  if (a === 'bye') { if (u) db.prepare('UPDATE users SET logged_out=1, last_seen=? WHERE id=?').run(now(), u.id); return send(res, 200, { ok: 1 }); }
  if (!u) fail(401, 'Требуется вход');
  const P = permsOf(u), CID = u.company_id, COMP = companyName(CID);

  if (a === 'logout') {
    db.prepare('DELETE FROM sessions WHERE hash=?').run(u.sessionHash);
    db.prepare('UPDATE users SET logged_out=1, last_seen=? WHERE id=?').run(now(), u.id);
    return send(res, 200, { ok: 1 }, { 'Set-Cookie': sessionCookie('', 0) });
  }
  if (a === 'me') return send(res, 200, { me: me(u), company: COMP });
  if (a === 'ping') return send(res, 200, { ok: 1 });
  // рабочий день: начать, перерыв, продолжить, завершить
  if (a === 'work' && M === 'POST') {
    const st = ['on', 'pause', 'off'].includes(body.state) ? body.state : 'off', cur = workOf(u);
    const since = st === 'off' ? null : cur.work_state === 'off' || st === 'on' && cur.work_state === 'pause' ? (cur.work_state === 'off' ? now() : u.work_since) : u.work_since;
    db.prepare('UPDATE users SET work_state=?, work_since=? WHERE id=?').run(st, st === 'off' ? null : (since || now()), u.id);
    return send(res, 200, workOf({ work_state: st, work_since: st === 'off' ? null : (since || now()) }));
  }
  if (a === 'password' && M === 'POST') {
    if (!checkPass(body.old || '', u.pass)) fail(400, 'Текущий пароль указан неверно');
    const pp = passProblem(body.password); if (pp) fail(400, pp);
    db.prepare('UPDATE users SET pass=? WHERE id=?').run(hashPass(body.password), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id=? AND hash<>?').run(u.id, u.sessionHash);
    return send(res, 200, { ok: 1 });
  }

  if (a === 'data' && M === 'GET') {
    ensureKbf(CID);
    { const first = db.prepare('SELECT name FROM kbf WHERE company_id=? ORDER BY pos, id').get(CID); if (first) db.prepare('UPDATE kb SET cat=? WHERE company_id=? AND (cat IS NULL OR cat NOT IN (SELECT name FROM kbf WHERE company_id=?))').run(first.name, CID, CID); }
    const out = { me: me(u), company: COMP, now: now() };
    out.stages = db.prepare('SELECT * FROM stages WHERE company_id=? ORDER BY pos').all(CID);
    out.dealform = dealForm(CID);
    if (P.director) { const co = db.prepare('SELECT plan, paid_until FROM companies WHERE id=?').get(CID) || {}; out.tariff = { plan: co.plan || null, paid_until: co.paid_until || null, owner: !!u.platform }; }
    out.people = db.prepare("SELECT id, name, position, role FROM users WHERE status<>'blocked' AND company_id=? ORDER BY (role<>?), name").all(CID, 'director');
    for (const t of Object.keys(E)) out[t] = canSection(P, t) || (t === 'deals' && P.sections.dashboard) ? strip(P, t, visible(u, P, t)) : [];
    if (P.team) out.team = teamList(CID);
    if (u.platform) out.requests = db.prepare('SELECT * FROM reg_requests ORDER BY id DESC LIMIT 500').all().map(reqOut);
    return send(res, 200, out);
  }

  // --- заявки на подключение (только владелец платформы) ---
  if (a === 'requests') {
    if (!u.platform) fail(403, 'Раздел доступен только администратору Орбиты');
    if (M === 'GET' && !b) return send(res, 200, { requests: db.prepare('SELECT * FROM reg_requests ORDER BY id DESC').all().map(reqOut) });
    const r = db.prepare('SELECT * FROM reg_requests WHERE id=?').get(+b); if (!r) fail(404, 'Заявка не найдена');
    if (M === 'GET' && c === 'file') {
      const f = JSON.parse(r.files || '[]')[+parts[3]]; if (!f) fail(404, 'Файл не найден');
      const fp = path.join(UPLOADS, String(r.id), path.basename(f.file)); if (!fs.existsSync(fp)) fail(404, 'Файл не найден');
      res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': DOC_TYPES[f.ext] || 'application/octet-stream', 'Cache-Control': 'no-store',
        'Content-Disposition': `${/^(pdf|jpe?g|png)$/.test(f.ext) ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}` });
      return fs.createReadStream(fp).pipe(res);
    }
    if (M === 'POST' && r.status !== 'new') fail(400, 'Заявка уже рассмотрена');
    if (M === 'POST' && c === 'approve') {
      if (db.prepare('SELECT 1 FROM users WHERE email=?').get(r.email)) fail(400, 'Пользователь с этим email уже есть');
      const pw = genPass();
      const nu = createCompany({ company: r.company, inn: r.inn, name: r.name, email: r.email, pass: hashPass(pw) }, false);
      const months = { m1: 1, m6: 6, y1: 12 }[r.plan]; if (months) { const until = new Date(); until.setMonth(until.getMonth() + months); db.prepare('UPDATE companies SET plan=?, paid_until=? WHERE id=?').run(r.plan, until.getTime(), nu.company_id); }
      db.prepare("UPDATE reg_requests SET status='approved', decided_at=? WHERE id=?").run(now(), r.id);
      const mailed = await mail(r.email, `Компания ${q(r.company)} подключена к CRM «${BRAND}»`,
        `Здравствуйте, ${r.name}!\n\nДокументы проверены, оплата получена — компания ${q(r.company)} подключена к CRM «${BRAND}».\n\nВход: ${APP_URL}\nЛогин: ${r.email}\nПароль: ${pw}\n\nПароль можно сменить в разделе «Настройки».`);
      return send(res, 200, { ok: 1, mailed, password: mailed ? null : pw });
    }
    if (M === 'POST' && c === 'reject') {
      db.prepare("UPDATE reg_requests SET status='rejected', decided_at=? WHERE id=?").run(now(), r.id);
      return send(res, 200, { ok: 1 });
    }
  }

  // --- этапы сделок (только директор) ---
  // --- поля и разделы карточки сделки (настраивает тот, кто может менять этапы) ---
  if (a === 'dealform' && M === 'PUT') {
    if (!P.acl.stages.e) fail(403, 'Настраивать поля сделки может сотрудник с правом «Этапы сделок → Изменять»');
    const f = DF.cleanForm(body);
    db.prepare('INSERT OR REPLACE INTO settings(k,v) VALUES(?,?)').run('dealform:' + CID, JSON.stringify(f));
    return send(res, 200, { ok: 1, dealform: f });
  }
  if (a === 'stages') {
    const sa = M === 'DELETE' ? 'd' : M === 'POST' && b !== 'order' ? 'c' : 'e';
    if (!P.acl.stages[sa]) fail(403, 'У вас нет права ' + { c: 'добавлять', e: 'изменять', d: 'удалять' }[sa] + ' этапы сделок');
    if (M === 'POST' && b === 'order') {
      const st = db.prepare('UPDATE stages SET pos=? WHERE id=? AND company_id=?');
      (body.ids || []).forEach((id, i) => st.run(i, +id, CID));
      return send(res, 200, { ok: 1 });
    }
    const kind = ['open', 'won', 'lost'].includes(body.kind) ? body.kind : 'open';
    const color = /^#[0-9a-f]{6}$/i.test(body.color || '') ? body.color : '#6366f1';
    const name = String(body.name || '').trim().slice(0, 60);
    if (M === 'POST') {
      if (!name) fail(400, 'Укажите название этапа');
      const pos = (db.prepare('SELECT MAX(pos) m FROM stages WHERE company_id=?').get(CID).m ?? -1) + 1;
      const r = db.prepare('INSERT INTO stages(name,color,pos,kind,company_id) VALUES(?,?,?,?,?)').run(name, color, pos, kind, CID);
      return send(res, 200, { id: Number(r.lastInsertRowid) });
    }
    if (b && !db.prepare('SELECT 1 FROM stages WHERE id=? AND company_id=?').get(+b, CID)) fail(404, 'Этап не найден');
    if (M === 'PUT' && b) {
      if (!name) fail(400, 'Укажите название этапа');
      db.prepare('UPDATE stages SET name=?, color=?, kind=? WHERE id=?').run(name, color, kind, +b);
      return send(res, 200, { ok: 1 });
    }
    if (M === 'DELETE' && b) {
      const others = db.prepare('SELECT id FROM stages WHERE id<>? AND company_id=? ORDER BY pos').all(+b, CID);
      if (!others.length) fail(400, 'Нельзя удалить единственный этап');
      const to = body.moveTo && others.some(o => o.id === +body.moveTo) ? +body.moveTo : others[0].id;
      db.prepare('UPDATE deals SET stage_id=? WHERE stage_id=?').run(to, +b);
      db.prepare('DELETE FROM stages WHERE id=?').run(+b);
      return send(res, 200, { ok: 1 });
    }
  }

  // --- сотрудники (только директор) ---
  if (a === 'team') {
    if (!P.team) fail(403, 'Раздел доступен только директору');
    if (M === 'GET') return send(res, 200, { team: teamList(CID) });
    if (M === 'POST' && !b) {
      const email = String(body.email || '').trim().toLowerCase(), name = String(body.name || '').trim().slice(0, 100);
      if (!EMAIL_RE.test(email)) fail(400, 'Укажите корректный email');
      if (!name) fail(400, 'Укажите имя сотрудника');
      if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail(400, 'Пользователь с таким email уже есть в системе');
      const r = db.prepare('INSERT INTO users(email,name,position,role,status,perms,created_at,company_id) VALUES(?,?,?,?,?,?,?,?)')
        .run(email, name, String(body.position || '').slice(0, 100), 'employee', 'invited', cleanPerms(body.perms, P), now(), CID);
      const id = Number(r.lastInsertRowid), link = newInvite(id);
      const mailed = await sendInvite({ name, email }, link, false, COMP);
      return send(res, 200, { id, mailed, link: mailed ? null : link });
    }
    const t = b && db.prepare('SELECT * FROM users WHERE id=? AND company_id=?').get(+b, CID);
    if (!t) fail(404, 'Сотрудник не найден');
    if (t.role === 'director') fail(400, 'Учётную запись директора здесь менять нельзя');
    if (t.id === u.id) fail(400, 'Свои права может изменить только директор');
    if (M === 'POST' && c === 'resend') {
      const link = newInvite(t.id), reset = t.status === 'active';
      const mailed = await sendInvite(t, link, reset, COMP);
      return send(res, 200, { mailed, link: mailed ? null : link });
    }
    if (M === 'PUT') {
      const status = ['active', 'blocked', 'invited'].includes(body.status) ? body.status : t.status;
      const finalStatus = status === 'active' && !t.pass ? 'invited' : status;
      db.prepare('UPDATE users SET name=?, position=?, perms=?, status=? WHERE id=?')
        .run(String(body.name || t.name).slice(0, 100), String(body.position ?? t.position ?? '').slice(0, 100), body.perms ? cleanPerms(body.perms, P) : t.perms, finalStatus, t.id);
      if (finalStatus === 'blocked') db.prepare('DELETE FROM sessions WHERE user_id=?').run(t.id);
      return send(res, 200, { ok: 1 });
    }
    if (M === 'DELETE') {
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(t.id);
      db.prepare('UPDATE deals SET resp_id=NULL WHERE resp_id=?').run(t.id);
      db.prepare('UPDATE tasks SET resp_id=NULL WHERE resp_id=?').run(t.id);
      db.prepare('DELETE FROM users WHERE id=?').run(t.id);
      return send(res, 200, { ok: 1 });
    }
  }

  // --- почта сотрудника (свой ящик через IMAP/SMTP) ---
  if (a === 'mail') {
    if (!P.acl.mail.v) fail(403, 'Директор не открыл вам раздел «Почта»');
    const q = new URL(req.url, 'http://x').searchParams;
    const wrap = async fn => { try { return await fn(); } catch (e) { if (e instanceof HttpErr) throw e; fail(502, e.message || 'Почтовый сервер не ответил'); } };
    if (b === 'presets') return send(res, 200, { preset: MAIL.preset(q.get('email')) });
    if (b === 'account') {
      if (M === 'GET') { const r = db.prepare('SELECT email, login, name, imap_host, imap_port, smtp_host, smtp_port, save_sent FROM mail_accounts WHERE user_id=?').get(u.id); return send(res, 200, { account: r || null }); }
      if (M === 'DELETE') { db.prepare('DELETE FROM mail_accounts WHERE user_id=?').run(u.id); unseenCache.delete(u.id); return send(res, 200, { ok: 1 }); }
      if (M === 'POST') {
        const email = String(body.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) fail(400, 'Укажите адрес почты полностью, например ivan@yandex.ru');
        const old = mailAcc(u.id), pass = String(body.pass || '') || (old && old.email === email ? old.pass : '');
        if (!pass) fail(400, 'Введите пароль');
        const pr = MAIL.preset(email) || {};
        const acc = { email, pass, login: String(body.login || '').trim() || email, name: String(body.name || u.name || '').slice(0, 100),
          imap_host: String(body.imap_host || pr.imap_host || '').trim(), imap_port: +body.imap_port || pr.imap_port || 993,
          smtp_host: String(body.smtp_host || pr.smtp_host || '').trim(), smtp_port: +body.smtp_port || pr.smtp_port || 465, save_sent: body.save_sent === false ? 0 : (/gmail\.com$/.test(email) ? 0 : 1) };
        if (!acc.imap_host || !acc.smtp_host) fail(400, 'Для этой почты укажите серверы IMAP и SMTP — их можно узнать в справке почтового сервиса');
        if (!/^[a-z0-9.-]+$/i.test(acc.imap_host) || !/^[a-z0-9.-]+$/i.test(acc.smtp_host)) fail(400, 'Адрес сервера указан неверно');
        const key = 'mail|' + u.id, wait = limited(key); if (wait) fail(429, `Слишком много попыток. Попробуйте через ${wait} мин.`);
        try { await MAIL.testLogin(acc); } catch (e) { failTry(key); fail(400, e.message); }
        db.prepare('INSERT OR REPLACE INTO mail_accounts(user_id,email,login,pass_enc,name,imap_host,imap_port,smtp_host,smtp_port,save_sent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          .run(u.id, acc.email, acc.login, mailCipher.enc(acc.pass), acc.name, acc.imap_host, acc.imap_port, acc.smtp_host, acc.smtp_port, acc.save_sent, now());
        unseenCache.delete(u.id);
        return send(res, 200, { ok: 1 });
      }
    }
    const acc = mailAcc(u.id); if (!acc) fail(409, 'Почта ещё не подключена');
    const folder = String(q.get('folder') || body.folder || 'INBOX').slice(0, 300), uid = +(q.get('uid') || body.uid || 0);
    if (b === 'unseen') {
      const c0 = unseenCache.get(u.id);
      if (c0 && now() - c0.t < 45000) return send(res, 200, { unseen: c0.n });
      const n = await MAIL.unseenInbox(acc).catch(() => c0 ? c0.n : 0); unseenCache.set(u.id, { n, t: now() });
      return send(res, 200, { unseen: n });
    }
    if (b === 'folders') return wrap(async () => send(res, 200, { folders: await MAIL.folders(acc), email: acc.email }));
    if (b === 'list') return wrap(async () => send(res, 200, await MAIL.list(acc, folder, Math.max(1, +q.get('page') || 1), String(q.get('q') || '').slice(0, 200))));
    if (b === 'contact') {
      const em = String(q.get('email') || '').trim().toLowerCase(); if (!EMAIL_RE.test(em)) fail(400, 'Нет адреса клиента');
      return wrap(async () => send(res, 200, { items: await MAIL.withAddress(acc, em) }));
    }
    if (b === 'msg' && M === 'GET') return wrap(async () => {
      if (!uid) fail(400, 'Письмо не выбрано');
      const m = await MAIL.getMessage(acc, folder, uid, true); unseenCache.delete(u.id);
      return send(res, 200, { ...m, atts: m.atts.map((x, i) => ({ i, name: x.name, type: x.type, size: x.data.length })) });
    });
    if (b === 'att' && M === 'GET') return wrap(async () => {
      const m = await MAIL.getMessage(acc, folder, uid, false), x = m.atts[+q.get('i')]; if (!x) fail(404, 'Вложение не найдено');
      res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(x.name)}` });
      return res.end(x.data);
    });
    if (b === 'msg' && M === 'DELETE') return wrap(async () => { await MAIL.remove(acc, folder, uid); return send(res, 200, { ok: 1 }); });
    if (b === 'seen' && M === 'POST') return wrap(async () => { await MAIL.setSeen(acc, folder, uid, !!body.seen); unseenCache.delete(u.id); return send(res, 200, { ok: 1 }); });
    if (b === 'send' && M === 'POST') {
      if (!P.acl.mail.c) fail(403, 'У вас нет права отправлять письма');
      const addrs = v => String(v || '').split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
      const to = addrs(body.to), cc = addrs(body.cc);
      if (!to.length) fail(400, 'Укажите, кому отправить письмо');
      const bad = [...to, ...cc].find(x => !EMAIL_RE.test(x)); if (bad) fail(400, `Адрес «${bad}» указан неверно`);
      if (to.length + cc.length > 50) fail(400, 'Не больше 50 получателей в одном письме');
      const subject = String(body.subject || '').slice(0, 300), text = String(body.text || '').slice(0, 200000);
      if (!subject.trim() && !text.trim()) fail(400, 'Напишите тему или текст письма');
      let total = 0;
      const attachments = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, 10).map(f => { const data = Buffer.from(String(f.data || ''), 'base64'); total += data.length; return { name: String(f.name || 'файл').slice(0, 150), type: /^[\w.+-]+\/[\w.+-]+$/.test(f.type || '') ? f.type : 'application/octet-stream', data }; });
      if (body.forward && +body.forward.uid) {
        const orig = await wrap(() => MAIL.getMessage(acc, String(body.forward.folder || 'INBOX'), +body.forward.uid, false));
        for (const x of orig.atts.slice(0, 10)) { total += x.data.length; attachments.push({ name: x.name, type: x.type, data: x.data }); }
      }
      if (total > 20 * 1048576) fail(400, 'Вложения больше 20 МБ — почтовые серверы такие письма не принимают');
      const nm = s => /^<[^<>\s]+>$/.test(String(s || '').trim()) ? String(s).trim() : '';
      const refs = String(body.references || '').split(/\s+/).filter(x => /^<[^<>]+>$/.test(x)).slice(-20).join(' ');
      await wrap(() => MAIL.send(acc, { fromName: acc.name || u.name, to: to.map(email => ({ email })), cc: cc.map(email => ({ email })), subject, text, inReplyTo: nm(body.inReplyTo), references: refs, attachments }));
      // письмо клиенту из базы попадает в историю его сделок
      const all = [...to, ...cc], logged = new Set();
      // в историю — только свой текст, без цитаты и пересланного письма
      const own = text.split(/\n[^\n]*пишет:\n>|\n-{5,} Пересланное письмо/)[0].split('\n').filter(l => !/^>/.test(l)).join('\n').trim();
      const cts = db.prepare("SELECT id, email FROM contacts WHERE company_id=? AND email IS NOT NULL AND email<>''").all(CID).filter(x => all.includes(String(x.email).trim().toLowerCase()));
      for (const ct of cts) for (const d of db.prepare('SELECT id FROM deals WHERE contact_id=? AND company_id=?').all(ct.id, CID)) {
        if (logged.has(d.id)) continue; logged.add(d.id);
        logEvent(d.id, 'mail', `«${subject || '(без темы)'}» → ${ct.email}` + (own ? '\n' + own.slice(0, 600) : ''), u.id);
        db.prepare('UPDATE deals SET updated_at=? WHERE id=?').run(now(), d.id);
      }
      return send(res, 200, { ok: 1, deals: logged.size });
    }
    fail(404, 'Не найдено');
  }

  // --- записи CRM ---
  if (E[a]) {
    const t = a;
    if (!canSection(P, t)) fail(403, 'Нет доступа к этому разделу');
    if (t === 'kb' && c === 'file' && M === 'GET') {
      const r = db.prepare('SELECT file FROM kb WHERE id=? AND company_id=?').get(+b, CID); let m = null; try { m = JSON.parse(r?.file || 'null'); } catch {}
      if (!m) fail(404, 'Файл не найден');
      const fp = path.join(KB_DIR, String(CID), path.basename(m.stored)); if (!fs.existsSync(fp)) fail(404, 'Файл не найден');
      res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': KB_TYPES[m.ext] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(m.name)}` });
      return fs.createReadStream(fp).pipe(res);
    }
    if (t === 'deals' && c === 'events') {
      if (!visible(u, P, 'deals').some(r => r.id === +b)) fail(404, 'Сделка не найдена');
      if (M === 'GET') {
        const files = db.prepare('SELECT id, event_id, name, size, ext FROM deal_files WHERE deal_id=? AND company_id=? ORDER BY id').all(+b, CID);
        const byEv = {}; for (const f of files) (byEv[f.event_id] = byEv[f.event_id] || []).push({ id: f.id, name: f.name, size: f.size, ext: f.ext, img: DF_IMG.test(f.ext) });
        return send(res, 200, { events: db.prepare('SELECT id, type, text, user_id, created_at FROM events WHERE deal_id=? ORDER BY id DESC LIMIT 300').all(+b).map(e => ({ ...e, files: byEv[e.id] || [] })) });
      }
      if (M === 'POST') {
        need(P, 'deals', 'e');
        const text = String(body.text || '').trim(), list = dealFilesCheck(body.files);
        if (!text && !list.length) fail(400, 'Напишите комментарий или прикрепите файл');
        const ev = Number(logEvent(+b, 'comment', text, u.id).lastInsertRowid); dealFilesSave(CID, +b, ev, u.id, list);
        db.prepare('UPDATE deals SET updated_at=? WHERE id=?').run(now(), +b);
        return send(res, 200, { ok: 1 });
      }
    }
    if (t === 'deals' && c === 'file' && M === 'GET') {
      if (!visible(u, P, 'deals').some(r => r.id === +b)) fail(404, 'Сделка не найдена');
      const f = db.prepare('SELECT * FROM deal_files WHERE id=? AND deal_id=? AND company_id=?').get(+parts[3], +b, CID); if (!f) fail(404, 'Файл не найден');
      const fp = path.join(DEAL_DIR, String(CID), path.basename(f.stored)); if (!fs.existsSync(fp)) fail(404, 'Файл не найден');
      res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': DF_TYPES[f.ext] || 'application/octet-stream', 'Cache-Control': 'private, max-age=86400', 'Content-Disposition': `${DF_IMG.test(f.ext) ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}` });
      return fs.createReadStream(fp).pipe(res);
    }
    if (M === 'POST' && !b) {
      need(P, t, 'c');
      const v = pick(t, body, P, false);
      if (!v[E[t].req]) fail(400, 'Заполните обязательное поле');
      if (t === 'kb') { const L = db.prepare('SELECT name FROM kbf WHERE company_id=? ORDER BY pos, id').all(CID).map(x => x.name); if (L.length && !L.includes(v.cat)) v.cat = L[0]; if (body.upload) v.file = kbSaveFile(CID, body.upload); }
      if (t === 'kbf') { if (db.prepare('SELECT name FROM kbf WHERE company_id=?').all(CID).some(x => String(x.name).toLowerCase() === v.name.toLowerCase())) fail(400, 'Подраздел с таким названием уже есть'); v.pos = (db.prepare('SELECT MAX(pos) m FROM kbf WHERE company_id=?').get(CID).m ?? -1) + 1; }
      checkRefs(v, CID);
      if (t === 'deals') {
        if ('extra' in body) v.extra = JSON.stringify(DF.cleanExtra(body.extra, dealForm(CID)));
        if (Array.isArray(body.items) && body.items.length) { const r = dealItems(body.items, CID, P, null); v.items = r.items; v.amount = r.amount; }
        if (!v.stage_id) v.stage_id = db.prepare('SELECT id FROM stages WHERE company_id=? ORDER BY pos').get(CID)?.id ?? null;
        if (P.onlyOwn) v.resp_id = u.id;
        const sk = db.prepare('SELECT kind FROM stages WHERE id=?').get(v.stage_id);
        if (sk && sk.kind !== 'open') v.closed_at = now();
      }
      if (t === 'tasks' && P.onlyOwn && !v.resp_id) v.resp_id = u.id;
      const taskFiles = t === 'tasks' && v.deal_id ? dealFilesCheck(body.files) : [];
      const keys = Object.keys(v);
      const r = db.prepare(`INSERT INTO ${t}(${keys.join(',')},created_by,created_at,updated_at,company_id) VALUES(${keys.map(() => '?').join(',')},?,?,?,?)`)
        .run(...keys.map(k => v[k]), u.id, now(), now(), CID);
      const newId = Number(r.lastInsertRowid);
      if (t === 'deals') logEvent(newId, 'created', '', u.id);
      if (t === 'tx' && v.deal_id && v.type === 'Доход') { logEvent(v.deal_id, 'pay', v.note || '', u.id); db.prepare('UPDATE deals SET updated_at=? WHERE id=?').run(now(), v.deal_id); }
      if (t === 'tasks' && v.deal_id) dealFilesSave(CID, v.deal_id, Number(logEvent(v.deal_id, v.kind === 'Задача' ? 'ztask' : 'task', v.title + (v.due ? ' (срок ' + v.due.split('-').reverse().join('.') + (v.due_time ? ' ' + v.due_time : '') + ')' : '') + (v.resp_id && v.resp_id !== u.id ? ', исполнитель: ' + ((db.prepare('SELECT name FROM users WHERE id=?').get(v.resp_id) || {}).name || '') : ''), u.id).lastInsertRowid), u.id, taskFiles);
      return send(res, 200, { id: newId });
    }
    const id = +b;
    if (!id || !visible(u, P, t).some(r => r.id === id)) fail(404, 'Запись не найдена');
    if (M === 'PUT') {
      need(P, t, 'e');
      const v = pick(t, body, P, true);
      if (E[t].req in v && !v[E[t].req]) fail(400, 'Заполните обязательное поле');
      checkRefs(v, CID);
      if (t === 'deals' && P.onlyOwn) delete v.resp_id;
      if (t === 'deals' && 'extra' in body) v.extra = JSON.stringify(DF.cleanExtra(body.extra, dealForm(CID)));
      if (t === 'deals' && Array.isArray(body.items)) { const r = dealItems(body.items, CID, P, db.prepare('SELECT items FROM deals WHERE id=?').get(id)?.items); if (r.items === '[]') v.items = null; else { v.items = r.items; v.amount = r.amount; } }
      if (t === 'deals' && 'stage_id' in v) {
        const st = db.prepare('SELECT kind FROM stages WHERE id=?').get(v.stage_id);
        if (!st) delete v.stage_id;
        else { const old = db.prepare('SELECT stage_id FROM deals WHERE id=?').get(id); if (old.stage_id !== v.stage_id) { v.closed_at = st.kind === 'open' ? null : now(); logEvent(id, 'stage', stageName(old.stage_id) + ' → ' + stageName(v.stage_id), u.id); } }
      }
      if (t === 'kb' && (body.upload || body.removeFile)) {
        const old = db.prepare('SELECT file FROM kb WHERE id=?').get(id).file;
        v.file = body.upload ? kbSaveFile(CID, body.upload) : null; kbDropFile(CID, old);
      }
      if (t === 'kb' && 'cat' in v) { const L = db.prepare('SELECT name FROM kbf WHERE company_id=?').all(CID).map(x => x.name); if (L.length && !L.includes(v.cat)) fail(400, 'Выберите подраздел'); }
      if (t === 'kbf' && v.name) {
        const old = db.prepare('SELECT name FROM kbf WHERE id=?').get(id).name;
        if (db.prepare('SELECT name FROM kbf WHERE company_id=? AND id<>?').all(CID, id).some(x => String(x.name).toLowerCase() === v.name.toLowerCase())) fail(400, 'Подраздел с таким названием уже есть');
        if (old !== v.name) db.prepare('UPDATE kb SET cat=? WHERE cat=? AND company_id=?').run(v.name, old, CID);
      }
      const keys = Object.keys(v);
      if (keys.length) db.prepare(`UPDATE ${t} SET ${keys.map(k => k + '=?').join(',')}, updated_at=? WHERE id=? AND company_id=?`).run(...keys.map(k => v[k]), now(), id, CID);
      return send(res, 200, { ok: 1 });
    }
    if (M === 'DELETE') {
      need(P, t, 'd');
      if (t === 'kbf') {
        const others = db.prepare('SELECT name FROM kbf WHERE company_id=? AND id<>? ORDER BY pos, id').all(CID, id).map(x => x.name);
        if (!others.length) fail(400, 'Нельзя удалить единственный подраздел');
        const to = others.includes(body.moveTo) ? body.moveTo : others[0];
        db.prepare('UPDATE kb SET cat=? WHERE cat=(SELECT name FROM kbf WHERE id=?) AND company_id=?').run(to, id, CID);
      }
      if (t === 'kb') kbDropFile(CID, db.prepare('SELECT file FROM kb WHERE id=?').get(id)?.file);
      db.prepare(`DELETE FROM ${t} WHERE id=? AND company_id=?`).run(id, CID);
      if (t === 'deals') db.prepare('DELETE FROM events WHERE deal_id=?').run(id);
      if (t === 'deals') { for (const f of db.prepare('SELECT stored FROM deal_files WHERE deal_id=? AND company_id=?').all(id, CID)) { try { fs.unlinkSync(path.join(DEAL_DIR, String(CID), path.basename(f.stored))); } catch {} } db.prepare('DELETE FROM deal_files WHERE deal_id=? AND company_id=?').run(id, CID); }
      return send(res, 200, { ok: 1 });
    }
  }
  fail(404, 'Не найдено');
}
function teamList(cid) {
  return db.prepare('SELECT * FROM users WHERE company_id=? ORDER BY (role<>?), created_at').all(cid, 'director').map(x => ({
    id: x.id, email: x.email, name: x.name, position: x.position, role: x.role, status: x.status,
    perms: permsOf(x), last_login: x.last_login, invite_exp: x.invite_exp, ...presence(x), ...workOf(x),
  }));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const PUB = path.join(__dirname, 'public');
function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.normalize(path.join(PUB, p));
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUB, 'index.html');
  const ext = path.extname(f);
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300', ...SEC_HEADERS });
  fs.createReadStream(f).pipe(res);
}

http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, 'http://x').pathname;
    if (p.startsWith('/api/')) await api(req, res, p.slice(5).split('/').filter(Boolean));
    else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res);
    else send(res, 405, { error: 'Метод не поддерживается' });
  } catch (e) {
    if (e instanceof HttpErr) send(res, e.code, { error: e.message });
    else { console.error(e); send(res, 500, { error: 'Внутренняя ошибка сервера' }); }
  }
}).listen(PORT, () => console.log(`CRM запущена: ${APP_URL} (порт ${PORT})${mailer ? '' : ' — почта не настроена, ссылки-приглашения будут показаны директору'}`));

// очистка устаревших сессий раз в час
setInterval(() => db.prepare('DELETE FROM sessions WHERE exp<?').run(now()), 3600e3).unref();
