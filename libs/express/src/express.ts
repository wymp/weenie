import { HttpError } from '@wymp/http-errors';
import { logger } from '@wymp/http-utils';
import { SimpleLoggerInterface, SimpleHttpServerErrorHandler, SimpleLogLevels } from '@wymp/ts-simple-interfaces';
import { SimpleHttpServerExpress, Parsers } from '@wymp/simple-http-server-express';

export { Parsers };

export type WeenieExpressInputDeps = {
  config: {
    http: {
      listener: {
        port: number;
        host?: string;
      };
      logIncomingReqs?: boolean;
      parseJson?: boolean;
      jsonMimeTypes?: Array<string>;
      handleErrors?: boolean;
      handleFallthrough?: boolean;
      listenOnReady?: boolean;
      mask500Errors?: boolean | string;
      errOnBlankPost?: boolean;
    };
  };
  log: SimpleLoggerInterface;
  svc?: {
    whenReady: Promise<void>;
    onShutdown: (task: () => Promise<void>) => void;
  };
};

export function express(d: WeenieExpressInputDeps) {
  const config = d.config.http;
  const http = new SimpleHttpServerExpress({ listeners: [[config.listener.port, config.listener.host]] }, d.log);

  // Get final options (null means "use default")
  const opts = {
    logIncoming: config.logIncomingReqs ?? true,
    parseJson: config.parseJson ?? true,
    jsonMimeTypes: config.jsonMimeTypes ?? ['application/json', 'application/json-rpc'],
    handleErrors: config.handleErrors ?? true,
    handleFallthrough: config.handleFallthrough ?? true,
    listenOnReady: config.listenOnReady ?? true,
    mask500Errors: config.mask500Errors ?? true,
    errOnBlankPost: config.errOnBlankPost ?? true,
  };

  // Log every incoming request
  if (opts.logIncoming) {
    http.use((req, res, next) => {
      const log = logger(d.log, req, res);
      log.info(`Request received`);
      next();
    });
  }

  // Parse incoming bodies (JSON only)
  if (opts.parseJson) {
    http.use((req, res, next) => {
      const parse = Parsers.json({ type: opts.jsonMimeTypes });
      const _next = (e?: Error) => {
        if (!e) {
          next();
        } else {
          next(new HttpError(400, `You've passed bad JSON input: ${e.message}`, { subcode: `INPUT.BAD-JSON` }));
        }
      };
      parse(req, res, _next);
    });
  }

  // If it's supposed to have a body and the body isn't set, make sure the user passed the right
  // content-type header
  if (opts.errOnBlankPost) {
    http.use((req, res, next) => {
      if (
        ['post', 'patch', 'put'].includes(req.method.toLowerCase()) &&
        (!req.body || Object.keys(req.body).length === 0)
      ) {
        const contentType = req.get('content-type');
        next(
          new HttpError(
            400,
            'The body of your request is blank or does not appear to have been parsed correctly. ' +
              'Please be sure to pass a content-type header specifying the content type of your body. ' +
              (contentType ? `You passed 'Content-Type: ${contentType}'.` : `You did not pass a content-type header.`),
          ),
        );
      } else {
        next();
      }
    });
  }

  // If we've explicitly requested the next features and we can't offer them, we need to throw an
  // error
  if (!d.svc && (config.handleErrors === true || config.handleFallthrough === true || config.listenOnReady === true)) {
    throw new HttpError(
      500,
      `You've requested error handling, fallthrough handling, or 'listen-on-ready', but you ` +
        `haven't provided a service manager that would enable this functionality. Please either ` +
        `change your config or add 'Weenie.serviceManager' to your dependencies to facilitate ` +
        `this. If you add 'Weenie.serviceManager', please note that you must call ` +
        `'svc.initialized(true)' when your service is fully connected.`,
    );
  }

  // If svc manager available, add auto-listening on initialization
  let httpServers: ReturnType<SimpleHttpServerExpress['listen']> | null = null;
  if (d.svc && (opts.handleErrors || opts.handleFallthrough || opts.listenOnReady)) {
    d.svc.whenReady.then(() => {
      // Add fallthrough handling, if requested
      // Note that we support a "response" object. This allows us to foster the habit of passing
      // responses down through optional filters and handlers after the main handler.
      if (opts.handleFallthrough) {
        http.use((req, res, next) => {
          // If we've set a "response" object in the locals, use it
          if (res.locals.response) {
            const r = res.locals.response;
            if (r.headers) {
              for (const h in r.headers) {
                res.set(h, r.headers[h]);
              }
            }
            res.status(r.status || 200).send(r.body);
          } else {
            // Otherwise, it's an error
            const log = logger(d.log, req, res);
            log.notice(`Request not fulfilled. Returning 400 error.`);
            next(
              new HttpError(
                400,
                `Endpoint '${req.method} ${req.path}' does not exist on this server. Please read the ` +
                  `docs and try again.`,
                { subcode: `ENDPOINT-NOT-FOUND.${req.method}:${req.path}` },
              ),
            );
          }
        });
      }

      // Add standard error handling, if requested
      if (opts.handleErrors) {
        d.log.debug(`Registering standard error handler`);
        http.catch(StandardErrorHandler(d.log, opts));
      }

      // Start listening, saving the returned listeners
      if (opts.listenOnReady) {
        httpServers = http.listen();

        // Shut down http servers on service shutdown
        d.svc?.onShutdown(async () => {
          await Promise.all(
            httpServers?.map(
              (s) =>
                new Promise<void>((res, rej) => {
                  s.close((e?: Error | undefined) => {
                    if (e) {
                      rej(e);
                    } else {
                      res();
                    }
                  });
                }),
            ) ?? [],
          );
        });
      }
    });
  }

  return {
    http,
    // 2021-04-07: This must be a function because if not, the variable reference gets lost somewhere
    getHttpServers: () => httpServers,
  };
}

