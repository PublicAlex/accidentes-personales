import type { Clock } from '../../application/ports/Clock.js';

export class SystemClock implements Clock {
  private readonly formatter: Intl.DateTimeFormat;

  constructor(timeZone: string = 'America/Bogota') {
    // en-CA formatea como YYYY-MM-DD.
    this.formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  now(): Date {
    return new Date();
  }

  today(): string {
    return this.formatter.format(this.now());
  }
}
