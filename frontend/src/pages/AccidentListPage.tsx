import { Link } from 'react-router-dom';
import { listAccidents } from '../api/accidents';
import { accidentTypeLabels, formatDate } from '../api/accidentSchema';
import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

export function AccidentListPage() {
  const { data, error, loading, reload } = useAsync(listAccidents);

  return (
    <section>
      <div className="page-head">
        <h1>Mis accidentes</h1>
        <Link className="button" to="/accidentes/nuevo">Nuevo registro</Link>
      </div>
      {loading && <p className="loading">Cargando...</p>}
      {!loading && error != null && (
        <div role="alert" className="alert alert-error">
          <p>{error instanceof ApiError && error.status === 0 ? 'No se pudo conectar con el servidor.' : 'No se pudieron cargar tus accidentes.'}</p>
          <button type="button" className="btn-outline btn-sm" onClick={reload}>Reintentar</button>
        </div>
      )}
      {!loading && error == null && data && data.length === 0 && (
        <div className="card empty-state">
          <span className="empty-icon"><Icon name="clipboard" size={28} /></span>
          <p>Aún no has registrado accidentes.</p>
          <p className="muted">Cuando registres uno, aparecerá aquí con su estado.</p>
          <Link className="button" to="/accidentes/nuevo">Registrar accidente</Link>
        </div>
      )}
      {!loading && error == null && data && data.length > 0 && (
        <div className="card table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td data-label="Fecha">{formatDate(a.occurredOn)}</td>
                  <td data-label="Tipo">{accidentTypeLabels[a.accidentType] ?? a.accidentType}</td>
                  <td data-label="Estado"><StatusBadge status={a.status} /></td>
                  <td className="cell-action"><Link to={`/accidentes/${encodeURIComponent(a.id)}`}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
