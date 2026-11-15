'use strict';
// Почта для Орбиты: IMAP (чтение) и SMTP (отправка) без сторонних пакетов.
const tls = require('tls'), net = require('net'), crypto = require('crypto');

const INSECURE = process.env.MAIL_TLS_INSECURE === '1'; // только для тестов
const TIMEOUT = 25000;

// ---------- настройки популярных почтовых сервисов ----------
const PRESETS = [
  [/^(yandex\.(ru|com|by|kz|ua)|ya\.ru|narod\.ru)$/, { imap_host: 'imap.yandex.ru', imap_port: 993, smtp_host: 'smtp.yandex.ru', smtp_port: 465 }],
  [/^(mail\.ru|inbox\.ru|list\.ru|bk\.ru|internet\.ru|mail\.ua)$/, { imap_host: 'imap.mail.ru', imap_port: 993, smtp_host: 'smtp.mail.ru', smtp_port: 465 }],
  [/^(rambler\.ru|lenta\.ru|autorambler\.ru|myrambler\.ru|ro\.ru)$/, { imap_host: 'imap.rambler.ru', imap_port: 993, smtp_host: 'smtp.rambler.ru', smtp_port: 465 }],
  [/^(gmail\.com|googlemail\.com)$/, { imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 465 }],
  [/^(outlook\.com|hotmail\.com|live\.com)$/, { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587 }],
];
function preset(email) {
  const d = String(email || '').split('@')[1] || '';
  const p = PRESETS.find(([re]) => re.test(d.toLowerCase()));
  return p ? { ...p[1] } : null;
}

// ---------- шифрование паролей ящиков ----------
function cipher(key) {
  const k = crypto.createHash('sha256').update(key).digest();
  return {
    enc(s) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k, iv); const d = Buffer.concat([c.update(String(s), 'utf8'), c.final()]); return [iv, c.getAuthTag(), d].map(b => b.toString('base64')).join('.'); },
    dec(s) { const [iv, tag, d] = String(s).split('.').map(b => Buffer.from(b, 'base64')); const c = crypto.createDecipheriv('aes-256-gcm', k, iv); c.setAuthTag(tag); return Buffer.concat([c.update(d), c.final()]).toString('utf8'); },
  };
}

// ---------- кодировки ----------
function decodeCharset(buf, cs) {
  cs = String(cs || 'utf-8').toLowerCase().replace(/^"|"$/g, '');
  if (cs === 'us-ascii' || cs === 'ascii') cs = 'utf-8';
  try { return new TextDecoder(cs).decode(buf); } catch { return new TextDecoder('utf-8').decode(buf); }
}
function qpDecode(s) {
  s = s.replace(/=\r?\n/g, '');
  const out = []; for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else { const c = s.charCodeAt(i); if (c < 256) out.push(c); else out.push(...Buffer.from(s[i], 'utf8')); }
  }
  return Buffer.from(out);
}
// =?charset?B?...?= и =?charset?Q?...?=
function decodeWords(s) {
  if (!s) return '';
  return String(s).replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (m, cs, enc, txt) => {
    try {
      const buf = enc.toUpperCase() === 'B' ? Buffer.from(txt, 'base64') : qpDecode(txt.replace(/_/g, ' '));
      return decodeCharset(buf, cs.split('*')[0]);
    } catch { return m; }
  });
}
const encWord = s => /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
// modified UTF-7 для названий папок (RFC 3501)
function utf7Decode(s) {
  return String(s).replace(/&([^-]*)-/g, (m, b) => {
    if (!b) return '&';
    const buf = Buffer.from(b.replace(/,/g, '/'), 'base64'); let r = '';
    for (let i = 0; i + 1 < buf.length; i += 2) r += String.fromCharCode((buf[i] << 8) | buf[i + 1]);
    return r;
  });
}

