import amqp from 'amqplib';

import env from '../../env';
import log from '../../logger';

const publishReputationJob = async (queue: string, jobId: string): Promise<void> => {
  const connection = await amqp.connect(env.RABBITMQ_URL, { timeout: 2_000 });

  log.info({ queue }, 'API RabbitMQ publisher connected');

  try {
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ jobId })), {
      persistent: true,
      contentType: 'application/json',
      messageId: jobId,
    });
    await channel.waitForConfirms();
    await channel.close();
  } finally {
    await connection.close();

    log.info({ queue }, 'API RabbitMQ publisher disconnected');
  }
};

export { publishReputationJob };
