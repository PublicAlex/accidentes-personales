import { assertTransition, type AccidentStatus } from '../../../domain/accident/AccidentStatus.js';
import { isUuid } from '../../../domain/shared/Id.js';
import { ForbiddenError, NotFoundError } from '../../errors.js';
import type { AccidentRepository } from '../../ports/AccidentRepository.js';
import type { Clock } from '../../ports/Clock.js';
import type { AuthContext } from '../auth/AuthenticateRequest.js';

export class ChangeAccidentStatus {
  constructor(
    private readonly accidents: AccidentRepository,
    private readonly clock: Clock,
  ) {}

  /** La matriz de transiciones vive solo en el dominio; la concurrencia la fija el UPDATE condicional. */
  async execute(input: {
    readonly actor: Pick<AuthContext, 'userId' | 'role'>;
    readonly id: string;
    readonly status: AccidentStatus;
  }): Promise<{ id: string; status: AccidentStatus; updatedAt: Date }> {
    if (input.actor.role !== 'REVIEWER') throw new ForbiddenError();
    if (!isUuid(input.id)) throw new NotFoundError();
    const current = await this.accidents.findStatusById(input.id);
    if (!current) throw new NotFoundError();
    assertTransition(current.status, input.status);
    return this.accidents.updateStatus({
      id: input.id,
      expected: current.status,
      next: input.status,
      by: input.actor.userId,
      at: this.clock.now(),
    });
  }
}
