// Права сотрудников: матрица «раздел × действие». Один и тот же код работает на сервере и в браузерной версии.
// v — видеть, c — добавлять, e — изменять (вести), d — удалять
(function (root) {
  const SECTIONS = ['dashboard', 'deals', 'stages', 'contacts', 'products', 'tasks', 'contracts', 'finance', 'kb', 'mail'];
  // какие действия есть у раздела
  const ACTIONS = { dashboard: ['v'], deals: ['v', 'c', 'e', 'd'], stages: ['c', 'e', 'd'], contacts: ['v', 'c', 'e', 'd'], tasks: ['v', 'c', 'e', 'd'], contracts: ['v', 'c', 'e', 'd'], finance: ['v', 'c', 'e', 'd'], kb: ['v', 'c', 'e', 'd'], mail: ['v', 'c'], products: ['v', 'c', 'e', 'd'] };
  // mail: v — читать свою почту в Орбите, c — отправлять письма
  const ALL = ['v', 'c', 'e', 'd'];
  const row = (s, on) => Object.fromEntries(ALL.map(a => [a, !!on && ACTIONS[s].includes(a)]));
  const full = () => Object.fromEntries(SECTIONS.map(s => [s, row(s, true)]));

  // приводим любые сохранённые права к матрице (поддерживаются и старые форматы)
  function normalize(p) {
    p = p || {};
    let acl;
    if (p.acl) {
      acl = Object.fromEntries(SECTIONS.map(s => [s, Object.fromEntries(ALL.map(a => [a, !!(p.acl[s] && p.acl[s][a]) && ACTIONS[s].includes(a)]))]));
      // каталог товаров появился позже: кто видит сделки, тот видит и каталог
      if (!p.acl.products) acl.products.v = !!(p.acl.deals && p.acl.deals.v);
    } else {
      // старый формат: sections = true | 0/1/2, del — общая галочка
      const lv = s => { const v = p.sections && p.sections[s]; return v === true ? 2 : [0, 1, 2].includes(+v) ? +v : 0; };
      acl = Object.fromEntries(SECTIONS.map(s => {
        if (s === 'stages' || s === 'mail') return [s, row(s, false)];
        if (s === 'products') return [s, { v: lv('deals') > 0, c: false, e: false, d: false }];
        const l = lv(s);
        return [s, { v: l > 0, c: l === 2 && s !== 'dashboard', e: l === 2 && s !== 'dashboard', d: l === 2 && !!p.del && s !== 'dashboard' }];
      }));
    }
    for (const s of SECTIONS) {
      const r = acl[s];
      if (s !== 'stages' && !r.v) { r.c = r.e = r.d = false; } // без просмотра нет и остального
      if (s !== 'stages' && (r.c || r.e || r.d)) r.v = true;
    }
    if (!acl.deals.v) acl.stages = row('stages', false);
    const money = !!p.money;
    if (!money) acl.finance = row('finance', false);
    return { acl, money, onlyOwn: !!p.onlyOwn, team: !!p.team };
  }
  function permsOf(u) {
    if (u.role === 'director') return expand({ acl: full(), money: true, onlyOwn: false, team: true }, true);
    let p = u.perms; if (typeof p === 'string') { try { p = JSON.parse(p || '{}'); } catch { p = {}; } }
    return expand(normalize(p), false);
  }
  function expand(n, director) {
    const sections = Object.fromEntries(SECTIONS.map(s => [s, s === 'stages' ? n.acl.deals.v : n.acl[s].v]));
    const edit = Object.fromEntries(SECTIONS.map(s => [s, n.acl[s].e]));
    return { director, acl: n.acl, sections, edit, money: n.money, onlyOwn: n.onlyOwn, team: director || n.team };
  }
  // права, которые выдаёт не директор, не могут быть шире его собственных
  function clamp(n, P) {
    if (P.director) return n;
    for (const s of SECTIONS) for (const a of ALL) n.acl[s][a] = n.acl[s][a] && P.acl[s][a];
    n.money = n.money && P.money; n.team = false; if (!n.money) n.acl.finance = row('finance', false);
    return n;
  }
  const PRESETS = {
    full: { name: 'Полный доступ', make: () => ({ acl: full(), money: true, onlyOwn: false, team: false }) },
    sales: { name: 'Менеджер по продажам', make: () => ({ acl: { dashboard: { v: 1 }, deals: { v: 1, c: 1, e: 1 }, stages: {}, contacts: { v: 1, c: 1, e: 1 }, tasks: { v: 1, c: 1, e: 1, d: 1 }, contracts: { v: 1 }, finance: {}, kb: { v: 1 }, mail: { v: 1, c: 1 }, products: { v: 1 } }, money: false, onlyOwn: true, team: false }) },
    deals: { name: 'Только ведение сделок', make: () => ({ acl: { dashboard: {}, deals: { v: 1, e: 1 }, stages: {}, contacts: { v: 1 }, tasks: { v: 1, c: 1, e: 1 }, contracts: {}, finance: {}, kb: { v: 1 }, mail: { v: 1, c: 1 }, products: { v: 1 } }, money: false, onlyOwn: true, team: false }) },
    viewer: { name: 'Наблюдатель', make: () => ({ acl: { dashboard: { v: 1 }, deals: { v: 1 }, stages: {}, contacts: { v: 1 }, tasks: { v: 1 }, contracts: { v: 1 }, finance: {}, kb: { v: 1 }, products: { v: 1 } }, money: false, onlyOwn: false, team: false }) },
  };
  const preset = k => normalize(PRESETS[k].make());
  const api = { SECTIONS, ACTIONS, ALL, normalize, permsOf, clamp, PRESETS, preset };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PERMS = api;
})(typeof window !== 'undefined' ? window : globalThis);