// ---------- разбор писем (MIME) ----------
function splitHeaderBody(buf) {
  let i = buf.indexOf('\r\n\r\n'), sep = 4;
  const j = buf.indexOf('\n\n'); if (i < 0 || (j >= 0 && j < i)) { i = j; sep = 2; }
  if (i < 0) return [buf.toString('latin1'), Buffer.alloc(0)];
  return [buf.slice(0, i).toString('latin1'), buf.slice(i + sep)];
}
function parseHeaders(raw) {
  const h = {};
  raw.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(l => {
    const k = l.indexOf(':'); if (k < 1) return;
    const name = l.slice(0, k).trim().toLowerCase(), val = l.slice(k + 1).trim();
    (h[name] = h[name] || []).push(val);
  });
  return h;
}
// заголовки приходят байтами; часть писем шлёт их в UTF-8 без кодирования
const hdrText = v => decodeWords(Buffer.from(v || '', 'latin1').toString('utf8').includes('�') ? v : Buffer.from(v || '', 'latin1').toString('utf8'));
function parseParams(v) {
  const parts = []; let cur = '', q = false;
  for (const ch of String(v || '')) { if (ch === '"') q = !q; if (ch === ';' && !q) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur);
  const value = parts.shift().trim().toLowerCase(), params = {}, ext = {};
  for (const p of parts) {
    const k = p.indexOf('='); if (k < 0) continue;
    let key = p.slice(0, k).trim().toLowerCase(), val = p.slice(k + 1).trim().replace(/^"|"$/g, '');
    const m = key.match(/^(.+?)\*(\d+)?(\*)?$/);
    if (m) { // RFC 2231: filename*=utf-8''..., filename*0*=...
      (ext[m[1]] = ext[m[1]] || []).push({ n: +(m[2] || 0), enc: !!m[3] || !m[2], val });
      continue;
    }
    params[key] = val;
  }
  for (const [k, arr] of Object.entries(ext)) {
    arr.sort((a, b) => a.n - b.n);
    let cs = 'utf-8', s = '';
    arr.forEach((x, i) => {
      let v = x.val;
      if (i === 0 && x.enc && /^[^']*'[^']*'/.test(v)) { cs = v.split("'")[0] || 'utf-8'; v = v.split("'").slice(2).join("'"); }
      s += x.enc ? v.replace(/%([0-9A-Fa-f]{2})/g, '%$1') : v;
    });
    try { params[k] = decodeCharset(Buffer.from(s.replace(/%([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1'), cs); } catch { params[k] = s; }
  }
  params._ext = Object.keys(ext);
  return { value, params };
}
function decodeBody(buf, enc) {
  enc = String(enc || '').toLowerCase();
  if (enc === 'base64') return Buffer.from(buf.toString('latin1').replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
  if (enc === 'quoted-printable') return qpDecode(buf.toString('latin1'));
  return buf;
}
function parsePart(buf, out, path) {
  const [rawH, body] = splitHeaderBody(buf);
  const h = parseHeaders(rawH);
  const ct = parseParams((h['content-type'] || ['text/plain'])[0]);
  const cd = parseParams((h['content-disposition'] || [''])[0]);
  if (ct.value.startsWith('multipart/') && ct.params.boundary) {
    const b = Buffer.from('--' + ct.params.boundary), pieces = [];
    let pos = body.indexOf(b);
    while (pos >= 0) {
      let start = pos + b.length;
      if (body.slice(start, start + 2).toString() === '--') break;
      if (body[start] === 13) start++; if (body[start] === 10) start++;
      const next = body.indexOf(b, start); if (next < 0) break;
      let end = next; if (body[end - 1] === 10) end--; if (body[end - 1] === 13) end--;
      pieces.push(body.slice(start, end)); pos = next;
    }
    pieces.forEach((p, i) => parsePart(p, out, path.concat(i)));
    return h;
  }
  if (ct.value === 'message/rfc822') { out.atts.push({ name: 'вложенное письмо.eml', type: ct.value, data: decodeBody(body, (h['content-transfer-encoding'] || [''])[0]) }); return h; }
  const data = decodeBody(body, (h['content-transfer-encoding'] || [''])[0]);
  const name = cd.params.filename ? (cd.params._ext.includes('filename') ? cd.params.filename : hdrText(cd.params.filename)) : ct.params.name ? (ct.params._ext.includes('name') ? ct.params.name : hdrText(ct.params.name)) : '';
  const cid = ((h['content-id'] || [''])[0] || '').replace(/[<>]/g, '');
  const isAtt = cd.value === 'attachment' || (!!name && !ct.value.startsWith('text/'));
  if (!isAtt && ct.value === 'text/html' && out.html == null) out.html = decodeCharset(data, ct.params.charset);
  else if (!isAtt && ct.value === 'text/plain' && out.text == null) out.text = decodeCharset(data, ct.params.charset);
  else if (cid && ct.value.startsWith('image/') && cd.value !== 'attachment') out.cids[cid] = { type: ct.value, data };
  else out.atts.push({ name: name || 'файл', type: ct.value, data });
  return h;
}
function addrList(v) {
  const s = hdrText(v || ''), res = []; let cur = '', q = false, a = 0;
  for (const ch of s) { if (ch === '"') q = !q; if (ch === '<') a++; if (ch === '>') a--; if (ch === ',' && !q && a <= 0) { res.push(cur); cur = ''; } else cur += ch; }
  res.push(cur);
  return res.map(x => x.trim()).filter(Boolean).map(x => {
    const m = x.match(/^(.*?)<([^>]+)>$/);
    return m ? { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim().toLowerCase() } : { name: '', email: x.replace(/^"|"$/g, '').toLowerCase() };
  });
}
function parseMessage(raw) {
  const out = { html: null, text: null, atts: [], cids: {} };
  const h = parsePart(raw, out, []);
  const one = k => (h[k] || [''])[0];
  let html = out.html;
  if (html) {
    html = html.replace(/cid:([^"' )>]+)/g, (m, id) => { const c = out.cids[id]; return c && c.data.length < 2e6 ? `data:${c.type};base64,${c.data.toString('base64')}` : m; });
  }
  return {
    from: addrList(one('from'))[0] || { name: '', email: '' }, to: addrList(one('to')), cc: addrList(one('cc')),
    subject: hdrText(one('subject')), date: one('date') ? new Date(one('date')).getTime() || null : null,
    messageId: one('message-id'), references: one('references'), inReplyTo: one('in-reply-to'),
    html, text: out.text, atts: out.atts,
  };
}

// ---------- IMAP ----------
// разбор строки ответа IMAP в дерево токенов (атомы, строки, литералы, списки)
function tokenize(segs) {
  // segs: массив [строка, Buffer?, строка, Buffer?, ...] — литералы уже вырезаны
  const root = [], stack = [root];
  let cur = root;
  segs.forEach((seg, si) => {
    if (Buffer.isBuffer(seg)) { cur.push(seg); return; }
    const s = seg; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ' || c === '\r' || c === '\n') { i++; continue; }
      if (c === '(') { const n = []; cur.push(n); stack.push(n); cur = n; i++; continue; }
      if (c === ')') { stack.pop(); cur = stack[stack.length - 1]; i++; continue; }
      if (c === '"') { let j = i + 1, v = ''; while (j < s.length && s[j] !== '"') { if (s[j] === '\\') j++; v += s[j]; j++; } cur.push({ q: Buffer.from(v, 'latin1').toString('utf8') }); i = j + 1; continue; }
      if (c === '{' && /^\{\d+\+?\}$/.test(s.slice(i).trim())) break; // маркер литерала в конце сегмента
      let j = i, depth = 0;
      while (j < s.length) { const ch = s[j]; if (ch === '[') depth++; if (ch === ']') depth--; if (depth <= 0 && (ch === ' ' || ch === '(' || ch === ')' || ch === '\r' || ch === '\n')) { if (ch === '(' && depth > 0) { j++; continue; } break; } j++; }
      // атом с секцией вида BODY[HEADER.FIELDS (FROM TO)] — дочитываем до закрывающей ]
      let atom = s.slice(i, j);
      if (atom.includes('[') && !atom.includes(']')) { const k = s.indexOf(']', j); atom = s.slice(i, k + 1); j = k + 1; const m = s.slice(j).match(/^<\d+>/); if (m) { atom += m[0]; j += m[0].length; } }
      cur.push(atom === 'NIL' ? null : atom); i = j;
    }
  });
  return root;
}
const tokStr = t => t == null ? '' : Buffer.isBuffer(t) ? t.toString('utf8') : typeof t === 'object' && 'q' in t ? t.q : String(t);
const quote = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

class Imap {
  constructor(acc) { this.acc = acc; this.tag = 0; this.buf = Buffer.alloc(0); this.waiters = []; this.untagged = []; this.cont = null; }
  connect() {
    return new Promise((ok, no) => {
      const { imap_host: host, imap_port: port } = this.acc;
      const t = setTimeout(() => no(new Error('Почтовый сервер не отвечает')), TIMEOUT);
      const sock = tls.connect({ host, port: +port || 993, servername: host, rejectUnauthorized: !INSECURE });
      this.sock = sock;
      sock.on('data', d => this.onData(d));
      sock.on('error', e => { clearTimeout(t); no(new Error('Не удалось подключиться к почтовому серверу ' + host + ': ' + e.message)); this.fail(e); });
      sock.on('close', () => this.fail(new Error('Соединение с почтовым сервером закрыто')));
      this.greet = (line) => { clearTimeout(t); ok(line); };
    });
  }
  fail(e) { const w = this.waiters; this.waiters = []; w.forEach(x => x.no(e)); }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      // собираем логическую строку с литералами {n}
      let pos = 0; const segs = [];
      for (;;) {
        const nl = this.buf.indexOf('\r\n', pos); if (nl < 0) return;
        const line = this.buf.slice(pos, nl).toString('latin1');
        const m = line.match(/\{(\d+)\}$/);
        if (m) { const n = +m[1], start = nl + 2; if (this.buf.length < start + n) return; segs.push(line, this.buf.slice(start, start + n)); pos = start + n; continue; }
        segs.push(line); pos = nl + 2; break;
      }
      this.buf = this.buf.slice(pos);
      this.onLine(segs);
    }
  }
  onLine(segs) {
    const first = segs[0];
    if (this.greet) { const g = this.greet; this.greet = null; g(first); return; }
    if (first.startsWith('+')) { if (this.cont) { const c = this.cont; this.cont = null; c(); } return; }
    if (first.startsWith('* ')) { this.untagged.push(tokenize(segs.map((s, i) => i === 0 ? s.slice(2) : s))); return; }
    const m = first.match(/^(A\d+) (OK|NO|BAD)\s?(.*)$/i);
    if (m) { const w = this.waiters.find(x => x.tag === m[1]); if (!w) return; this.waiters = this.waiters.filter(x => x !== w); const un = this.untagged; this.untagged = [];
      if (m[2].toUpperCase() === 'OK') w.ok({ untagged: un, text: m[3] }); else w.no(Object.assign(new Error(m[3] || 'Ошибка почтового сервера'), { imap: m[2] })); }
  }
  async cmd(...parts) {
    const tag = 'A' + (++this.tag);
    const p = new Promise((ok, no) => this.waiters.push({ tag, ok, no }));
    let line = tag + ' ';
    for (const part of parts) {
      if (part && part.literal != null) {
        const b = Buffer.from(String(part.literal), 'utf8');
        this.sock.write(line + '{' + b.length + '}\r\n');
        await new Promise((ok, no) => { this.cont = ok; setTimeout(() => no(new Error('Почтовый сервер не принял команду')), TIMEOUT); });
        this.sock.write(b); line = '';
      } else line += part;
    }
    this.sock.write(line + '\r\n');
    const t = setTimeout(() => this.fail(new Error('Почтовый сервер не отвечает')), TIMEOUT * 2);
    try { return await p; } finally { clearTimeout(t); }
  }
  async login() {
    await this.connect();
    try { await this.cmd('LOGIN ', quote(this.acc.login), ' ', quote(this.acc.pass)); }
    catch (e) { throw new Error('Почта не приняла логин или пароль. Проверьте адрес и пароль приложения, и что в настройках почты включён доступ по IMAP'); }
  }
  async logout() { try { await this.cmd('LOGOUT'); } catch {} try { this.sock.end(); } catch {} }
  async folders() {
    const r = await this.cmd('LIST "" "*"');
    const list = r.untagged.filter(t => t[0] === 'LIST').map(t => {
      const flags = (t[1] || []).map(String), path = tokStr(t[3]), delim = tokStr(t[2]) || '/';
      const name = utf7Decode(path).split(delim).pop();
      const f = flags.map(x => x.toLowerCase());
      const special = path.toUpperCase() === 'INBOX' ? 'inbox' : f.includes('\\sent') ? 'sent' : f.includes('\\trash') ? 'trash' : f.includes('\\drafts') ? 'drafts' : f.includes('\\junk') || f.includes('\\spam') ? 'junk' : f.includes('\\archive') ? 'archive'
        : /^(sent|sent items|sent messages|отправленные)$/i.test(utf7Decode(name)) ? 'sent' : /^(trash|deleted|deleted items|удаленные|удалённые|корзина)$/i.test(utf7Decode(name)) ? 'trash' : /^(drafts|черновики)$/i.test(utf7Decode(name)) ? 'drafts' : /^(spam|junk|спам)$/i.test(utf7Decode(name)) ? 'junk' : '';
      return { path, name: special === 'inbox' ? 'Входящие' : name, special, noselect: f.includes('\\noselect') };
    }).filter(x => !x.noselect);
    const order = { inbox: 0, drafts: 1, sent: 2, junk: 3, trash: 4, archive: 5, '': 6 };
    return list.sort((a, b) => order[a.special] - order[b.special] || a.name.localeCompare(b.name, 'ru'));
  }
  async select(path, ro = true) {
    const r = await this.cmd(ro ? 'EXAMINE ' : 'SELECT ', quote(path));
    const ex = r.untagged.find(t => t[1] === 'EXISTS'); return ex ? +ex[0] : 0;
  }
  async unseen(path) {
    const r = await this.cmd('STATUS ', quote(path), ' (UNSEEN)');
    const st = r.untagged.find(t => t[0] === 'STATUS'); if (!st) return 0;
    const arr = st[2] || []; const i = arr.findIndex(x => String(x).toUpperCase() === 'UNSEEN'); return i >= 0 ? +arr[i + 1] : 0;
  }
  async search(criteria) {
    const r = await this.cmd(...criteria);
    const s = r.untagged.find(t => t[0] === 'SEARCH'); return s ? s.slice(1).map(Number).filter(Boolean) : [];
  }
  async fetch(uids, items) {
    if (!uids.length) return [];
    const r = await this.cmd('UID FETCH ' + uids.join(',') + ' ' + items);
    return r.untagged.filter(t => t[1] === 'FETCH').map(t => {
      const o = {}, a = t[2] || [];
      for (let i = 0; i < a.length; i += 2) o[String(a[i]).toUpperCase().replace(/\.PEEK/, '')] = a[i + 1];
      return o;
    });
  }
}
async function withImap(acc, fn) {
  const c = new Imap(acc);
  try { await c.login(); return await fn(c); } finally { c.logout(); }
}

const hdrSummary = buf => {
  const h = parseHeaders(Buffer.isBuffer(buf) ? buf.toString('latin1') : String(buf || ''));
  const one = k => (h[k] || [''])[0];
  return { from: addrList(one('from'))[0] || { name: '', email: '' }, to: addrList(one('to')), subject: hdrText(one('subject')), date: one('date') ? new Date(one('date')).getTime() || null : null, ct: one('content-type') };
};
const LIST_ITEMS = '(UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE CONTENT-TYPE)])';
function summarize(f) {
  const hs = hdrSummary(f['BODY[HEADER.FIELDS (FROM TO SUBJECT DATE CONTENT-TYPE)]'] || Object.entries(f).find(([k]) => k.startsWith('BODY['))?.[1]);
  const flags = (f.FLAGS || []).map(x => String(x).toLowerCase());
  return { uid: +f.UID, from: hs.from, to: hs.to, subject: hs.subject || '(без темы)', date: hs.date || (f.INTERNALDATE ? new Date(tokStr(f.INTERNALDATE)).getTime() : null), seen: flags.includes('\\seen'), flagged: flags.includes('\\flagged'), size: +f['RFC822.SIZE'] || 0, att: /multipart\/(mixed|related)/i.test(hs.ct) };
}
async function list(acc, folder, page = 1, q = '') {
  return withImap(acc, async c => {
    const total = await c.select(folder);
    let uids = q ? await c.search(['UID SEARCH CHARSET UTF-8 TEXT ', { literal: q }]).catch(() => c.search(['UID SEARCH TEXT ', quote(q)])) : await c.search(['UID SEARCH ALL']);
    uids.sort((a, b) => b - a);
    const per = 40, slice = uids.slice((page - 1) * per, page * per);
    const items = (await c.fetch(slice, LIST_ITEMS)).map(summarize).sort((a, b) => b.uid - a.uid);
    return { total: uids.length, exists: total, page, pages: Math.max(1, Math.ceil(uids.length / per)), items };
  });
}
async function getMessage(acc, folder, uid, markSeen = true) {
  return withImap(acc, async c => {
    await c.select(folder, !markSeen);
    const [f] = await c.fetch([+uid], '(UID FLAGS BODY.PEEK[])');
    if (!f) throw new Error('Письмо не найдено');
    const raw = f['BODY[]']; if (!Buffer.isBuffer(raw)) throw new Error('Не удалось прочитать письмо');
    if (markSeen) { try { await c.cmd('UID STORE ' + (+uid) + ' +FLAGS (\\Seen)'); } catch {} }
    return parseMessage(raw);
  });
}
async function remove(acc, folder, uid) {
  return withImap(acc, async c => {
    const fl = await c.folders(); const trash = fl.find(x => x.special === 'trash');
    await c.select(folder, false);
    if (trash && trash.path !== folder) {
      try { await c.cmd('UID MOVE ' + (+uid) + ' ', quote(trash.path)); return; } catch {}
      await c.cmd('UID COPY ' + (+uid) + ' ', quote(trash.path));
    }
    await c.cmd('UID STORE ' + (+uid) + ' +FLAGS (\\Deleted)');
    try { await c.cmd('UID EXPUNGE ' + (+uid)); } catch { await c.cmd('EXPUNGE'); }
  });
}
async function setSeen(acc, folder, uid, seen) {
  return withImap(acc, async c => { await c.select(folder, false); await c.cmd('UID STORE ' + (+uid) + (seen ? ' +' : ' -') + 'FLAGS (\\Seen)'); });
}
async function unseenInbox(acc) { return withImap(acc, c => c.unseen('INBOX')); }
// письма с конкретным адресом во входящих и отправленных (для карточки сделки)
async function withAddress(acc, email) {
  return withImap(acc, async c => {
    const fl = await c.folders(), out = [];
    for (const f of fl.filter(x => x.special === 'inbox' || x.special === 'sent')) {
      await c.select(f.path);
      const uids = (await c.search(['UID SEARCH OR FROM ', quote(email), ' TO ', quote(email)])).sort((a, b) => b - a).slice(0, 15);
      (await c.fetch(uids, LIST_ITEMS)).forEach(x => out.push({ ...summarize(x), folder: f.path, dir: f.special === 'sent' ? 'out' : 'in' }));
    }
    return out.sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 20);
  });
}
async function appendSent(acc, raw) {
  return withImap(acc, async c => {
    const sent = (await c.folders()).find(x => x.special === 'sent'); if (!sent) return;
    await c.cmd('APPEND ', quote(sent.path), ' (\\Seen) ', { literal: raw });
  });
}
async function testLogin(acc) { return withImap(acc, async c => { await c.select('INBOX'); return true; }); }

// ---------- SMTP ----------
function smtpSession(acc) {
  const host = acc.smtp_host, port = +acc.smtp_port || 465;
  // 587, 25 и 2525 — обычное соединение с STARTTLS, остальные порты (465) — сразу TLS
  const implicit = ![587, 25, 2525].includes(port);
  return new Promise((ok, no) => {
    let sock, buf = '', waiter = null; const queue = [];
    const t = setTimeout(() => no(new Error('Сервер отправки почты не отвечает')), TIMEOUT);
    // ответ SMTP может быть многострочным: 250-... 250 ...
    const onData = d => {
      buf += d.toString('utf8');
      let m;
      while ((m = buf.match(/^((?:\d{3}-[^\r\n]*\r\n)*\d{3}(?: [^\r\n]*)?\r\n)/))) { buf = buf.slice(m[1].length); queue.push(m[1]); }
      if (waiter && queue.length) { const w = waiter; waiter = null; w(queue.shift()); }
    };
    const read = () => new Promise((r, j) => { if (queue.length) return r(queue.shift()); const to = setTimeout(() => j(new Error('Сервер отправки почты не отвечает')), TIMEOUT); waiter = x => { clearTimeout(to); r(x); }; });
    const write = s => sock.write(s);
    const cmd = async (s, okc) => { write(s + '\r\n'); const r = await read(); const code = +r.split('\r\n').filter(Boolean).pop().slice(0, 3); if (okc && !okc.includes(Math.floor(code / 100) * 100) && !okc.includes(code)) throw Object.assign(new Error(r.trim()), { code }); return r; };
    const attach = s => { sock = s; sock.on('data', onData); sock.on('error', e => no(new Error('Ошибка соединения с ' + host + ': ' + e.message))); };
    const start = async () => {
      await read(); clearTimeout(t);
      let ehlo = await cmd('EHLO orbita.local', [200]);
      if (!implicit && /STARTTLS/i.test(ehlo)) {
        await cmd('STARTTLS', [200]);
        sock.removeListener('data', onData);
        const s2 = tls.connect({ socket: sock, servername: host, rejectUnauthorized: !INSECURE });
        await new Promise((r, j) => { s2.once('secureConnect', r); s2.once('error', j); });
        attach(s2); ehlo = await cmd('EHLO orbita.local', [200]);
      }
      ok({ cmd, write, read, end: () => { try { sock.end(); } catch {} } });
    };
    if (implicit) { const s = tls.connect({ host, port, servername: host, rejectUnauthorized: !INSECURE }); attach(s); s.once('secureConnect', () => start().catch(no)); }
    else { const s = net.connect({ host, port }); attach(s); s.once('connect', () => start().catch(no)); }
  });
}
function wrap76(b64) { return b64.replace(/.{1,76}/g, '$&\r\n'); }
function buildMime({ from, fromName, to, cc = [], subject, text, html: htmlIn, inReplyTo, references, attachments }) {
  const domain = (from.split('@')[1] || 'orbita.local');
  const id = `<${crypto.randomBytes(12).toString('hex')}@${domain}>`;
  const addr = list => list.map(a => a.name ? `${encWord(a.name)} <${a.email}>` : a.email).join(', ');
  const mix = 'mix_' + crypto.randomBytes(8).toString('hex'), alt = 'alt_' + crypto.randomBytes(8).toString('hex');
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const html = htmlIn || `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${esc(text || '').replace(/\r?\n/g, '<br>')}</div>`;
  const h = [
    `From: ${fromName ? encWord(fromName) + ' ' : ''}<${from}>`, `To: ${addr(to)}`, cc.length ? `Cc: ${addr(cc)}` : '',
    `Subject: ${encWord(subject || '')}`, `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`, `Message-ID: ${id}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : '', references || inReplyTo ? `References: ${[references, inReplyTo].filter(Boolean).join(' ')}` : '',
    'MIME-Version: 1.0', 'X-Mailer: Orbita CRM', `Content-Type: multipart/mixed; boundary="${mix}"`,
  ].filter(Boolean).join('\r\n');
  let body = `--${mix}\r\nContent-Type: multipart/alternative; boundary="${alt}"\r\n\r\n` +
    `--${alt}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(Buffer.from(text || '', 'utf8').toString('base64'))}` +
    `--${alt}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(Buffer.from(html, 'utf8').toString('base64'))}--${alt}--\r\n`;
  for (const a of attachments || []) {
    const n = encWord(a.name);
    body += `--${mix}\r\nContent-Type: ${a.type || 'application/octet-stream'}; name="${n}"\r\nContent-Disposition: attachment; filename="${n}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(a.data.toString('base64'))}`;
  }
  body += `--${mix}--\r\n`;
  return { raw: h + '\r\n\r\n' + body, messageId: id };
}
async function send(acc, msg) {
  const { raw, messageId } = buildMime({ ...msg, from: acc.email });
  const s = await smtpSession(acc);
  try {
    try { await s.cmd('AUTH PLAIN ' + Buffer.from('\0' + acc.login + '\0' + acc.pass, 'utf8').toString('base64'), [235]); }
    catch { throw new Error('Сервер отправки не принял логин или пароль. Проверьте пароль приложения'); }
    await s.cmd(`MAIL FROM:<${acc.email}>`, [250]);
    for (const r of [...msg.to, ...(msg.cc || [])]) await s.cmd(`RCPT TO:<${r.email}>`, [250, 251]).catch(e => { throw new Error('Адрес не принят сервером: ' + r.email); });
    await s.cmd('DATA', [354]);
    s.write(raw.replace(/\r\n\./g, '\r\n..') + '\r\n.\r\n');
    const r = await s.read(); if (!/^250/.test(r.split('\r\n').filter(Boolean).pop())) throw new Error('Сервер не принял письмо: ' + r.trim());
    try { await s.cmd('QUIT'); } catch {}
  } finally { s.end(); }
  if (acc.save_sent) { try { await appendSent(acc, raw); } catch (e) { console.error('Не удалось сохранить копию в «Отправленные»:', e.message); } }
  return { messageId };
}

async function folders(acc) { return withImap(acc, async c => { const f = await c.folders(); const inbox = f.find(x => x.special === 'inbox'); if (inbox) inbox.unseen = await c.unseen(inbox.path).catch(() => 0); return f; }); }
module.exports = { preset, cipher, folders, list, getMessage, remove, setSeen, unseenInbox, withAddress, send, testLogin, parseMessage, buildMime, utf7Decode, decodeWords };
