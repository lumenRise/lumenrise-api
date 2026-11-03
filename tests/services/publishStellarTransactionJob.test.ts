import amqp from 'amqplib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import publishStellarTransactionJob from '../../src/services/launch/publishStellarTransactionJob';

vi.mock('../../src/env', () => ({ default: { RABBITMQ_URL: 'amqp://shared-broker' } }));

vi.mock('amqplib', () => ({ default: { connect: vi.fn() } }));

vi.mock('../../src/logger', () => ({ default: { info: vi.fn() } }));

const channel = {
  assertQueue: vi.fn(),
  sendToQueue: vi.fn(),
  waitForConfirms: vi.fn(),
  close: vi.fn(),
};

const connection = { createConfirmChannel: vi.fn(), close: vi.fn() };

describe('launch queue on the shared RabbitMQ broker', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(amqp.connect).mockResolvedValue(connection as never);

    connection.createConfirmChannel.mockResolvedValue(channel);
  });

  it('uses the configured shared broker and a separate durable persistent launch queue', async () => {
    await publishStellarTransactionJob('job-id', 'testnet');

    expect(amqp.connect).toHaveBeenCalledWith('amqp://shared-broker', { timeout: 2000 });

    expect(channel.assertQueue).toHaveBeenCalledWith('launch.stellar.transactions.testnet', {
      durable: true,
    });

    const [queue, payload, options] = channel.sendToQueue.mock.calls[0]!;

    expect(queue).toBe('launch.stellar.transactions.testnet');

    expect(JSON.parse(payload.toString())).toEqual({ jobId: 'job-id' });

    expect(options).toMatchObject({ persistent: true, messageId: 'job-id' });

    expect(channel.waitForConfirms).toHaveBeenCalledOnce();

    expect(connection.close).toHaveBeenCalledOnce();
  });

  it('propagates failed confirmation and still closes the connection', async () => {
    channel.waitForConfirms.mockRejectedValue(new Error('not confirmed'));

    await expect(publishStellarTransactionJob('job-id', 'testnet')).rejects.toThrow(
      'not confirmed',
    );

    expect(connection.close).toHaveBeenCalledOnce();
  });
});
