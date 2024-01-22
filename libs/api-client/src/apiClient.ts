import {
  SimpleHttpClientInterface,
  SimpleHttpClientResponseInterface,
  SimpleHttpClientRequestConfig,
  SimpleLoggerInterface,
} from '@wymp/ts-simple-interfaces';
import { SimpleHttpClientFetch } from '@wymp/simple-http-client-fetch';

/** The API client config */
export type ApiConfig = Readonly<{
  /** The current application environment */
  env: string;
  /** The key/id for this API */
  key: string;
  /** The secret for this API */
  secret: string;
  /**
   * The base url for the API. Note that you can include the string `${env}` in the base url and it will be replaced by
   * the current value of `env`.
   */
  baseUrl: string;
}>;

/** The dependencies required by the API client */
export type ApiClientInputDeps<Name extends string> = {
  /** The api's config plus a unique name for the API. This name will become the output dependency's key */
  config: { name: Name } & ApiConfig;
  /** An optional SimpleHttpClient to use as the underlying client. If not provided, defaults to SimpleHttpClientFetch */
  simpleHttpClient?: SimpleHttpClientInterface;
  /** A logger */
  log: SimpleLoggerInterface;
};

/**
 * A Weenie function that returns a named API client.
 *
 * Since there may be multiple API clients in an application, using this function may not be as straightforward as
 * other weenie functions. Below is a typical example:
 *
 * ```ts
 * import { Weenie, apiClient, logger } from '@wymp/weenie-framework';
 * import { config } from './config';
 *
 * const deps = Weenie({ config })
 *  .and(logger)
 *  .and((d) => apiClient({
 *    log: d.log,
 *    config: {
 *      name: 'myApi' as const,
 *      env: d.config.env,
 *      ...d.config.myApi,
 *    },
 *  }))
 *  .done((d) => d);
 * ```
 */
export const apiClient = <Name extends string>(deps: ApiClientInputDeps<Name>) => ({
  [deps.config.name]: new ApiClient(deps),
});

/**
 * A simple API client that uses Basic Auth to authenticate with the API
 */
export class ApiClient implements SimpleHttpClientInterface {
  protected config: ApiConfig;
  protected httpClient: SimpleHttpClientInterface;
  protected authString: string;
  protected log: SimpleLoggerInterface;

  public constructor(deps: ApiClientInputDeps<string>) {
    this.config = deps.config;
    this.httpClient = deps.simpleHttpClient || new SimpleHttpClientFetch();
    this.authString = `Basic ` + Buffer.from(`${this.config.key}:${this.config.secret}`).toString('base64');
    this.log = deps.log;
  }

  /** {inheritDoc SimpleHttpClientInterface["request"]} */
  public request<D>(
    req: SimpleHttpClientRequestConfig,
    _log?: SimpleLoggerInterface,
  ): Promise<SimpleHttpClientResponseInterface<D>> {
    const log = _log || this.log;
    if (this.config.env === 'dev') {
      req.requireValidCerts = false;
    }
    req.baseURL = this.config.baseUrl;

    if (!req.method) {
      req.method = 'GET';
    }

    function has(header: string) {
      return Object.keys(req.headers!).find((k) => k.toLowerCase() === header) !== undefined;
    }

    if (!req.headers) {
      req.headers = {};
    }
    if (!has('authorization')) {
      req.headers['Authorization'] = this.authString;
    } else {
      req.headers['Authorization'] += `, ${this.authString}`;
    }
    if (!has('accept')) {
      req.headers['Accept'] = 'application/json';
    }
    if (req.method !== 'GET' && !has('content-type')) {
      req.headers['Content-Type'] = 'application/json';
    }

    log.info(`Making API call to ${req.method} ${req.baseURL}${req.url}`);
    log.debug(`Full request options:\n${JSON.stringify(req, null, 2)}`);

    return this.httpClient.request<D>(req, log);
  }
}
