import express, { Router, type RequestHandler } from 'express';
import { createAccidentController, type AccidentUseCases } from '../controllers/accidentController.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { changeStatusSchema, createAccidentSchema } from '../schemas/accidentSchemas.js';

export function createAccidentRouter(deps: { useCases: AccidentUseCases; authenticate: RequestHandler }): Router {
  const c = createAccidentController(deps.useCases);
  const jsonBody = express.json({ limit: '100kb' });
  const router = Router();
  router.use(deps.authenticate);
  router.post('/', jsonBody, validate(createAccidentSchema), c.create);
  router.get('/', c.list);
  router.get('/:id', c.get);
  router.patch('/:id/status', requireRole('REVIEWER'), jsonBody, validate(changeStatusSchema), c.changeStatus);
  return router;
}
