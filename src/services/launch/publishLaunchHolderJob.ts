import amqp from 'amqplib';

import env from '../../env';
import { LAUNCH_HOLDER_QUEUE } from '../../constants/launch/holderQueue';

const publishLaunchHolderJob = async (jobId: string): Promise<void> => {
  const connection = await amqp.connect(env.RABBITMQ_URL, { timeout: 2000 });

  try {
    const channel = await connection.createConfirmChannel();

    await channel.assertQueue(LAUNCH_HOLDER_QUEUE, { durable: true });

    channel.sendToQueue(LAUNCH_HOLDER_QUEUE, Buffer.from(JSON.stringify({ jobId })), {
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
