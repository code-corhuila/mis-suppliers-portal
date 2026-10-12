const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const steps = ['prepare-receipt', 'prepare-entry', 'confirm-receipt', 'activate-entry'];
export function today(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(item => [item.type, item.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function receptionBody(draft, fresh = true) {
  const body = { supplierId: draft.supplierId, medicationId: draft.medicationId, reference: String(draft.reference || '').trim().toUpperCase(), lotNumber: String(draft.lotNumber || '').trim().toUpperCase(), expiresOn: draft.expiresOn, quantity: Number(draft.quantity) };
  if (!uuid.test(body.supplierId) || !uuid.test(body.medicationId) || !/^[A-Z0-9-]{1,40}$/.test(body.reference) || !/^[A-Z0-9-]{1,40}$/.test(body.lotNumber)) throw Error('Revisa proveedor, medicamento, referencia y lote.');
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(body.expiresOn) || !Number.isFinite(Date.parse(`${body.expiresOn}T00:00:00Z`)) || new Date(`${body.expiresOn}T00:00:00Z`).toISOString().slice(0, 10) !== body.expiresOn || fresh && body.expiresOn <= today()) throw Error('El vencimiento debe ser una fecha futura.');
  if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 1000000) throw Error('La cantidad debe ser un entero entre 1 y 1000000.');
  return body;
}
function saga(value) {
  if (!uuid.test(value?.id) || !['RUNNING', 'COMPLETED', 'FAILED', 'COMPENSATED'].includes(value.status) || !Array.isArray(value.completedSteps) || value.completedSteps.some((step, index) => step !== steps[index]) || value.completedSteps.length > 4 || value.status === 'COMPLETED' && (value.completedSteps.length !== 4 || !uuid.test(value.entryId) || !uuid.test(value.receiptId))) throw Error('Invalid saga response');
  return value;
}
export function receptionModel(request, store, changed = () => {}) {
  let disposed = false;
  let state = { busy: false, result: store.pending?.result || null, error: '', locked: !!store.pending };
  const update = patch => { if (!disposed) { state = { ...state, ...patch }; changed(state); } };
  async function start(draft) {
    if (disposed || state.busy) return;
    let body;
    try { body = JSON.stringify(receptionBody(draft, !store.pending)); } catch (error) { update({ error: error.message }); return; }
    if (store.pending && store.pending.body !== body) { update({ error: 'Reintenta la recepcion original sin cambiar datos.' }); return; }
    store.pending ||= { key: crypto.randomUUID(), body, result: null }; const intent = store.pending;
    update({ busy: true, locked: true, error: '' });
    try { const result = saga(await request('/api/v1/sagas/receive-supplies', { method: 'POST', headers: { 'Idempotency-Key': intent.key }, body: intent.body })); if (intent.result && intent.result.id !== result.id) throw Error('Saga identity mismatch'); if (!disposed) { intent.result = result; update({ busy: false, result }); } }
    catch (error) { if (disposed) return; if ([400, 403, 422].includes(error.status)) { store.pending = null; update({ locked: false }); } update({ busy: false, error: 'No se confirmo la recepcion. Revisa los datos o reintenta el mismo envio.' }); }
  }
  async function action(id, resume = false) {
    if (disposed || state.busy) return;
    if (!uuid.test(id)) { update({ error: 'El ID de proceso debe ser un UUID valido.' }); return; }
    if (store.pending && store.pending.result?.id !== id) { update({ error: 'Resuelve o reintenta la recepcion actual antes de consultar otra.' }); return; }
    update({ busy: true, error: '' });
    try { const result = saga(await request(`/api/v1/sagas/${id}${resume ? '/resume' : ''}`, resume ? { method: 'POST', body: '{}' } : {})); if (result.id !== id) throw Error('Saga identity mismatch'); if (!disposed) { if (store.pending?.result?.id === id) store.pending.result = result; update({ busy: false, result }); } }
    catch { update({ busy: false, error: 'No fue posible consultar o reanudar este proceso.' }); }
  }
  return { start, action, snapshot: () => state, reset() { if (!state.busy && (!store.pending || ['COMPLETED', 'COMPENSATED'].includes(store.pending.result?.status))) { store.pending = null; update({ result: null, locked: false, error: '' }); return true; } return false; }, dispose() { disposed = true; } };
}
