import { Accident, type AccidentInput } from '../../../domain/accident/Accident.js';
import type { AccidentRepository } from '../../ports/AccidentRepository.js';
import type { Clock } from '../../ports/Clock.js';
import type { IdGenerator } from '../../ports/IdGenerator.js';
import type { AuthContext } from '../auth/AuthenticateRequest.js';

export type CreateAccidentFields = Omit<AccidentInput, 'ownerId'>;

export class CreateAccident {
  constructor(
    private readonly accidents: AccidentRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  /** El propietario es siempre el actor autenticado; cualquier `ownerId` en `input` se ignora. */
  async execute(input: { readonly actor: Pick<AuthContext, 'userId'>; readonly fields: CreateAccidentFields }): Promise<Accident> {
    const f = input.fields;
    const accident = Accident.create(
      {
        affectedName: f.affectedName,
        documentType: f.documentType,
        documentNumber: f.documentNumber,
        phone: f.phone,
        contactEmail: f.contactEmail,
        accidentType: f.accidentType,
        occurredOn: f.occurredOn,
        place: f.place,
        description: f.description,
        ownerId: input.actor.userId,
      },
      { id: this.ids.uuid(), now: this.clock.now(), today: this.clock.today() },
    );
    return this.accidents.create(accident);
  }
}
