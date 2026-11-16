import type { RequestHandler } from 'express';
import type { CreateAccident } from '../../../application/use-cases/accidents/CreateAccident.js';
import type { GetMyAccident } from '../../../application/use-cases/accidents/GetMyAccident.js';
import type { ListMyAccidents } from '../../../application/use-cases/accidents/ListMyAccidents.js';
import { getAuth } from '../middleware/authenticate.js';
import { accidentPresenter, accidentSummaryPresenter } from '../presenters/accidentPresenter.js';
import type { CreateAccidentBody } from '../schemas/accidentSchemas.js';

export interface AccidentUseCases {
  createAccident: Pick<CreateAccident, 'execute'>;
  listMyAccidents: Pick<ListMyAccidents, 'execute'>;
  getMyAccident: Pick<GetMyAccident, 'execute'>;
}

/** Sin reglas de negocio: el propietario sale solo de res.locals.auth. */
export function createAccidentController(uc: AccidentUseCases) {
  const create: RequestHandler = async (req, res) => {
    const fields = req.body as CreateAccidentBody;
    const accident = await uc.createAccident.execute({ actor: getAuth(res), fields });
    res.status(201).json(accidentPresenter(accident));
  };

  const list: RequestHandler = async (_req, res) => {
    const items = await uc.listMyAccidents.execute({ actor: getAuth(res) });
    res.status(200).json(items.map(accidentSummaryPresenter));
  };

  const get: RequestHandler = async (req, res) => {
    const accident = await uc.getMyAccident.execute({ actor: getAuth(res), id: String(req.params.id) });
    res.status(200).json(accidentPresenter(accident));
  };

  return { create, list, get };
}
