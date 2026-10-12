import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, RefreshCw, Save } from 'lucide-react';
import { receptionModel, today, steps } from './reception-model.js';
const labels = { RUNNING: 'En proceso', COMPLETED: 'Recepcion completada', COMPENSATED: 'Recepcion compensada', FAILED: 'Recepcion fallida: requiere revision' };
const stepLabels = ['Documento preparado', 'Entrada preparada', 'Documento confirmado', 'Stock activado'];
export function Reception({ context }) {
  const [state, setState] = useState(null), [model] = useState(() => receptionModel(context.request, context.reception, setState));
  const [draft, setDraft] = useState(() => context.reception.pending ? JSON.parse(context.reception.pending.body) : { quantity: 1 });
  const [lookup, setLookup] = useState(''); const view = state || model.snapshot();
  useEffect(() => () => model.dispose(), [model]);
  const input = (name, label, type = 'text') => <label>{label}<input name={name} type={type} required maxLength={type === 'text' ? 40 : undefined} min={type === 'number' ? 1 : type === 'date' ? today() : undefined} max={type === 'number' ? 1000000 : undefined} step={type === 'number' ? 1 : undefined} pattern={type === 'text' ? '[A-Za-z0-9-]+' : undefined} value={draft[name] || ''} disabled={view.busy || view.locked} onChange={event => setDraft({ ...draft, [name]: event.target.value })}/></label>;
  return <section className="detail" aria-labelledby="reception-title"><h2 id="reception-title">Recepcion de suministros</h2>
    {context.canReceive && !view.result && <form onSubmit={event => { event.preventDefault(); model.start(draft); }}><div className="fields">
      <Picker kind="suppliers" label="Proveedor" name="supplierId" context={context} value={draft.supplierId || ''} disabled={view.busy || view.locked} onChange={value => setDraft({ ...draft, supplierId: value })}/>
      <Picker kind="medications" label="Medicamento" name="medicationId" context={context} value={draft.medicationId || ''} disabled={view.busy || view.locked} onChange={value => setDraft({ ...draft, medicationId: value })}/>
      {input('reference', 'Referencia del documento')}{input('lotNumber', 'Numero de lote')}{input('expiresOn', 'Vencimiento', 'date')}{input('quantity', 'Cantidad', 'number')}
    </div><div className="actions"><button className="primary" type="submit" disabled={view.busy}><Save size={18}/>{view.busy ? 'Procesando...' : view.locked ? 'Reintentar recepcion' : 'Registrar recepcion'}</button></div></form>}
    <p role="alert">{view.error}</p>
    {view.result && <section aria-labelledby="reception-state"><h3 id="reception-state" role="status">{labels[view.result.status]}</h3><dl><dt>ID de proceso</dt><dd>{view.result.id}</dd><dt>Recepcion</dt><dd>{view.result.receiptId || 'Pendiente'}</dd><dt>Entrada</dt><dd>{view.result.entryId || 'Pendiente'}</dd></dl><ol>{steps.map((step, index) => <li key={step}>{stepLabels[index]}: {view.result.completedSteps.includes(step) ? 'Confirmado' : 'No confirmado'}</li>)}</ol>
      <div className="actions"><button disabled={view.busy} onClick={() => model.action(view.result.id)}><RefreshCw size={18}/>Actualizar estado</button>{context.canReceive && view.result.status === 'RUNNING' && <button disabled={view.busy} onClick={() => model.action(view.result.id, true)}><Play size={18}/>Reanudar</button>}{context.canReceive && ['COMPLETED', 'COMPENSATED'].includes(view.result.status) && <button disabled={view.busy} onClick={() => { if (model.reset()) setDraft({ quantity: 1 }); }}>Nueva recepcion</button>}</div>
    </section>}
    <form onSubmit={event => { event.preventDefault(); model.action(lookup); }}><div className="fields"><label>ID de proceso a consultar<input name="sagaId" maxLength={36} required value={lookup} onChange={event => setLookup(event.target.value)}/></label></div><button disabled={view.busy} type="submit">Consultar proceso</button></form>
  </section>;
}
function Picker({ kind, label, name, context, value, disabled, onChange }) {
  const [page, setPage] = useState(1), [result, setResult] = useState({ data: [], pages: 1, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; setResult({ data: [], pages: 1, loading: true, error: false });
    context.request(`/api/v1/${kind}?page=${page}&limit=20`).then(data => { if (!Array.isArray(data.data) || !Number.isSafeInteger(data.meta?.totalPages)) throw Error('Invalid selector data'); if (active) setResult({ data: data.data.filter(item => item.active), pages: data.meta.totalPages, loading: false, error: false }); }).catch(() => { if (active) setResult({ data: [], pages: 1, loading: false, error: true }); }); return () => { active = false; };
  }, [page, attempt, context, kind]);
  return <div className="picker"><label>{label}<select name={name} required value={value} disabled={disabled || result.loading || result.error} onChange={event => onChange(event.target.value)}><option value="">Seleccionar</option>{value && !result.data.some(item => item.id === value) && <option value={value}>{value}</option>}{result.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className="pagination"><button type="button" title={`Anterior ${label}`} aria-label={`Anterior ${label}`} disabled={disabled || result.loading || page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18}/></button><span>Pagina {page} de {result.pages || 1}</span><button type="button" title={`Siguiente ${label}`} aria-label={`Siguiente ${label}`} disabled={disabled || result.loading || page >= result.pages} onClick={() => setPage(page + 1)}><ChevronRight size={18}/></button>{result.error && <button type="button" disabled={disabled} onClick={() => setAttempt(attempt + 1)}>Reintentar opciones</button>}</div>
  </div>;
}
