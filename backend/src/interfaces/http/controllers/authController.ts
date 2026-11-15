import type { CookieOptions, RequestHandler } from 'express';
import type { GetCurrentUser } from '../../../application/use-cases/auth/GetCurrentUser.js';
import type { LoginUser } from '../../../application/use-cases/auth/LoginUser.js';
import type { LogoutUser } from '../../../application/use-cases/auth/LogoutUser.js';
import type { RegisterUser } from '../../../application/use-cases/auth/RegisterUser.js';
import { getAuth, SESSION_COOKIE } from '../middleware/authenticate.js';
import { userPresenter } from '../presenters/userPresenter.js';
import type { LoginBody, RegisterBody } from '../schemas/authSchemas.js';

export interface AuthUseCases {
  registerUser: Pick<RegisterUser, 'execute'>;
  loginUser: Pick<LoginUser, 'execute'>;
  logoutUser: Pick<LogoutUser, 'execute'>;
  getCurrentUser: Pick<GetCurrentUser, 'execute'>;
}

/** Sin reglas de negocio: traduce HTTP <-> casos de uso. */
export function createAuthController(uc: AuthUseCases, opts: { cookieSecure: boolean }) {
  const baseCookie: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: opts.cookieSecure, path: '/' };

  const register: RequestHandler = async (req, res) => {
    const body = req.body as RegisterBody;
    const user = await uc.registerUser.execute(body);
    res.status(201).json(userPresenter(user));
  };

  const login: RequestHandler = async (req, res) => {
    const body = req.body as LoginBody;
    const { user, token, expiresAt } = await uc.loginUser.execute(body);
    res.cookie(SESSION_COOKIE, token, { ...baseCookie, expires: expiresAt });
    res.status(200).json(userPresenter(user));
  };

  const logout: RequestHandler = async (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    try {
      await uc.logoutUser.execute({ token: typeof token === 'string' ? token : undefined });
    } finally {
      res.clearCookie(SESSION_COOKIE, baseCookie);
    }
    res.status(204).end();
  };

  const me: RequestHandler = async (_req, res) => {
    const user = await uc.getCurrentUser.execute({ userId: getAuth(res).userId });
    res.status(200).json(userPresenter(user));
  };

  return { register, login, logout, me };
}
