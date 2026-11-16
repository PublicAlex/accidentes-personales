import type { Accident } from '../../../domain/accident/Accident.js';
import { isUuid } from '../../../domain/shared/Id.js';
import { NotFoundError } from '../../errors.js';
import type { AccidentRepository } from '../../ports/AccidentRepository.js';
import type { AuthContext } from '../auth/AuthenticateRequest.js';

export class GetMyAccident {
  constructor(private readonly accidents: AccidentRepository) {}

  /** Id no-UUID, ajeno o inexistente: el mismo NotFoundError. */
  async execute(input: { readonly actor: Pick<AuthContext, 'userId'>; readonly id: string }): Promise<Accident> {
    if (!isUuid(input.id)) throw new NotFoundError();
    const accident = await this.accidents.findByIdForOwner(input.id, input.actor.userId);
    if (!accident) throw new NotFoundError();
    return accident;
  }
}
