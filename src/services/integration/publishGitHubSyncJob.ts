import amqp from 'amqplib';

import env from '../../env.js';
import { GITHUB_SYNC_QUEUE } from '../../constants/services/integration/githubSyncQueue.js';

const publishGitHubSyncJob = async (jobId: string): Promise<void> => {
  const connection = await amqp.connect(env.RABBITMQ_URL);

  try {
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue(GITHUB_SYNC_QUEUE, { durable: true });
    channel.sendToQueue(GITHUB_SYNC_QUEUE, Buffer.from(JSON.stringify({ jobId })), {
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

export { publishGitHubSyncJob };
