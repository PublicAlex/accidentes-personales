import { accidentRepositoryContract } from '../../contract/accidentRepository.contract.js';
import { InMemoryAccidentRepository, InMemoryUserRepository } from '../../fakes/index.js';

accidentRepositoryContract('InMemory', async () => ({
  accidents: new InMemoryAccidentRepository(),
  users: new InMemoryUserRepository(),
}));
