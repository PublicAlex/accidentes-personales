import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAccident } from '../api/accidents';
import { accidentTypeLabels, documentTypeLabels, formatDate } from '../api/accidentSchema';
import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

function formatTimestamp(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]} UTC` : iso;
}

export function AccidentDetailPage() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useAsync(() => getAccident(id), [id]);

  if (loading) return <p className="loading">Cargando...</p>;

  if (error != null) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <section className="card empty-state">
          <span className="empty-icon"><Icon name="alert" size={28} /></span>
          <h1>Accidente no encontrado</h1>
          <p><Link to="/accidentes">Volver a mis accidentes</Link></p>
        </section>
      );
    }
    return (
      <section>
        <h1>Detalle del accidente</h1>
        <div role="alert" className="alert alert-error">
          <p>{error instanceof ApiError && error.status === 0 ? 'No se pudo conectar con el servidor.' : 'No se pudo cargar el accidente.'}</p>
          <button type="button" className="btn-outline btn-sm" onClick={reload}>Reintentar</button>
        </div>
        <p><Link to="/accidentes">Volver a mis accidentes</Link></p>
      </section>
    );
  }

  if (!data) return null;
  const filas: [string, ReactNode][] = [
    ['Nombre del afectado', data.affectedName],
    ['Tipo de documento', documentTypeLabels[data.documentType] ?? data.documentType],
    ['Número de documento', data.documentNumber],
    ['Teléfono', data.phone],
    ['Correo de contacto', data.contactEmail],
    ['Tipo de accidente', accidentTypeLabels[data.accidentType] ?? data.accidentType],
    ['Fecha del accidente', formatDate(data.occurredOn)],
    ['Lugar', data.place],
    ['Descripción', data.description],
  ];
  const corto = data.id.slice(0, 8).toUpperCase();
  return (
    <section>
      <p className="back"><Link to="/accidentes">Volver a mis accidentes</Link></p>
      <article className="card ficha">
        <header className="ficha-head">
          <div>
            <h1>Detalle del accidente</h1>
            <p className="muted">Caso <span className="case-id">#{corto}</span></p>
          </div>
          <StatusBadge status={data.status} />
        </header>
        <dl className="detail">
          {filas.map(([k, v]) => (
            <div key={k} className={`detail-row${k === 'Descripción' ? ' detail-wide' : ''}`}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <ol className="timeline" aria-label="Seguimiento">
          <li>
            <span className="timeline-label">Registrado el</span>
            <span className="timeline-value">{formatTimestamp(data.createdAt)}</span>
          </li>
          <li>
            <span className="timeline-label">Última actualización</span>
            <span className="timeline-value">{formatTimestamp(data.updatedAt)}</span>
          </li>
        </ol>
      </article>
    </section>
  );
}