export const StandardErrorHandler = (
  _log: SimpleLoggerInterface,
  opts: { mask500Errors: boolean | string },
): SimpleHttpServerErrorHandler => {
  return (originalError, req, res, next) => {
    const log = logger(_log, req, res);

    // Save original in case it's a JSON-RPC request
    const e = HttpError.from(originalError);

    // Mask 500 errors, if requested
    const msg =
      opts.mask500Errors && e.status >= 500
        ? typeof opts.mask500Errors === 'string'
          ? opts.mask500Errors
          : `Sorry, something went wrong on our end :(. Please try again.`
        : e.message;

    const level = <keyof SimpleLogLevels>(e.logLevel ?? 'error');
    log[level](
      `Exception thrown: ${e.name} (${e.status}${e.subcode ? `: ${e.subcode}` : ''}) ${e.message}` +
        (e.obstructions?.length ? ` Obstructions:\n${JSON.stringify(e.obstructions, null, 2)}` : ''),
    );
    log[level]('Stack trace: ' + e.stack);

    // Prepare error envelope
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errorResponse: any = {};
    const accept = res.locals.accept || req.get('accept') || null;
    if (accept && accept.match(/application\/json-rpc/)) {
      res.set('Content-Type', 'application/json-rpc');

      // If using JSON-RPC, pack the error into a JSON-RPC error container
      if (typeof originalError.serialize === 'function') {
        // If we have a serialize method, then use it (from jsonrpc-lite package)
        errorResponse = originalError.serialize();
        if (typeof errorResponse !== 'string') {
          errorResponse = JSON.stringify(errorResponse);
        }
      } else {
        // Warn if request id not set in res.locals
        if (!res.locals.jsonrpcRequestId) {
          log.warning(
            `Handling a JSON-RPC error, but no request id found. Please be sure to set the ` +
              `res.locals.jsonrpcRequestId variable to the request id at the beginning of the ` +
              `request.`,
          );
        }

        // Otherwise, create a new error response
        errorResponse = JSON.stringify({
          jsonrpc: '2.0' as const,
          id: res.locals.jsonrpcRequestId || null,
          error: {
            code: e.status ? e.status : 500,
            message: msg,
            data: {
              obstructions: e.obstructions,
            },
          },
        });
      }
    } else {
      // Only using json for now
      res.set('Content-Type', 'application/json');

      // If not JSON-RPC, pack the error response into a standard error object
      errorResponse = {
        t: 'error',
        error: e,
      };

      // Serialize it
      errorResponse = JSON.stringify(errorResponse);
    }

    // Add any headers that might have been specified with the error
    for (const k in e.headers) {
      // Skip certain headers
      if (k.toLowerCase() === 'content-type') {
        continue;
      }
      res.set(k, e.headers[k]);
    }

    // Send it off
    res.status(e.status).send(errorResponse);
  };
};
