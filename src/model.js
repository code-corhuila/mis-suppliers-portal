export function normalizeSupplier(draft) {
  const body = { documentNumber: String(draft.documentNumber || '').trim().toUpperCase(), name: String(draft.name || '').trim() };
  if (!/^[A-Z0-9-]{1,40}$/.test(body.documentNumber) || !body.name || [...body.name].length > 160) throw Error('Revisa el documento y el nombre.');
  for (const [key, limit] of [['phone', 30], ['email', 254], ['address', 240]]) {
    const value = String(draft[key] || '').trim();
    if ([...value].length > limit) throw Error('Un dato de contacto supera el limite permitido.');
    if (value) body[key] = key === 'email' ? value.toLowerCase() : value;
  }
  return body;
}
export function suppliersModel(request, changed = () => {}, registration = { pending: null }) {
  let disposed = false, generation = 0;
  let state = { page: 1, data: [], meta: { total: 0, totalPages: 0 }, loading: false, error: '', selected: null, form: !!registration.pending, saving: false, writeError: '', saved: false, locked: !!registration.pending };
  const update = patch => { if (!disposed) { state = { ...state, ...patch }; changed(state); } };
  async function load(page = state.page) {
    if (disposed || !Number.isSafeInteger(page) || page < 1) return;
    const version = ++generation; update({ page, loading: true, error: '', data: [] });
    try {
      const result = await request(`/api/v1/suppliers?page=${page}&limit=20`);
      if (disposed || version !== generation) return;
      if (!Array.isArray(result.data) || result.meta?.page !== page || result.meta?.limit !== 20 || !Number.isSafeInteger(result.meta.total) || !Number.isSafeInteger(result.meta.totalPages) || result.data.length > 20 || result.data.some(item => typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.documentNumber !== 'string')) throw Error('Invalid response');
      update({ data: result.data, meta: result.meta, loading: false });
    } catch (error) { if (version === generation) update({ loading: false, error: error.status === 403 ? 'No tienes permiso para consultar proveedores.' : 'No fue posible cargar los proveedores.' }); }
  }
  async function create(draft) {
    if (disposed || state.saving) return;
    let body;
    try { body = JSON.stringify(normalizeSupplier(draft)); }
    catch (error) { update({ writeError: error.message }); return; }
    if (registration.pending && registration.pending.body !== body) { update({ writeError: 'Reintenta el registro original antes de cambiar los datos.' }); return; }
    registration.pending ||= { key: crypto.randomUUID(), body };
    const intent = registration.pending; update({ saving: true, locked: true, writeError: '', saved: false });
    try {
      const result = await request('/api/v1/suppliers', { method: 'POST', headers: { 'Idempotency-Key': intent.key }, body: intent.body });
      if (disposed) return;
      if (typeof result.id !== 'string' || result.documentNumber !== JSON.parse(intent.body).documentNumber || typeof result.name !== 'string') throw Error('Invalid write response');
      registration.pending = null; update({ saving: false, locked: false, form: false, selected: result, saved: true }); await load(1);
    } catch (error) {
      if (disposed) return;
      const definitive = [400, 403, 422].includes(error.status);
      if (definitive) registration.pending = null;
      update({ saving: false, locked: !definitive, writeError: error.status === 422 ? 'El documento ya esta registrado o los datos no son validos.' : error.status === 403 ? 'Solo Administrador puede registrar proveedores.' : definitive ? 'Revisa los datos del proveedor.' : 'No se confirmo el registro. Reintenta el mismo envio.' });
    }
  }
  return { load, create, snapshot: () => state, open() { update({ form: true, saved: false, writeError: '' }); }, close() { if (!state.saving && !registration.pending) update({ form: false }); }, select(item) { update({ selected: item }); }, dispose() { disposed = true; generation++; } };
}
