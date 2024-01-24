import { MockSimpleLogger } from '@wymp/ts-simple-interfaces-testing';
import { WeeniePubSubAmqp, WeeniePublishingConfig } from '../src/rabbitmq';

class MockWeeniePubSubAmqp extends WeeniePubSubAmqp<unknown, unknown> {
  public readonly mockDriver = {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
  public override get driver() {
    return this.mockDriver as any;
  }
}

describe(`weenie-rabbitmq`, () => {
  let log: MockSimpleLogger;
  let amqp: MockWeeniePubSubAmqp;
  let publishingConfig: WeeniePublishingConfig;

  const setAmqp = () => {
    amqp = new MockWeeniePubSubAmqp(publishingConfig, {}, log, { amqpConnect: () => Promise.resolve({} as any) });
  };

  beforeEach(() => {
    log = new MockSimpleLogger();
    publishingConfig = { exchange: { name: 'test' } };
    setAmqp();
  });

  describe('publish', () => {
    test('should fill in expected underlying options', async () => {
      amqp.publish('foo.created.bar', { foo: 'bar' });
      expect(amqp.mockDriver.publish).toHaveBeenCalledWith(
        'test',
        { foo: 'bar' },
        { routingKey: 'foo.created.bar', persistent: true },
      );
    });

    test('should allow setting of persistent value', async () => {
      publishingConfig = { exchange: { name: 'test' }, persistentMessages: false };
      setAmqp();
      amqp.publish('foo.created.bar', { foo: 'bar' });
      expect(amqp.mockDriver.publish).toHaveBeenCalledWith(
        'test',
        { foo: 'bar' },
        { routingKey: 'foo.created.bar', persistent: false },
      );
    });
  });

  describe('subscribe', () => {
    test('should fill in expected underlying options', async () => {
      amqp.subscribe(['foo.*.bar'], async () => true, { queue: { name: 'test-queue' } });
      expect(amqp.mockDriver.subscribe).toHaveBeenCalledWith({ test: ['foo.*.bar'] }, expect.any(Function), {
        queue: { name: 'test-queue' },
        exchanges: { test: { name: 'test', type: 'topic' } },
      });
    });
  });
});
