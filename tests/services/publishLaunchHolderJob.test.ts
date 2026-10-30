import amqp from 'amqplib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import publishLaunchHolderJob from '../../src/services/launch/publishLaunchHolderJob';

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
    await publishLaunchHolderJob('job-id', 'testnet');
    expect(amqp.connect).toHaveBeenCalledWith('amqp://shared-broker', { timeout: 2000 });
    expect(channel.assertQueue).toHaveBeenCalledWith('lumenrise.launch.holder-refresh.v2.testnet', {
      durable: true,
    });
    const [queue, payload, options] = channel.sendToQueue.mock.calls[0]!;
    expect(queue).toBe('lumenrise.launch.holder-refresh.v2.testnet');
    expect(JSON.parse(payload.toString())).toEqual({ jobId: 'job-id' });
    expect(options).toMatchObject({ persistent: true, messageId: 'job-id' });
    expect(channel.waitForConfirms).toHaveBeenCalledOnce();
    expect(connection.close).toHaveBeenCalledOnce();
  });

  it('propagates failed confirmation and still closes the connection', async () => {
    channel.waitForConfirms.mockRejectedValue(new Error('not confirmed'));
    await expect(publishLaunchHolderJob('job-id', 'testnet')).rejects.toThrow('not confirmed');
    expect(connection.close).toHaveBeenCalledOnce();
  });
});
