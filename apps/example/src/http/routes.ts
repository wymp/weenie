//
// NOTE: THIS MODULE IS AN EXAMPLE AND THE FUNCTIONALITY IT CONTAINS IS NOT INTENDED TO BE PRODUCTION-READY.
//

import { type Deps } from '../deps/prod';
import { Handlers } from './handlers';
import { collectStats } from './utils';

type HandlerDeps = Parameters<Handlers[keyof Handlers]>[0];
type ModuleDeps = HandlerDeps & Pick<Deps, 'amqp' | 'http' | 'log'>;

/**
 * Connects the routes for the `example` domain to the HTTP server.
 *
 * @sideEffects
 */
export const connectRoutes = (deps: ModuleDeps) => {
  deps.http.post('/api/v1/users/register', collectStats(deps, Handlers.register));
  deps.http.post('/api/v1/users/login', collectStats(deps, Handlers.login));
  deps.http.post('/api/v1/users/logout', collectStats(deps, Handlers.logout));

  deps.http.get('/api/v1/users', collectStats(deps, Handlers.getAllUsers));
  deps.http.get('/api/v1/users/:id', collectStats(deps, Handlers.getUser));

  deps.http.get('/api/v1/stats/requests', collectStats(deps, Handlers.getRequestStats));
};
