import { MockSimpleLogger } from '@wymp/ts-simple-interfaces-testing';
import { WeeniePubSubAmqp, WeeniePublishingConfig } from '../src/rabbitmq';

type GenericMsg = { key: string } & Record<string, unknown>;

class MockWeeniePubSubAmqp extends WeeniePubSubAmqp<GenericMsg, GenericMsg> {
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
      const msg = { key: 'foo.created.bar', foo: 'bar' };
      amqp.publish(msg);
      expect(amqp.mockDriver.publish).toHaveBeenCalledWith('test', msg, {
        routingKey: 'foo.created.bar',
        persistent: true,
      });
    });

    test('should allow setting of persistent value', async () => {
      publishingConfig = { exchange: { name: 'test' }, persistentMessages: false };
      setAmqp();
      const msg = { key: 'foo.created.bar', foo: 'bar' };
      amqp.publish(msg);
      expect(amqp.mockDriver.publish).toHaveBeenCalledWith('test', msg, {
        routingKey: 'foo.created.bar',
        persistent: false,
      });
    });
  });

  describe('subscribe', () => {
    test('should fill in expected underlying options', async () => {
      amqp.subscribe(['foo.*.bar'], 'test-queue', async () => true);
      expect(amqp.mockDriver.subscribe).toHaveBeenCalledWith({ test: ['foo.*.bar'] }, expect.any(Function), {
        queue: { name: 'test-queue' },
        exchanges: { test: { name: 'test', type: 'topic' } },
      });
    });
  });
});
