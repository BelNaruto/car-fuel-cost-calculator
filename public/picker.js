/**
 * Year → Make → Model → Trim picker for the Car Specs API.
 * Usage: const p = createPicker(containerEl, { onChange(trim) {} });
 */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(route, params = {}) {
  const r = await fetch('/api' + route + (Object.keys(params).length ? '?' + new URLSearchParams(params) : ''));
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(j.error?.message || `Error ${r.status}`);
  return j;
}
const names = (d) => (Array.isArray(d) ? d : d?.models || d?.makes || []).map((x) => (typeof x === 'string' ? x : x.name)).filter(Boolean);

function createPicker(el, { onChange, defaults = {} } = {}) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear + 2 - 1984 }, (_, i) => thisYear + 1 - i);
  el.innerHTML = `
    <select data-k="year">${years.map((y) => `<option${y === (defaults.year || thisYear - 1) ? ' selected' : ''}>${y}</option>`).join('')}</select>
    <select data-k="make" disabled><option>Make…</option></select>
    <select data-k="model" disabled><option>Model…</option></select>
    <select data-k="trim" disabled><option>Trim…</option></select>`;
  const [year, make, model, trim] = ['year', 'make', 'model', 'trim'].map((k) => el.querySelector(`[data-k=${k}]`));
  let trims = [];
  const fill = (sel, label, items, pick) => {
    sel.innerHTML = `<option value="">${label}</option>` + items.map((v) => `<option${v === pick ? ' selected' : ''}>${esc(v)}</option>`).join('');
    sel.disabled = !items.length;
  };
  async function loadMakes() {
    fill(make, 'Loading…', []); fill(model, 'Model…', []); fill(trim, 'Trim…', []);
    try { fill(make, 'Make…', names((await api('/makes', { year: year.value, perPage: 200 })).data), defaults.make); } catch (e) { fill(make, e.message, []); }
    if (make.value) loadModels();
  }
  async function loadModels() {
    fill(model, 'Loading…', []); fill(trim, 'Trim…', []);
    try { fill(model, 'Model…', names((await api('/models', { make: make.value, year: year.value, source: 'epa', perPage: 200 })).data), defaults.model); } catch (e) { fill(model, e.message, []); }
    if (model.value) loadTrims();
  }
  async function loadTrims() {
    fill(trim, 'Loading…', []);
    try {
      const d = (await api('/trims', { make: make.value, model: model.value, year: year.value })).data;
      trims = Array.isArray(d) ? d : d.trims || [];
      trim.innerHTML = '<option value="">Trim…</option>' + trims.map((t) => `<option value="${t.id}">${esc(t.option || t.name)}</option>`).join('');
      trim.disabled = !trims.length;
      if (defaults.first && trims[0]) { trim.value = trims[0].id; emit(); }
    } catch (e) { fill(trim, e.message, []); }
    defaults = {};
  }
  function emit() {
    const t = trims.find((x) => String(x.id) === trim.value);
    onChange?.(t ? { ...t, year: Number(year.value), make: make.value, label: `${year.value} ${make.value} ${t.model}` } : null);
  }
  year.onchange = loadMakes; make.onchange = loadModels; model.onchange = loadTrims; trim.onchange = emit;
  loadMakes();
  return { el };
}
