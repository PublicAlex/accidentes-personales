export interface Clock {
  now(): Date;
  /** Fecha de hoy 'YYYY-MM-DD' en la zona configurada. */
  today(): string;
}
