/**
 * Middleware and Utility Functions for the HTTP Module
 */

import { HttpError } from "@wymp/http-errors";
import { logger } from "@wymp/http-utils";
import type { SimpleHttpServerMiddleware, SimpleHttpServerRequestInterface } from "@wymp/ts-simple-interfaces";
import { type Deps } from "../deps/prod";
import { MSG_KEYS, type ExampleDomainMessages, type Session, type User } from "../types";
import type { Handler } from "./types";

/** Require an `accepts: application/json` header */
export const requireAcceptJson = (req: SimpleHttpServerRequestInterface) => {
  if (!req.accepts('application/json')) {
    throw new HttpError(406, 'This endpoint only supports JSON responses');
  }
}

/** Authenticate a request, returning the resulting user and session objects */
export const authenticate = async (deps: Pick<Deps, 'db'>, req: SimpleHttpServerRequestInterface): Promise<{ user: User; session: Session }> => {
  const header = req.header('Authorization');
  if (!header) {
    throw new HttpError(401, 'Unauthorized', { subcode: 'MISSING-AUTHORIZATION-HEADER' });
  }
  const schemes = header.split(',');
  let bearerToken: string | undefined;
  for (const scheme of schemes) {
    if (scheme.trim().toLowerCase().startsWith('bearer ')) {
      bearerToken = scheme.trim().split(' ')[1];
      break;
    }
  } 

  if (!bearerToken) {
    throw new HttpError(401, 'Unauthorized', { subcode: 'MISSING-BEARER-TOKEN' });
  }

  const session = await deps.db.getSessionByToken(bearerToken);
  if (!session) {
    throw new HttpError(401, `No session found for supplied token`, { subcode: 'INVALID-SESSION.NOT-FOUND' });
  }
  if (session.invalidatedAtMs !== null) {
    throw new HttpError(401, `Session has been invalidated`, { subcode: 'INVALID-SESSION.INVALIDATED' });
  }
  if(session.expiresAtMs < Date.now()) {
    throw new HttpError(401, `Session has expired`, { subcode: 'INVALID-SESSION.EXPIRED' });
  }

  let user: User;
  try {
    user = await deps.db.getUserById(session.userId);
  } catch (_e) {
    const e = HttpError.from(_e);
    if (e.status === 404) {
      throw new HttpError(401, `No user found for session`, { subcode: 'INVALID-SESSION.USER-NOT-FOUND' });
    } else {
      throw e;
    }
  }

  return { user, session };
}

/**
 * Collect endpoint statistics.
 * 
 * This is a function that wraps a handler and collects stats about the request after it's been processed.
 */
export const collectStats = <D extends Pick<Deps, 'amqp' | 'log'>>(
  deps: D,
  handler: (deps: D) => Handler
): SimpleHttpServerMiddleware => async (req, res, next) => {
  let responseStatus: number;
  let authd: boolean | null;
  const log = logger(deps.log, req, res);

  // Process the request using the handler, passing errors on to our error handler
  try {
    const response = await handler(deps)(req, log);
    res.status(response.status);
    if (response.headers) {
      res.set(response.headers);
    }
    res.send(response.body);
    responseStatus = response.status;
    authd = response.authd;
  } catch (_e) {
    const e = HttpError.from(_e);
    next(e);
    responseStatus = e.status;
    authd = null;
  }

  // After we've processed the request, publish stats about it
  try {
    const msg: ExampleDomainMessages = {
      key: MSG_KEYS.EXAMPLE_STATS_REQUESTS,
      data: {
        method: req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: req.path,
        authd,
        responseStatus,
        timestampMs: Date.now(),
      },
    }
    await deps.amqp.publish(msg);
  } catch (e) {
    deps.log.error(`Error publishing stats for endpoint '${req.method.toUpperCase()} ${req.path}': ${e.stack}`);
  }
}