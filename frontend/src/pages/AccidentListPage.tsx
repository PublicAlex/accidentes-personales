import { Link } from 'react-router-dom';
import { listAccidents } from '../api/accidents';
import { accidentTypeLabels, formatDate } from '../api/accidentSchema';
import { ApiError } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

export function AccidentListPage() {
  const { data, error, loading, reload } = useAsync(listAccidents);

  return (
    <section>
      <h1>Mis accidentes</h1>
      {loading && <p className="loading">Cargando...</p>}
      {!loading && error != null && (
        <div role="alert" className="field-error">
          <p>{error instanceof ApiError && error.status === 0 ? 'No se pudo conectar con el servidor.' : 'No se pudieron cargar tus accidentes.'}</p>
          <button type="button" onClick={reload}>Reintentar</button>
        </div>
      )}
      {!loading && error == null && data && data.length === 0 && (
        <p>
          Aún no has registrado accidentes. <Link to="/accidentes/nuevo">Registrar accidente</Link>
        </p>
      )}
      {!loading && error == null && data && data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
              <th scope="col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <td>{accidentTypeLabels[a.accidentType] ?? a.accidentType}</td>
                <td>{formatDate(a.occurredOn)}</td>
                <td><StatusBadge status={a.status} /></td>
                <td><Link to={`/accidentes/${encodeURIComponent(a.id)}`}>Ver detalle</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
