import { ExponentialBackoffRetry, PeriodicRetry, RetryTimeoutError } from '../src/retry';
import { MockSimpleLogger } from '@wymp/ts-simple-interfaces-testing';

describe('Retry', () => {
  const log = new MockSimpleLogger({ outputMessages: false });

  describe('ExponentialBackoffRetry', () => {
    test('should execute with exponential retry on fail', async () => {
      const retry = new ExponentialBackoffRetry({ initialWaitMs: 20 });
      let n = 0;
      const results: Array<[number, number]> = [];

      let last = Date.now();
      await retry.run(async () => {
        last += n;
        results.push([Date.now(), last]);
        // Exponential
        n = n === 0 ? 20 : n * 2;
        return n > 320;
      }, log);

      expect(results.length).toBe(6);
      const radius = 15;
      for (let i = 0; i < results.length; i++) {
        const [val, targ] = results[i];
        const msg = `Failed at round ${i + 1}. Actual is ${val}, target is ${targ}, +/-${radius}`;
        expect({
          msg,
          val: val >= targ - radius && val <= targ + radius,
        }).toEqual({
          msg,
          val: true,
        });
      }
    });

    test('should throw RetryTimeoutError if maxWaitMs is exceeded', async () => {
      const retry = new ExponentialBackoffRetry({ initialWaitMs: 20, maxRetryMs: 80 });
      const jobId = 'abcde12345';
      return retry
        .run(async () => false, log, jobId)
        .then(() => {
          throw new Error('Expected timeout error but resolved successfully instead');
        })
        .catch((e) => {
          expect(e).toBeInstanceOf(RetryTimeoutError);
          expect(e.obstructions[0]).toMatchObject({
            code: 'Job Failed',
            text: expect.any(String),
            data: {
              jobId,
              elapsedMs: expect.any(Number),
              numRetries: expect.any(Number),
            },
          });
        });
    });
  });

  describe('PeriodicRetry', () => {
    test('should execute with periodic retry on fail', async () => {
      const retry = new PeriodicRetry({ intervalMs: 20 });
      let n = 0;
      const results: Array<[number, number]> = [];

      let last = Date.now();
      await retry.run(async () => {
        results.push([Date.now(), last]);
        // Periodic
        last += 20;
        n++;
        return n === 6;
      }, log);

      expect(results.length).toBe(6);
      const radius = 15;
      for (let i = 0; i < results.length; i++) {
        const [val, targ] = results[i];
        const msg = `Failed at round ${i + 1}. Actual is ${val}, target is ${targ}, +/-${radius}`;
        expect({
          msg,
          val: val >= targ - radius && val <= targ + radius,
        }).toEqual({
          msg,
          val: true,
        });
      }
    });
  });
});
