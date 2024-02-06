import * as UserLib from '../lib/users';
import { Deps } from "../deps/prod";
import { authenticate, requireAcceptJson } from "./utils";
import { HttpError } from "@wymp/http-errors";
import { Handler, HandlerGetter } from './types';

//
// Handlers
//

/**
 * Register a new user
 */
const register = (deps: Pick<Deps, 'db'>): Handler => async (req) => {
  requireAcceptJson(req);

  // TODO: Validate incoming data
  const data = req.body.data;

  try {
    await deps.db.getUserByEmail(data.email);
    throw new HttpError(400, `User already exists; please log in`, { subcode: `USER-REGISTRATION.USER-EXISTS` });
  } catch (_e) {
    const e = HttpError.from(_e);
    if (e.status !== 404) {
      throw e;
    }

    // Create the user and session
    const result = await UserLib.createUser(deps, data, data.password, true);

    // Return result
    return {
      status: 201,
      body: { data: result },
      authd: false,
    }
  }
}

/**
 * Logs in an existing user
 */
const login = (deps: Pick<Deps, 'db'>): Handler => async (req) => {
  requireAcceptJson(req);

  // TODO: Validate incoming data
  const data = req.body.data;

  const result = await UserLib.login(deps, data.email, data.password);

  return {
    status: 200,
    body: { data: result },
    authd: false,
  }
}

/**
 * Logs out a user
 */
const logout = (deps: Pick<Deps, 'db'>): Handler => async (req) => {
  requireAcceptJson(req);

  const { session } = await authenticate(deps, req);
  await UserLib.logout(deps, { type: 'id', value: session.id });
  return {
    status: 200,
    authd: true,
  }
}

/**
 * Gets all users (only accessible to admins)
 */
const getAllUsers = (deps: Pick<Deps, 'db'>): Handler => async (req) => {
  requireAcceptJson(req);

  const { user } = await authenticate(deps, req);
  if (!user.isAdmin) {
    throw new HttpError(403, 'You do not have permission to access this endpoint');
  }
  const allUsers = await deps.db.getAllUsers();
  return {
    status: 200,
    authd: true,
    body: { data: allUsers },
  }
}

/**
 * Gets a specific user (you can only get yourself unless you're an admin)
 */
const getUser = (deps: Pick<Deps, 'db'>): Handler => async (req) => {
  requireAcceptJson(req);

  const { id } = req.params;
  if (!id) {
    throw new HttpError(500, `Expected 'id' param to be set but it wasn't`);
  }

  const { user: sessionUser } = await authenticate(deps, req);
  if (id !== 'current' && !sessionUser.isAdmin && id !== sessionUser.id) {
    throw new HttpError(404, `No user found`, { subcode: 'USER-NOT-FOUND' })
  }

  const data = id === 'current'
    ? sessionUser
    : await deps.db.getUserById(id);

  return {
    status: 200,
    authd: true,
    body: { data },
  }
}

/**
 * Get stats about all requests
 */
const getRequestStats = (deps: Pick<Deps, 'db'>): Handler => async (req) => {
  requireAcceptJson(req);

  const data = await deps.db.getRequestStats();
  return {
    status: 200,
    authd: false,
    body: { data },
  }
}

//
// Exports
//

/**
 * The full collection of HTTP handlers for the `example` domain.
 */
export const Handlers = {
  register,
  login,
  logout,
  getAllUsers,
  getUser,
  getRequestStats,
} satisfies { [K: string]: HandlerGetter };
export type Handlers = {
  [K in keyof typeof Handlers]: (deps: Parameters<(typeof Handlers)[K]>[0]) => Handler;
}
