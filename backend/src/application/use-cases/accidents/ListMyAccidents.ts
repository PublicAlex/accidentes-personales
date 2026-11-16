import type { AccidentRepository, AccidentSummary } from '../../ports/AccidentRepository.js';
import type { AuthContext } from '../auth/AuthenticateRequest.js';

export const MAX_LIST = 100;

export class ListMyAccidents {
  constructor(private readonly accidents: AccidentRepository) {}

  async execute(input: { readonly actor: Pick<AuthContext, 'userId'> }): Promise<AccidentSummary[]> {
    return this.accidents.listByOwner(input.actor.userId, MAX_LIST);
  }
}
