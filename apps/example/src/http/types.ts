import { SimpleHttpServerRequestInterface, SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';

/**
 * A handler response object. This allows us to formalize the request-repsonse cycle a little more than what express
 * does.
 */
export type Response = {
  status: number;
  authd: boolean;
  headers?: Record<string, string>;
  body?: unknown;
};

/**
 * A Handler in this library is a slightly more standardized version of an express route handler.
 */
export type Handler = (
  req: SimpleHttpServerRequestInterface,
  log: SimpleLoggerInterface,
) => Promise<Response> | Response;

/** This is a function that takes a DI container and returns a handler */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HandlerGetter<D = any> = (deps: D) => Handler;
