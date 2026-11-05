import amqp from 'amqplib';
import { EventEmitter } from 'node:events';
import type { ConsumeMessage } from 'amqplib';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import requestDomainRead from '../../src/services/messaging/requestDomainRead';

vi.mock('amqplib', () => ({ default: { connect: vi.fn() } }));

vi.mock('../../src/env', () => ({ default: { RABBITMQ_URL: 'amqp://broker.example' } }));

const channel = Object.assign(new EventEmitter(), {
  assertQueue: vi.fn(),
  consume: vi.fn(),
  sendToQueue: vi.fn(),
  waitForConfirms: vi.fn(),
});

const connection = Object.assign(new EventEmitter(), {
  createConfirmChannel: vi.fn(),
  close: vi.fn(),
});

let replyHandler: ((message: ConsumeMessage) => void) | undefined;

beforeEach((): void => {
  vi.resetAllMocks();

  channel.removeAllListeners();

  connection.removeAllListeners();

  replyHandler = undefined;

  vi.mocked(amqp.connect).mockResolvedValue(connection as never);

  connection.createConfirmChannel.mockResolvedValue(channel);

  connection.close.mockResolvedValue(undefined);

  channel.assertQueue.mockResolvedValue({ queue: 'reply-queue' });

  channel.waitForConfirms.mockResolvedValue(undefined);

  channel.consume.mockImplementation(async (_queue, handler): Promise<object> => {
    replyHandler = handler;

    return { consumerTag: 'test-consumer' };
  });
});

afterEach((): void => {
  vi.useRealTimers();
});

it('returns the processed result only after the correlated worker reply', async (): Promise<void> => {
  channel.sendToQueue.mockImplementation((_queue, _body, properties): boolean => {
    replyHandler?.({
      properties: { correlationId: 'unrelated' },
      content: Buffer.from(JSON.stringify({ ok: true, result: 'incorrect' })),
    } as ConsumeMessage);

    replyHandler?.({
      properties: { correlationId: properties.correlationId },
      content: Buffer.from(JSON.stringify({ ok: true, result: { total: '10000000' } })),
    } as ConsumeMessage);

    return true;
  });

  await expect(requestDomainRead('launch', 'stats.market', {})).resolves.toEqual({
    total: '10000000',
  });

  expect(connection.close).toHaveBeenCalledOnce();

  expect(channel.sendToQueue).toHaveBeenCalledWith(
    'lumenrise.launch.requests.v1',
    expect.any(Buffer),
    expect.objectContaining({ persistent: true, replyTo: 'reply-queue' }),
  );
});

it('propagates worker rejection instead of treating publication as completion', async (): Promise<void> => {
  channel.sendToQueue.mockImplementation((_queue, _body, properties): boolean => {
    replyHandler?.({
      properties: { correlationId: properties.correlationId },
      content: Buffer.from(JSON.stringify({ ok: false, error: 'Scan not found' })),
    } as ConsumeMessage);

    return true;
  });

  await expect(requestDomainRead('reputation', 'stellar.score', {})).rejects.toThrow(
    'Scan not found',
  );

  expect(connection.close).toHaveBeenCalledOnce();
});

it('bounds unavailable workers and stalled publisher confirmations', async (): Promise<void> => {
  vi.useFakeTimers();

  channel.waitForConfirms.mockReturnValue(new Promise<void>((): void => {}));

  const request = requestDomainRead('launch', 'stats.market', {});
  const rejected = expect(request).rejects.toThrow('timed out');

  await vi.advanceTimersByTimeAsync(10001);

  await rejected;

  expect(connection.close).toHaveBeenCalledOnce();
});
