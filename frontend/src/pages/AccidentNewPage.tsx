import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { createAccident } from '../api/accidents';
import {
  accidentTypeLabels,
  documentTypeLabels,
  validateAccident,
  type AccidentFormValues,
} from '../api/accidentSchema';
import { ACCIDENT_TYPES, DOCUMENT_TYPES, type CreateAccidentInput } from '../api/types';
import { Icon } from '../components/Icon';
import { FieldError } from '../components/FieldError';

const VACIO: AccidentFormValues = {
  affectedName: '',
  documentType: '',
  documentNumber: '',
  phone: '',
  contactEmail: '',
  accidentType: '',
  occurredOn: '',
  place: '',
  description: '',
};

export function AccidentNewPage() {
  const [values, setValues] = useState<AccidentFormValues>(VACIO);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [creadoId, setCreadoId] = useState<string | null>(null);

  function set(k: keyof AccidentFormValues, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => {
      if (!(k in prev)) return prev;
      const { [k]: _quitado, ...resto } = prev;
      return resto;
    });
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setGeneral(null);
    setCreadoId(null);
    const v = validateAccident(values);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setEnviando(true);
    const t = (k: keyof AccidentFormValues) => values[k].trim();
    const input: CreateAccidentInput = {
      affectedName: t('affectedName'),
      documentType: t('documentType') as CreateAccidentInput['documentType'],
      documentNumber: t('documentNumber'),
      phone: t('phone'),
      contactEmail: t('contactEmail'),
      accidentType: t('accidentType') as CreateAccidentInput['accidentType'],
      occurredOn: t('occurredOn'),
      place: t('place'),
      description: t('description'),
    };
    try {
      const creado = await createAccident(input);
      setCreadoId(creado.id);
      setValues(VACIO);
      setErrors({});
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const porCampo: Record<string, string> = {};
        const otros: string[] = [];
        for (const d of err.details ?? []) {
          if (Object.prototype.hasOwnProperty.call(VACIO, d.field)) porCampo[d.field] = d.message;
          else otros.push(d.message);
        }
        setErrors(porCampo);
        if (otros.length > 0) setGeneral(otros.join('. '));
        else if (Object.keys(porCampo).length === 0) setGeneral('Los datos ingresados no son válidos');
      } else if (err instanceof ApiError && err.status === 0) {
        setGeneral('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo');
      } else if (err instanceof ApiError && err.status === 429) {
        setGeneral('Demasiados intentos, espera unos minutos');
      } else {
        setGeneral('No se pudo registrar el accidente. Inténtalo de nuevo');
      }
    } finally {
      setEnviando(false);
    }
  }

  function campo(id: keyof AccidentFormValues, label: string, extra: { type?: string; autoComplete?: string } = {}) {
    return (
      <div className="field">
        <label htmlFor={id} className="required">{label}</label>
        <input
          id={id}
          type={extra.type}
          autoComplete={extra.autoComplete}
          value={values[id]}
          onChange={(e) => set(id, e.target.value)}
          aria-required="true"
          aria-invalid={errors[id] ? true : undefined}
          aria-describedby={`${id}-error`}
        />
        <FieldError id={`${id}-error`} message={errors[id]} />
      </div>
    );
  }

  return (
    <section className="form-page">
      <h1>Registrar accidente</h1>
      {creadoId && (
        <p role="status" className="alert alert-success">
          <Icon name="check" />
          <span>Accidente registrado correctamente.</span> <Link to={`/accidentes/${creadoId}`}>Ver detalle</Link>
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="card form-card">
        <p className="muted form-hint">Los campos marcados con * son obligatorios.</p>
        <fieldset>
          <legend>Datos del afectado</legend>
          <div className="grid-2">
        {campo('affectedName', 'Nombre del afectado')}
        <div className="field">
          <label htmlFor="documentType" className="required">Tipo de documento</label>
          <select
            id="documentType"
            value={values.documentType}
            onChange={(e) => set('documentType', e.target.value)}
            aria-invalid={errors.documentType ? true : undefined}
            aria-describedby="documentType-error"
          >
            <option value="">Selecciona...</option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d} value={d}>{documentTypeLabels[d]}</option>
            ))}
          </select>
          <FieldError id="documentType-error" message={errors.documentType} />
        </div>
        {campo('documentNumber', 'Número de documento')}
          </div>
        </fieldset>
        <fieldset>
          <legend>Contacto</legend>
          <div className="grid-2">
        {campo('phone', 'Teléfono', { type: 'tel', autoComplete: 'tel' })}
        {campo('contactEmail', 'Correo de contacto', { type: 'email', autoComplete: 'email' })}
          </div>
        </fieldset>
        <fieldset>
          <legend>Detalles del accidente</legend>
          <div className="grid-2">
        <div className="field">
          <label htmlFor="accidentType" className="required">Tipo de accidente</label>
          <select
            id="accidentType"
            value={values.accidentType}
            onChange={(e) => set('accidentType', e.target.value)}
            aria-invalid={errors.accidentType ? true : undefined}
            aria-describedby="accidentType-error"
          >
            <option value="">Selecciona...</option>
            {ACCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>{accidentTypeLabels[t]}</option>
            ))}
          </select>
          <FieldError id="accidentType-error" message={errors.accidentType} />
        </div>
        {campo('occurredOn', 'Fecha del accidente', { type: 'date' })}
        {campo('place', 'Lugar')}
        <div className="field field-full">
          <label htmlFor="description" className="required">Descripción</label>
          <textarea
            id="description"
            rows={5}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby="description-error"
          />
          <FieldError id="description-error" message={errors.description} />
        </div>
          </div>
        </fieldset>
        {general && (
          <p role="alert" className="alert alert-error">{general}</p>
        )}
        <button type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Enviando...' : 'Registrar accidente'}</button>
      </form>
    </section>
  );
}
