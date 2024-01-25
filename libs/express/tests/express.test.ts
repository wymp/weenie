import { SimpleHttpClientFetch } from '@wymp/simple-http-client-fetch';
import { MockSimpleLogger } from '@wymp/ts-simple-interfaces-testing';
import { Weenie } from '@wymp/weenie-base';
import { serviceManager, type WeenieServiceManagerInputDeps } from '@wymp/weenie-service-manager';
import { express, type WeenieExpressInputDeps } from '../src/express';

type Config = {
  svc: WeenieServiceManagerInputDeps['config']['svc'];
  http: WeenieExpressInputDeps['config']['http'];
};

const port = 5533;

const getDeps = (httpConfig?: Partial<Config['http']>) => {
  const config = {
    svc: {},
    http: {
      listener: {
        port,
      },
      ...httpConfig,
    },
  };

  return Weenie({ config })
    .and(() => ({ log: new MockSimpleLogger({ outputMessages: false }) }))
    .and(() => {
      const client = new SimpleHttpClientFetch();
      return {
        fetch: {
          get: (url?: string) =>
            client.request<any>({ url: `http://localhost:${config.http.listener.port}${url ?? '/'}` }),
          post: (url?: string, data?: unknown, headers: any = { 'Content-Type': 'application/json' }) =>
            client.request<any>({
              url: `http://localhost:${config.http.listener.port}${url ?? '/'}`,
              method: 'POST',
              data,
              headers,
            }),
          patch: (url?: string, data?: unknown, headers: any = { 'Content-Type': 'application/json' }) =>
            client.request<any>({
              url: `http://localhost:${config.http.listener.port}${url ?? '/'}`,
              method: 'PATCH',
              data,
              headers,
            }),
          put: (url?: string, data?: unknown, headers: any = { 'Content-Type': 'application/json' }) =>
            client.request<any>({
              url: `http://localhost:${config.http.listener.port}${url ?? '/'}`,
              method: 'PUT',
              data,
              headers,
            }),
        },
      };
    })
    .and((d) =>
      // Stub out the process so that we don't actually shut down on shutdown
      serviceManager(d, { on: jest.fn(), exit: jest.fn() }),
    )
    .and(express)
    .done((d) => d);
};
type Deps = ReturnType<typeof getDeps>;

describe(`Weenie Express`, () => {
  let deps: Deps;

  afterEach(async () => {
    if (deps) {
      await deps.svc.shutdown();
    }
  });

  describe(`logIncomingReqs`, () => {
    test('Should log incoming requests by default', async () => {
      deps = getDeps();
      deps.http.get('/', (req, res) => res.send('ok'));
      deps.svc.declareReady();
      await new Promise<void>((res) => setTimeout(res, 10));
      await deps.fetch.get();
      expect(deps.log.match(/GET \//)).toBe(true);
    });
    test('Should log incoming requests when configured to do so', async () => {
      deps = getDeps({ logIncomingReqs: true });
      deps.http.get('/', (req, res) => res.send('ok'));
      deps.svc.declareReady();
      await new Promise<void>((res) => setTimeout(res, 10));
      await deps.fetch.get();
      expect(deps.log.match(/GET \//)).toBe(true);
    });
    test('Should NOT log incoming requests when NOT configured to do so', async () => {
      deps = getDeps({ logIncomingReqs: false });
      deps.http.get('/', (req, res) => res.send('ok'));
      deps.svc.declareReady();
      await new Promise<void>((res) => setTimeout(res, 10));
      await deps.fetch.get();
      expect(deps.log.match(/GET \//)).toBe(false);
    });
  });

  describe(`parseJson`, () => {
    test.each(['post', 'patch', 'put'] as const)('Should parse JSON by default (%s)', async (method) => {
      deps = getDeps();
      deps.http[method]('/', (req, res) => res.send(req.body));
      deps.svc.declareReady();
      await new Promise<void>((res) => setTimeout(res, 10));
      const response = await deps.fetch[method]('/', { a: 1 });
      expect(response.data).toEqual({ a: 1 });
    });
    test.each(['post', 'patch', 'put'] as const)('Should parse JSON when configured to do so (%s)', async (method) => {
      deps = getDeps({ parseJson: true });
      deps.http[method]('/', (req, res) => res.send(req.body));
      deps.svc.declareReady();
      await new Promise<void>((res) => setTimeout(res, 10));
      const response = await deps.fetch[method]('/', { a: 1 });
      expect(response.data).toEqual({ a: 1 });
    });
    test.each(['post', 'patch', 'put'] as const)(
      'Should NOT parse JSON when NOT configured to do so (%s)',
      async (method) => {
        deps = getDeps({ parseJson: false, errOnBlankPost: false });
        deps.http[method]('/', (req, res) => res.send(req.body));
        deps.svc.declareReady();
        await new Promise<void>((res) => setTimeout(res, 10));
        const response = await deps.fetch[method]('/', { a: 1 });
        expect(response.data).toBeUndefined();
      },
    );
  });

  describe(`jsonMimeTypes`, () => {
    test('Should parse JSON for configured mime types', async () => {
      deps = getDeps({ jsonMimeTypes: ['my/type'], errOnBlankPost: false });
      deps.http.post('/', (req, res) => res.send(req.body));
      deps.svc.declareReady();
      await new Promise<void>((res) => setTimeout(res, 10));
      const response = await deps.fetch.post('/', { a: 1 }, { 'Content-Type': 'my/type' });
      expect(response.data).toEqual({ a: 1 });
    });
  });

  describe(`handleErrors`, () => {
    test.todo('Should handle errors by default');
    test.todo('Should handle errors when configured to do so');
    test.todo('Should NOT handle errors when NOT configured to do so');
    test.todo('Should format errors as HttpErrors when accept header is not application/json-rpc');
    test.todo('Should format errors as JSON-RPC Errors when accept header is application/json-rpc');
  });

  describe(`handleFallthrough`, () => {
    test.todo('Should handle fallthrough by default');
    test.todo('Should handle fallthrough when configured to do so');
    test.todo('Should NOT handle fallthrough when NOT configured to do so');
  });

  describe(`listenOnReady`, () => {
    test.todo('Should listen on ready by default');
    test.todo('Should listen on ready when configured to do so');
    test.todo('Should NOT listen on ready when NOT configured to do so');
  });

  describe(`mask500Errors`, () => {
    test.todo('Should mask 500 errors by default');
    test.todo('Should mask 500 errors when configured to do so');
    test.todo('Should NOT mask 500 errors when NOT configured to do so');
    test.todo('Should mask 500 errors with custom string when passed');
  });

  describe(`errOnBlankPost`, () => {
    test.todo('Should error on blank post by default');
    test.todo('Should error on blank post when configured to do so');
    test.todo('Should NOT error on blank post when NOT configured to do so');
  });
});
