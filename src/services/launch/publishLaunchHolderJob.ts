import amqp from 'amqplib';

import env from '../../env';
import log from '../../logger';
import type { StellarNetwork } from '../../types/network/configuration';
import { LAUNCH_HOLDER_QUEUE } from '../../constants/launch/holderQueue';

const publishLaunchHolderJob = async (jobId: string, network: StellarNetwork): Promise<void> => {
  const queue = `${LAUNCH_HOLDER_QUEUE}.${network}`;
  const connection = await amqp.connect(env.RABBITMQ_URL, { timeout: 2000 });

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

export default publishLaunchHolderJob;
