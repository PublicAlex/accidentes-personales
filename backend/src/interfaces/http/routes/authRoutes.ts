import express, { Router, type RequestHandler } from 'express';
import { createAuthController, type AuthUseCases } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../schemas/authSchemas.js';

export function createAuthRouter(deps: {
  useCases: AuthUseCases;
  cookieSecure: boolean;
  authenticate: RequestHandler;
  rateLimit: RequestHandler;
}): Router {
  const c = createAuthController(deps.useCases, { cookieSecure: deps.cookieSecure });
  const jsonBody = express.json({ limit: '100kb' });
  const router = Router();
  router.post('/register', deps.rateLimit, jsonBody, validate(registerSchema), c.register);
  router.post('/login', deps.rateLimit, jsonBody, validate(loginSchema), c.login);
  router.post('/logout', c.logout);
  router.get('/me', deps.authenticate, c.me);
  return router;
}
