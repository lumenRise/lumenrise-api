import amqp from 'amqplib';

import env from '../../env';
import { LAUNCH_HOLDER_QUEUE } from '../../constants/launch/holderQueue';
import type { StellarNetwork } from '../../types/network/configuration';

const publishLaunchHolderJob = async (jobId: string, network: StellarNetwork): Promise<void> => {
  const queue = `${LAUNCH_HOLDER_QUEUE}.${network}`;
  const connection = await amqp.connect(env.RABBITMQ_URL, { timeout: 2000 });

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
  }
};

export default publishLaunchHolderJob;
