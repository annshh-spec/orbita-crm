// База знаний: чтение документов (DOCX, PDF, TXT), выгрузка статьи в Word (DOCX) и безопасная очистка HTML.
// Работает в браузере без сторонних библиотек.
(function (root) {
  'use strict';
  const td = new TextDecoder('utf-8');

  // ---------- очистка HTML: оставляем только оформление текста ----------
  const TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'SPAN', 'DIV', 'BLOCKQUOTE', 'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'HR', 'FONT', 'SUB', 'SUP']);
  const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'META', 'LINK', 'TITLE', 'HEAD', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS']);
  const STYLES = ['color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align', 'text-transform'];
  const SAFE_VAL = /^[#(),.%\w\s'"-]+$/;
  const FONT_SIZE = { 1: '10px', 2: '13px', 3: '16px', 4: '18px', 5: '24px', 6: '32px', 7: '40px' };
  function clean(html) {
    const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    const walk = el => {
      for (const n of [...el.childNodes]) {
        if (n.nodeType === 3) continue;
        if (n.nodeType !== 1) { n.remove(); continue; }
        const tag = n.tagName;
        if (DROP.has(tag)) { n.remove(); continue; }
        walk(n);
        if (!TAGS.has(tag)) { n.replaceWith(...n.childNodes); continue; }
        const keep = {};
        const st = n.style;
        for (const k of STYLES) { const v = st.getPropertyValue(k); if (v && SAFE_VAL.test(v) && !/url|expression/i.test(v)) keep[k] = v; }
        if (tag === 'FONT') { if (n.getAttribute('color')) keep.color = n.getAttribute('color'); if (n.getAttribute('face')) keep['font-family'] = n.getAttribute('face'); if (FONT_SIZE[n.getAttribute('size')]) keep['font-size'] = FONT_SIZE[n.getAttribute('size')]; }
        const align = n.getAttribute('align');
        const href = tag === 'A' ? n.getAttribute('href') : null;
        for (const a of [...n.attributes]) n.removeAttribute(a.name);
        if (align && /^(left|right|center|justify)$/i.test(align)) keep['text-align'] = align.toLowerCase();
        for (const k of Object.keys(keep)) if (!SAFE_VAL.test(keep[k])) delete keep[k];
        const css = Object.entries(keep).map(([k, v]) => k + ':' + v).join(';');
        let out = n;
        if (tag === 'FONT') { out = doc.createElement('span'); out.append(...n.childNodes); n.replaceWith(out); }
        if (css) out.setAttribute('style', css);
        if (href && /^(https?:|mailto:|tel:)/i.test(href.trim())) { out.setAttribute('href', href.trim()); out.setAttribute('target', '_blank'); out.setAttribute('rel', 'noopener noreferrer'); }
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }
  const isHtml = s => /<\/?(p|br|div|h[1-3]|b|strong|i|em|u|span|ul|ol|li|table)\b/i.test(s || '');
  const escT = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const textToHtml = t => String(t || '').split(/\r?\n\s*\r?\n/).map(p => '<p>' + escT(p).replace(/\r?\n/g, '<br>') + '</p>').join('') || '';
  const toHtml = body => isHtml(body) ? clean(body) : textToHtml(body);

  // ---------- ZIP: чтение и запись ----------
  // распаковка без падения на лишних байтах в конце потока (в PDF так бывает часто)
  async function inflate(u8, fmt) {
    const ds = new DecompressionStream(fmt), w = ds.writable.getWriter();
    w.write(u8).catch(() => {}); w.close().catch(() => {});
    const r = ds.readable.getReader(), chunks = []; let n = 0;
    try { for (;;) { const { done, value } = await r.read(); if (done) break; chunks.push(value); n += value.length; } } catch {}
    if (!n) throw new Error('Не удалось распаковать данные');
    const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out;
  }
  const inflateRaw = u8 => inflate(u8, 'deflate-raw');
  async function inflateZ(u8) { try { return await inflate(u8, 'deflate'); } catch { return inflateRaw(u8.subarray(2)); } }
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), files = {};
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Файл повреждён или это не документ Word');
    let p = dv.getUint32(eocd + 16, true); const n = dv.getUint16(eocd + 10, true);
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nl));
      files[name] = { method, csize, off };
      p += 46 + nl + el + cl;
    }
    return async name => {
      const f = files[name]; if (!f) return null;
      const lnl = dv.getUint16(f.off + 26, true), lel = dv.getUint16(f.off + 28, true), start = f.off + 30 + lnl + lel;
      const data = u8.subarray(start, start + f.csize);
      return f.method === 0 ? data : inflateRaw(data);
    };
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(entries) { // [{name, data:string}] — без сжатия, этого достаточно для Word
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    for (const e of entries) {
      const nm = enc.encode(e.name), data = typeof e.data === 'string' ? enc.encode(e.data) : e.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + data.length;
    }
    const csize = central.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // ---------- DOCX → HTML ----------
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  async function docxToHtml(buf) {
    const get = await unzip(buf);
    const xml = await get('word/document.xml'); if (!xml) throw new Error('В файле нет текста документа Word');
    const styXml = await get('word/styles.xml');
    const headStyles = {};
    if (styXml) {
      const sd = new DOMParser().parseFromString(td.decode(styXml), 'application/xml');
      for (const s of sd.getElementsByTagNameNS(W, 'style')) {
        const id = s.getAttributeNS(W, 'styleId'), nm = (s.getElementsByTagNameNS(W, 'name')[0]?.getAttributeNS(W, 'val') || '').toLowerCase();
        const m = nm.match(/^(heading|заголовок)\s*(\d)$/) || (nm === 'title' ? [0, 0, '1'] : null);
        if (m) headStyles[id] = Math.min(3, +m[2] || 1);
      }
    }
    const doc = new DOMParser().parseFromString(td.decode(xml), 'application/xml');
    const body = doc.getElementsByTagNameNS(W, 'body')[0];
    const val = (el, tag) => { const x = el && el.getElementsByTagNameNS(W, tag)[0]; return x ? (x.getAttributeNS(W, 'val') ?? '') : null; };
    const on = (rPr, tag) => { const v = val(rPr, tag); return v !== null && v !== '0' && v !== 'false' && v !== 'none'; };
    const runs = p => {
      let out = '';
      for (const r of p.getElementsByTagNameNS(W, 'r')) {
        const rPr = [...r.childNodes].find(x => x.localName === 'rPr');
        let t = '';
        for (const c of r.childNodes) { if (c.localName === 't') t += escT(c.textContent); else if (c.localName === 'tab') t += '&emsp;'; else if (c.localName === 'br' || c.localName === 'cr') t += '<br>'; }
        if (!t) continue;
        const css = [];
        if (rPr) {
          const col = val(rPr, 'color'); if (col && /^[0-9a-f]{6}$/i.test(col) && col.toLowerCase() !== '000000') css.push('color:#' + col);
          const sz = val(rPr, 'sz'); if (sz && +sz && +sz !== 22 && +sz !== 24) css.push('font-size:' + Math.round(+sz / 2 * 4 / 3) + 'px');
          const hl = val(rPr, 'highlight'); const HL = { yellow: '#fff59d', green: '#b9f6ca', cyan: '#b2ebf2', magenta: '#f8bbd0', red: '#ffcdd2', lightGray: '#e0e0e0' }; if (HL[hl]) css.push('background-color:' + HL[hl]);
          if (on(rPr, 'caps')) css.push('text-transform:uppercase');
          const fonts = rPr.getElementsByTagNameNS(W, 'rFonts')[0]; const fn = fonts && (fonts.getAttributeNS(W, 'ascii') || fonts.getAttributeNS(W, 'hAnsi')); if (fn && /^[\w\s-]+$/.test(fn)) css.push(`font-family:'${fn}'`);
          if (on(rPr, 'b')) t = '<b>' + t + '</b>';
          if (on(rPr, 'i')) t = '<i>' + t + '</i>';
          if (rPr.getElementsByTagNameNS(W, 'u')[0] && on(rPr, 'u')) t = '<u>' + t + '</u>';
          if (on(rPr, 'strike')) t = '<s>' + t + '</s>';
        }
        out += css.length ? `<span style="${css.join(';')}">${t}</span>` : t;
      }
      return out;
    };
    let html = '', list = null;
    const closeList = () => { if (list) { html += '</' + list + '>'; list = null; } };
    const para = p => {
      const pPr = [...p.childNodes].find(x => x.localName === 'pPr');
      const sid = val(pPr, 'pStyle'), h = sid != null ? headStyles[sid] || (/^(heading|заголовок)(\d)/i.exec(sid) ? Math.min(3, +/(\d)/.exec(sid)[1]) : 0) : 0;
      const jc = val(pPr, 'jc'), align = { center: 'center', right: 'right', end: 'right', both: 'justify' }[jc];
      const inner = runs(p), st = align ? ` style="text-align:${align}"` : '';
      const num = pPr && pPr.getElementsByTagNameNS(W, 'numPr')[0];
      if ((num || /^list|список/i.test(sid || '')) && !h) {
        const lt = /list ?number|нумер/i.test(sid || '') ? 'ol' : 'ul';
        if (list !== lt) { closeList(); html += '<' + lt + '>'; list = lt; }
        html += `<li${st}>${inner || '<br>'}</li>`; return;
      }
      closeList();
      if (h) html += `<h${h}${st}>${inner}</h${h}>`;
      else html += `<p${st}>${inner || '<br>'}</p>`;
    };
    for (const el of body.childNodes) {
      if (el.localName === 'p') para(el);
      else if (el.localName === 'tbl') {
        closeList(); html += '<table>';
        for (const tr of el.getElementsByTagNameNS(W, 'tr')) { html += '<tr>'; for (const tc of [...tr.childNodes].filter(x => x.localName === 'tc')) html += '<td>' + [...tc.getElementsByTagNameNS(W, 'p')].map(runs).join('<br>') + '</td>'; html += '</tr>'; }
        html += '</table>';
      } else if (el.localName === 'sdt') { for (const p of el.getElementsByTagNameNS(W, 'p')) para(p); }
    }
    closeList();
    return html.replace(/(<p><br><\/p>){2,}/g, '<p><br></p>');
  }

  // ---------- PDF → текст ----------
  const latin = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
  const bytesOf = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
  function a85(u8) {
    const s = latin(u8).replace(/\s/g, '').replace(/^<~/, '').replace(/~>.*$/, ''), out = [];
    for (let i = 0; i < s.length;) {
      if (s[i] === 'z') { out.push(0, 0, 0, 0); i++; continue; }
      const ch = s.slice(i, i + 5), n = ch.length; i += 5; let v = 0;
      for (let k = 0; k < 5; k++) v = v * 85 + ((k < n ? ch.charCodeAt(k) : 117) - 33);
      const b = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; out.push(...b.slice(0, n - 1));
    }
    return new Uint8Array(out);
  }
  async function pdfToHtml(buf) {
    const u8 = new Uint8Array(buf), src = latin(u8);
    if (!src.startsWith('%PDF')) throw new Error('Файл не похож на PDF');
    const objs = {};
    const streamOf = async (dict, raw) => {
      let data = bytesOf(raw);
      const fl = (dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/) || [])[1] || '';
      for (const f of fl.match(/\/\w+/g) || []) {
        if (f === '/ASCII85Decode' || f === '/A85') data = a85(data);
        else if (f === '/FlateDecode' || f === '/Fl') { try { data = await inflateZ(data); } catch { return ''; } }
        else return '';
      }
      return latin(data);
    };
    const re = /(\d+)\s+\d+\s+obj\b([\s\S]*?)\bendobj/g; let m;
    while ((m = re.exec(src))) {
      const body = m[2], si = body.indexOf('stream');
      if (si >= 0 && /^stream\r?\n/.test(body.slice(si))) {
        const dict = body.slice(0, si); let start = si + 6; if (body[start] === '\r') start++; if (body[start] === '\n') start++;
        const lenM = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
        let end = lenM ? start + +lenM[1] : body.lastIndexOf('endstream'); if (end > body.length || body.slice(end).indexOf('endstream') > 4) end = body.lastIndexOf('endstream');
        objs[m[1]] = { dict, stream: body.slice(start, end) };
      } else objs[m[1]] = { dict: body };
    }
    // объекты внутри сжатых потоков объектов (PDF 1.5+)
    for (const o of Object.values(objs)) {
      if (!/\/Type\s*\/ObjStm/.test(o.dict) || o.stream == null) continue;
      const d = await streamOf(o.dict, o.stream), first = +(o.dict.match(/\/First\s+(\d+)/) || [])[1], nn = +(o.dict.match(/\/N\s+(\d+)/) || [])[1];
      const head = d.slice(0, first).trim().split(/\s+/).map(Number);
      for (let i = 0; i < nn; i++) { const num = head[2 * i], off = head[2 * i + 1], next = i + 1 < nn ? head[2 * i + 3] : d.length - first; if (!objs[num]) objs[num] = { dict: d.slice(first + off, first + next) }; }
    }
    const ref = (s, key) => { const r = s.match(new RegExp('/' + key + '\\s+(\\d+)\\s+\\d+\\s+R')); return r ? objs[r[1]] : null; };
    const dictOf = (s, key) => { // вложенный словарь << >> или ссылка
      const i = s.search(new RegExp('/' + key + '\\b')); if (i < 0) return null;
      const rest = s.slice(i + key.length + 1).trimStart();
      const r = rest.match(/^(\d+)\s+\d+\s+R/); if (r) return objs[r[1]] ? objs[r[1]].dict : null;
      if (!rest.startsWith('<<')) return null;
      let depth = 0, j = 0; for (; j < rest.length; j++) { if (rest.startsWith('<<', j)) { depth++; j++; } else if (rest.startsWith('>>', j)) { depth--; j++; if (!depth) break; } }
      return rest.slice(0, j + 1);
    };
    const cmapCache = new Map();
    const fontMap = async fo => {
      if (!fo) return null;
      const tu = ref(fo.dict, 'ToUnicode'); if (!tu || tu.stream == null) return null;
      if (cmapCache.has(tu)) return cmapCache.get(tu);
      const cm = await streamOf(tu.dict, tu.stream), map = {}; let bytes = 1;
      const hex = h => h.replace(/\s/g, '');
      const uni = h => { h = hex(h); let s = ''; for (let i = 0; i + 3 < h.length + 1; i += 4) s += String.fromCharCode(parseInt(h.substr(i, 4), 16)); return s; };
      const cs = cm.match(/begincodespacerange\s*<([0-9a-fA-F]+)>/); if (cs) bytes = Math.max(1, hex(cs[1]).length / 2);
      for (const blk of cm.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const x of blk[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map[parseInt(x[1], 16)] = uni(x[2]);
      for (const blk of cm.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
        for (const x of blk[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[^\]]*\])/g)) {
          const a = parseInt(x[1], 16), b = parseInt(x[2], 16);
          if (x[3][0] === '[') { const arr = [...x[3].matchAll(/<([0-9a-fA-F]+)>/g)]; for (let c = a; c <= b && c - a < arr.length; c++) map[c] = uni(arr[c - a][1]); }
          else { const base = hex(x[3].slice(1, -1)), bv = parseInt(base.slice(-4), 16), pre = uni(base.slice(0, -4)); for (let c = a; c <= b && c - a < 65536; c++) map[c] = pre + String.fromCharCode(bv + c - a); }
        }
      }
      const res = { map, bytes }; cmapCache.set(tu, res); return res;
    };
    const WIN = { 0x80: '€', 0x82: '‚', 0x84: '„', 0x85: '…', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x99: '™' };
    const decodeStr = (raw, fm) => {
      if (fm) { let s = ''; for (let i = 0; i + fm.bytes <= raw.length; i += fm.bytes) { let code = 0; for (let k = 0; k < fm.bytes; k++) code = code * 256 + raw.charCodeAt(i + k); s += fm.map[code] ?? ''; } return s; }
      let s = ''; for (const ch of raw) { const c = ch.charCodeAt(0); s += WIN[c] || (c >= 32 || c === 9 ? ch : ''); } return s;
    };
    const litStr = (s, i) => { // строка в скобках с экранированием
      let depth = 1, out = ''; i++;
      while (i < s.length && depth) {
        const c = s[i];
        if (c === '\\') { const n = s[i + 1]; if (/[0-7]/.test(n)) { const o = s.slice(i + 1).match(/^[0-7]{1,3}/)[0]; out += String.fromCharCode(parseInt(o, 8)); i += 1 + o.length; continue; } out += { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[n] ?? (n === '\r' || n === '\n' ? '' : n); i += 2; continue; }
        if (c === '(') depth++; else if (c === ')') { depth--; if (!depth) { i++; break; } }
        out += c; i++;
      }
      return [out, i];
    };
    // страницы по порядку
    const pages = [];
    const walkPages = (o, inherited) => {
      if (!o) return;
      const res = dictOf(o.dict, 'Resources') || inherited;
      if (/\/Type\s*\/Pages\b/.test(o.dict)) { const kids = (o.dict.match(/\/Kids\s*\[([^\]]*)\]/) || [])[1] || ''; for (const k of kids.matchAll(/(\d+)\s+\d+\s+R/g)) walkPages(objs[k[1]], res); }
      else if (/\/Type\s*\/Page\b/.test(o.dict)) pages.push({ o, res });
    };
    const catalog = Object.values(objs).find(o => /\/Type\s*\/Catalog/.test(o.dict));
    walkPages(catalog && ref(catalog.dict, 'Pages'), null);
    if (!pages.length) for (const o of Object.values(objs)) if (/\/Type\s*\/Page\b/.test(o.dict)) pages.push({ o, res: dictOf(o.dict, 'Resources') });
    const lines = [];
    for (const { o, res } of pages) {
      const fontsD = res ? dictOf(res, 'Font') : null, fonts = {};
      if (fontsD) for (const f of fontsD.matchAll(/\/([^\s/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g)) fonts[f[1]] = await fontMap(objs[f[2]]);
      let content = '';
      const cm = o.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/);
      if (cm) for (const r of cm[1].matchAll(/(\d+)\s+\d+\s+R/g)) { const c = objs[r[1]]; if (c && c.stream != null) content += await streamOf(c.dict, c.stream) + '\n'; }
      // разбор операторов текста: собираем кусочки текста с координатами
      const items = [];
      const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]];
      let ctm = [1, 0, 0, 1, 0, 0], gs = [], font = null, fsz = 12, lead = 0, tm = [1, 0, 0, 1, 0, 0], lm = tm, adv = 0;
      const show = str => {
        const t = decodeStr(str, font); if (!t) return;
        const m = mul(tm, ctm), sz = Math.abs(fsz * Math.hypot(m[2], m[3])) || fsz;
        items.push({ x: m[4] + adv * sz, y: m[5], t, sz }); adv += t.length * 0.5;
      };
      const stack = []; let i = 0; const s = content;
      while (i < s.length) {
        const c = s[i];
        if (c === '(') { const [str, ni] = litStr(s, i); stack.push({ str }); i = ni; continue; }
        if (c === '<' && s[i + 1] === '<') { i += 2; continue; }
        if (c === '>' && s[i + 1] === '>') { i += 2; continue; }
        if (c === '<') { const e = s.indexOf('>', i); const h = s.slice(i + 1, e).replace(/\s/g, ''); let raw = ''; for (let k = 0; k < h.length; k += 2) raw += String.fromCharCode(parseInt((h.substr(k, 2) + '0').slice(0, 2), 16)); stack.push({ str: raw }); i = e + 1; continue; }
        if (c === '[') { stack.push('['); i++; continue; }
        if (c === ']') { const arr = []; while (stack.length && stack[stack.length - 1] !== '[') arr.unshift(stack.pop()); stack.pop(); stack.push({ arr }); i++; continue; }
        if (/\s/.test(c)) { i++; continue; }
        if (c === '/') { const mm = s.slice(i).match(/^\/[^\s/<>\[\]()]*/); stack.push(mm[0]); i += mm[0].length || 1; continue; }
        if (c === '%') { const e = s.indexOf('\n', i); i = e < 0 ? s.length : e; continue; }
        const mm = s.slice(i, i + 40).match(/^[^\s/<>\[\]()%]+/); if (!mm) { i++; continue; }
        const tok = mm[0]; i += tok.length;
        if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(tok)) { stack.push(+tok); continue; }
        const nums = k => stack.slice(-k).map(Number);
        switch (tok) {
          case 'q': gs.push(ctm); break;
          case 'Q': ctm = gs.pop() || [1, 0, 0, 1, 0, 0]; break;
          case 'cm': ctm = mul(nums(6), ctm); break;
          case 'BT': tm = lm = [1, 0, 0, 1, 0, 0]; adv = 0; break;
          case 'Tf': fsz = +stack[stack.length - 1] || fsz; font = fonts[String(stack[stack.length - 2]).slice(1)] || null; break;
          case 'TL': lead = +stack[stack.length - 1] || 0; break;
          case 'Td': case 'TD': { const [tx, ty] = nums(2); if (tok === 'TD') lead = -ty; lm = mul([1, 0, 0, 1, tx, ty], lm); tm = lm; adv = 0; break; }
          case 'Tm': lm = tm = nums(6); adv = 0; break;
          case 'T*': lm = mul([1, 0, 0, 1, 0, -lead], lm); tm = lm; adv = 0; break;
          case 'Tj': { const x = stack[stack.length - 1]; if (x && x.str != null) show(x.str); break; }
          case "'": case '"': { lm = mul([1, 0, 0, 1, 0, -lead], lm); tm = lm; adv = 0; const x = stack[stack.length - 1]; if (x && x.str != null) show(x.str); break; }
          case 'TJ': { const x = stack[stack.length - 1]; if (x && x.arr) for (const e of x.arr) { if (e && e.str != null) show(e.str); else if (typeof e === 'number') adv -= e / 1000; } break; }
        }
        stack.length = 0;
      }
      // строки: группируем по высоте, внутри строки — слева направо
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const rows = [];
      for (const it of items) { const r = rows[rows.length - 1]; if (r && Math.abs(r.y - it.y) < it.sz * 0.45) r.items.push(it); else rows.push({ y: it.y, sz: it.sz, items: [it] }); }
      let prev = null;
      for (const r of rows) {
        r.items.sort((a, b) => a.x - b.x);
        let t = '', end = null;
        for (const it of r.items) { if (end !== null && it.x - end > it.sz * 0.2 && !/\s$/.test(t) && !/^[\s.,:;!?)»]/.test(it.t)) t += ' '; t += it.t; end = it.x + it.t.length * it.sz * 0.5; }
        t = t.replace(/[]/g, '•').replace(/\s+/g, ' ').replace(/ ([.,:;!?)»])/g, '$1').replace(/([(«]) /g, '$1').trim();
        if (!t) continue;
        const gap = prev ? (prev.y - r.y) / Math.max(prev.sz, r.sz) : 0;
        lines.push({ t, sz: r.sz, gap: !prev || gap > 1.75 ? 2 : 1 });
        prev = r;
      }
      if (lines.length) lines.push({ t: '', gap: 2, sz: 0 });
    }
    if (!lines.some(l => /[\p{L}\d]/u.test(l.t))) throw Object.assign(new Error('В этом PDF нет текста: похоже, это скан или картинка'), { scan: true });
    // склеиваем строки в абзацы, крупный текст — заголовки
    const base = (() => { const c = {}; for (const l of lines) if (l.t) c[Math.round(l.sz)] = (c[Math.round(l.sz)] || 0) + l.t.length; return +Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; })();
    let html = '', para = [], psz = 0;
    const out = () => { if (para.length) { const txt = escT(para.join(' ').replace(/(\p{L})- (\p{Ll})/gu, '$1$2')); html += psz > base * 1.15 ? `<h${psz > base * 1.4 ? 1 : 2}>${txt}</h${psz > base * 1.4 ? 1 : 2}>` : '<p>' + txt + '</p>'; } para = []; };
    for (const l of lines) {
      if (!l.t) { out(); continue; }
      if (l.gap >= 2 || /^[•\-–—]\s|^\d+[.)]\s/.test(l.t) || Math.abs(l.sz - psz) > 1 || (para.length && /[.!?:»]$/.test(para[para.length - 1]) && para[para.length - 1].length < 55)) out();
      if (!para.length) psz = l.sz;
      para.push(l.t);
    }
    out();
    return html;
  }

  // ---------- HTML → DOCX ----------
  const xmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hexColor = v => { if (!v) return null; v = v.trim(); let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (m) return (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toUpperCase(); m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase() : null; };
  const pxToHalfPt = v => { const m = String(v || '').match(/([\d.]+)(px|pt)/); if (!m) return null; const pt = m[2] === 'pt' ? +m[1] : +m[1] * 0.75; return Math.round(pt * 2); };
  function htmlToDocx(title, html) {
    const doc = new DOMParser().parseFromString('<body>' + clean(html) + '</body>', 'text/html');
    const paras = [];
    const runXml = (text, f) => {
      let pr = '';
      if (f.font) pr += `<w:rFonts w:ascii="${xmlEsc(f.font)}" w:hAnsi="${xmlEsc(f.font)}" w:cs="${xmlEsc(f.font)}"/>`;
      if (f.b) pr += '<w:b/>'; if (f.i) pr += '<w:i/>'; if (f.caps) pr += '<w:caps/>'; if (f.s) pr += '<w:strike/>';
      if (f.color) pr += `<w:color w:val="${f.color}"/>`;
      if (f.sz) pr += `<w:sz w:val="${f.sz}"/><w:szCs w:val="${f.sz}"/>`;
      if (f.u) pr += '<w:u w:val="single"/>';
      if (f.bg) pr += `<w:shd w:val="clear" w:color="auto" w:fill="${f.bg}"/>`;
      return `<w:r>${pr ? '<w:rPr>' + pr + '</w:rPr>' : ''}${text}</w:r>`;
    };
    const inline = (node, f, acc) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); if (t) acc.push(runXml(`<w:t xml:space="preserve">${xmlEsc(t)}</w:t>`, f)); continue; }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName, g = { ...f }, st = n.style;
        if (tag === 'BR') { acc.push(runXml('<w:br/>', f)); continue; }
        if (tag === 'B' || tag === 'STRONG' || /^(bold|[6-9]00)$/.test(st.fontWeight)) g.b = true;
        if (tag === 'I' || tag === 'EM' || st.fontStyle === 'italic') g.i = true;
        if (tag === 'U' || /underline/.test(st.textDecoration || st.textDecorationLine)) g.u = true;
        if (tag === 'S' || tag === 'STRIKE' || /line-through/.test(st.textDecoration || st.textDecorationLine)) g.s = true;
        if (st.textTransform === 'uppercase') g.caps = true;
        if (hexColor(st.color)) g.color = hexColor(st.color);
        if (hexColor(st.backgroundColor)) g.bg = hexColor(st.backgroundColor);
        if (pxToHalfPt(st.fontSize)) g.sz = pxToHalfPt(st.fontSize);
        if (st.fontFamily) g.font = st.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        if (/^(P|DIV|H[1-3]|UL|OL|LI|TABLE|BLOCKQUOTE)$/.test(tag)) { block(n, f); continue; }
        inline(n, g, acc);
      }
    };
    const para = (n, f, style, prefix) => {
      const acc = []; if (prefix) acc.push(runXml(`<w:t xml:space="preserve">${xmlEsc(prefix)}</w:t>`, f));
      const before = paras.length; inline(n, f, acc);
      const al = { center: 'center', right: 'right', justify: 'both' }[n.style && n.style.textAlign];
      const pPr = (style ? `<w:pStyle w:val="${style}"/>` : '') + (prefix ? '<w:ind w:left="360" w:hanging="360"/>' : '') + (al ? `<w:jc w:val="${al}"/>` : '');
      paras.splice(before, 0, `<w:p>${pPr ? '<w:pPr>' + pPr + '</w:pPr>' : ''}${acc.join('')}</w:p>`);
    };
    function block(n, f) {
      const tag = n.tagName;
      if (/^H[1-3]$/.test(tag)) return para(n, f, 'Heading' + tag[1]);
      if (tag === 'UL' || tag === 'OL') { let k = 0; for (const li of n.children) if (li.tagName === 'LI') para(li, f, null, tag === 'OL' ? (++k) + '. ' : '• '); return; }
      if (tag === 'TABLE') {
        let t = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`).join('') + '</w:tblBorders></w:tblPr>';
        for (const tr of n.querySelectorAll('tr')) { t += '<w:tr>'; for (const td of tr.children) { const acc = []; inline(td, f, acc); t += `<w:tc><w:p>${acc.join('')}</w:p></w:tc>`; } t += '</w:tr>'; }
        paras.push(t + '</w:tbl>'); return;
      }
      const hasBlock = [...n.children].some(c => /^(P|DIV|H[1-3]|UL|OL|TABLE|BLOCKQUOTE)$/.test(c.tagName));
      if (hasBlock && tag !== 'P') { let buf = doc.createElement('p'); const push = () => { if (buf.childNodes.length) para(buf, f); buf = doc.createElement('p'); }; for (const c of [...n.childNodes]) { if (c.nodeType === 1 && /^(P|DIV|H[1-3]|UL|OL|TABLE|BLOCKQUOTE)$/.test(c.tagName)) { push(); block(c, f); } else buf.appendChild(c.cloneNode(true)); } push(); return; }
      para(n, f);
    }
    paras.push(`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${runXml(`<w:t xml:space="preserve">${xmlEsc(title || 'Статья')}</w:t>`, {})}</w:p>`);
    block(doc.body, {});
    const body = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${paras.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const hs = (id, name, sz, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/>${extra}</w:pPr><w:rPr><w:b/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${hs('Title', 'Title', 40)}${hs('Heading1', 'heading 1', 32)}${hs('Heading2', 'heading 2', 28)}${hs('Heading3', 'heading 3', 24)}</w:styles>`;
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/document.xml', data: body },
      { name: 'word/styles.xml', data: styles },
    ]);
  }

  // ---------- общий вход: файл → HTML ----------
  async function fileToHtml(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase(), buf = await file.arrayBuffer();
    if (ext === 'docx') return docxToHtml(buf);
    if (ext === 'pdf') return pdfToHtml(buf);
    if (ext === 'txt') { const u8 = new Uint8Array(buf); let t = td.decode(u8); if (t.includes('\ufffd')) t = new TextDecoder('windows-1251').decode(u8); return textToHtml(t); }
    if (ext === 'odt') {
      const get = await unzip(buf), x = await get('content.xml'); if (!x) throw new Error('Не удалось прочитать файл');
      const d = new DOMParser().parseFromString(td.decode(x), 'application/xml'), T = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0';
      return [...d.getElementsByTagNameNS(T, '*')].filter(e => e.localName === 'p' || e.localName === 'h').map(e => (e.localName === 'h' ? '<h2>' : '<p>') + escT(e.textContent) + (e.localName === 'h' ? '</h2>' : '</p>')).join('');
    }
    throw Object.assign(new Error(ext === 'doc' ? 'Текст из старого формата .doc не извлекается — файл прикреплён к статье. Чтобы перенести текст, сохраните документ в Word как .docx' : 'Текст из этого файла не извлекается — файл прикреплён к статье'), { attachOnly: true });
  }

  root.KBDOC = { clean, toHtml, isHtml, textToHtml, fileToHtml, htmlToDocx, docxToHtml, pdfToHtml };
})(typeof window !== 'undefined' ? window : globalThis);
