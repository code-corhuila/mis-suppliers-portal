import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, RefreshCw, ChevronLeft, ChevronRight, X, Save, Eye } from 'lucide-react';
import { suppliersModel } from './model.js';
import styles from './style.css';
import { Reception } from './reception.jsx';
function Suppliers({ context }) {
  const [state, setState] = useState(null);
  const [model] = useState(() => suppliersModel(context.request, setState, context.registration));
  const [draft, setDraft] = useState(() => context.registration.pending ? JSON.parse(context.registration.pending.body) : {});
  const view = state || model.snapshot();
  const [receiving, setReceiving] = useState(!!context.reception?.pending);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  const field = (name, label, maxLength, type = 'text', required = false) => <label key={name}>{label}<input name={name} type={type} maxLength={maxLength} required={required} pattern={name === 'documentNumber' ? '[A-Za-z0-9-]+' : undefined} value={draft[name] || ''} disabled={view.saving || view.locked} onChange={event => setDraft({ ...draft, [name]: event.target.value })}/></label>;
  return <section aria-labelledby="suppliers-title">
    <div className="heading"><div><p className="eyebrow">ABASTECIMIENTO</p><h1 id="suppliers-title">Proveedores</h1></div><div className="tools"><button title="Actualizar proveedores" aria-label="Actualizar proveedores" disabled={view.loading} onClick={() => model.load()}><RefreshCw size={18}/></button>{context.canCreate && !view.form && <button className="primary" onClick={() => { if (!context.registration.pending) setDraft({}); model.open(); }}><Plus size={18}/>Registrar proveedor</button>}</div></div>
    {context.canReadReception && <button onClick={() => setReceiving(!receiving)}>{receiving ? 'Ocultar recepcion' : 'Recepcion de suministros'}</button>}
    {receiving && <Reception context={context}/>}
    {view.form && context.canCreate && <form onSubmit={event => { event.preventDefault(); model.create(draft); }}>
      <h2>Registrar proveedor</h2><div className="fields">{field('documentNumber', 'Documento / NIT', 40, 'text', true)}{field('name', 'Nombre', 160, 'text', true)}{field('phone', 'Telefono (opcional)', 30, 'tel')}{field('email', 'Correo (opcional)', 254, 'email')}{field('address', 'Direccion (opcional)', 240)}</div>
      <p role="alert">{view.writeError}</p><div className="actions"><button disabled={view.saving || view.locked} type="button" onClick={() => model.close()}>Cancelar</button><button className="primary" disabled={view.saving} type="submit"><Save size={18}/>{view.saving ? 'Guardando...' : view.locked ? 'Reintentar registro' : 'Guardar proveedor'}</button></div>
    </form>}
    {view.saved && <p role="status" className="success">Proveedor registrado.</p>}
    {view.loading ? <p role="status">Cargando proveedores...</p> : view.error ? <div role="alert"><p>{view.error}</p><button onClick={() => model.load()}>Reintentar consulta</button></div> : <>
      <p className="summary">{view.meta.total} proveedores registrados</p>
      {!view.data.length ? <p role="status">No hay proveedores para mostrar.</p> : <div className="table-scroll"><table><thead><tr>{['Proveedor', 'Documento', 'Contacto', 'Estado', 'Ficha'].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{view.data.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.documentNumber}</td><td>{item.email || 'Sin correo'}<small>{item.phone || 'Sin telefono'}</small></td><td><span className={`status ${item.active ? 'active' : 'inactive'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td><td><button title={`Ver ficha de ${item.name}`} aria-label={`Ver ficha de ${item.name}`} onClick={() => model.select(item)}><Eye size={18}/></button></td></tr>)}</tbody></table></div>}
      <nav className="pagination" aria-label="Paginacion de proveedores"><button title="Pagina anterior" aria-label="Pagina anterior" disabled={view.page === 1} onClick={() => model.load(view.page - 1)}><ChevronLeft size={18}/></button><span>Pagina {view.page} de {view.meta.totalPages || 1}</span><button title="Pagina siguiente" aria-label="Pagina siguiente" disabled={view.page >= view.meta.totalPages} onClick={() => model.load(view.page + 1)}><ChevronRight size={18}/></button></nav>
    </>}
    {view.selected && <section className="detail" aria-labelledby="supplier-detail"><div className="heading"><h2 id="supplier-detail">{view.selected.name}</h2><button title="Cerrar ficha" aria-label="Cerrar ficha" onClick={() => model.select(null)}><X size={18}/></button></div><dl>{[['Documento', 'documentNumber'], ['Correo', 'email'], ['Telefono', 'phone'], ['Direccion', 'address']].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{view.selected[key] || 'No registrado'}</dd></div>)}</dl></section>}
  </section>;
}
export function mount(host, context) {
  if (!(host instanceof HTMLElement) || typeof context?.request !== 'function' || !context.registration) throw Error('Invalid suppliers context');
  const shadow = host.attachShadow({ mode: 'open' }), style = document.createElement('style'), container = document.createElement('div');
  style.textContent = styles; shadow.append(style, container);
  const root = createRoot(container); root.render(<Suppliers context={context}/>);
  return () => { root.unmount(); shadow.replaceChildren(); };
}
