// Поля и разделы карточки сделки, которые компания настраивает сама.
// Один и тот же код проверяет данные на сервере и в браузерной версии.
(function (root) {
  const TYPES = { text: 'Строка', num: 'Число', date: 'Дата', list: 'Список', bool: 'Да / Нет' };
  const okId = s => typeof s === 'string' && /^[a-z0-9_]{1,24}$/.test(s);
  const newId = p => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
  function cleanForm(f) {
    f = f && typeof f === 'object' ? f : {};
    const fields = {};
    for (const [k, v] of Object.entries(f.fields || {})) {
      if (!okId(k) || !v || typeof v !== 'object') continue;
      const type = TYPES[v.type] ? v.type : 'text', name = String(v.name || '').trim().slice(0, 60);
      if (!name) continue;
      const item = { name, type };
      if (type === 'list') item.options = [...new Set((Array.isArray(v.options) ? v.options : []).map(o => String(o).trim().slice(0, 80)).filter(Boolean))].slice(0, 50);
      fields[k] = item;
      if (Object.keys(fields).length >= 150) break;
    }
    const seen = new Set();
    const sections = (Array.isArray(f.sections) ? f.sections : []).slice(0, 20).map(s => {
      let id = okId(s && s.id) && !seen.has(s.id) ? s.id : newId('s'); seen.add(id);
      return { id, name: String((s && s.name) || '').trim().slice(0, 60) || 'Новый раздел', fields: [...new Set((s && Array.isArray(s.fields) ? s.fields : []).filter(x => fields[x]))].slice(0, 60) };
    });
    return { fields, sections };
  }
  function cleanExtra(x, form) {
    const out = {};
    if (typeof x === 'string') { try { x = JSON.parse(x); } catch { x = null; } }
    if (!x || typeof x !== 'object') return out;
    for (const [k, v] of Object.entries(x)) {
      const f = form.fields[k]; if (!f || v == null || v === '') continue;
      let val = String(v).trim().slice(0, 1000);
      if (f.type === 'num') { const n = +val.replace(/\s/g, '').replace(',', '.'); if (!isFinite(n)) continue; val = String(n); }
      else if (f.type === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) continue; }
      else if (f.type === 'bool') val = (v === true || val === '1' || val === 'true') ? '1' : '0';
      else if (f.type === 'list') { if (!(f.options || []).includes(val)) continue; }
      if (val !== '') out[k] = val;
    }
    return out;
  }
  const api = { TYPES, cleanForm, cleanExtra, newId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DEALFORM = api;
})(typeof window !== 'undefined' ? window : globalThis);
