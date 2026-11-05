import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';

import env from '../../env';
import awaitDomainPhase from './awaitDomainPhase';
import type { DomainReply } from '../../types/messaging/domain';

const requestDomainRead = async <T,>(
  owner: 'launch' | 'reputation',
  operation: string,
  parameters: Record<string, unknown>,
): Promise<T> => {
  const deadline = Date.now() + 10000;

  const connection = await awaitDomainPhase(
    amqp.connect(env.RABBITMQ_URL, { timeout: 2000 }),
    deadline,
  );

  connection.on('error', (): void => {});

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const channel = await awaitDomainPhase(connection.createConfirmChannel(), deadline);
    const queue = `lumenrise.${owner}.requests.v1`;
    const correlationId = randomUUID();

    const replyQueue = await awaitDomainPhase(
      channel.assertQueue('', { exclusive: true, autoDelete: true }),
      deadline,
    );

    channel.on('error', (): void => {});

    const result = new Promise<T>((resolve, reject): void => {
      timer = setTimeout(
        (): void => reject(new Error(`${owner} request timed out`)),
        Math.max(1, deadline - Date.now()),
      );

      connection.once('error', reject);

      channel.once('error', reject);

      connection.once('close', (): void => reject(new Error(`${owner} connection closed`)));

      channel.once('close', (): void => reject(new Error(`${owner} channel closed`)));

      void channel
        .consume(
          replyQueue.queue,
          (message): void => {
            if (!message || message.properties.correlationId !== correlationId) {
              return;
            }

            try {
              const reply = JSON.parse(message.content.toString()) as DomainReply;

              if (reply.ok !== true) {
                reject(new Error(reply.error ?? `${owner} processing failed`));

                return;
              }

              resolve(reply.result as T);
            } catch (error) {
              reject(error);
            }
          },
          { noAck: true },
        )
        .catch(reject);
    });

    // Handle a connection failure even if publication has not completed yet.
    void result.catch((): void => {});

    await awaitDomainPhase(channel.assertQueue(queue, { durable: true }), deadline);

    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ operation, parameters, deadline })), {
      persistent: true,
      expiration: '10000',
      contentType: 'application/json',
      correlationId,
      replyTo: replyQueue.queue,
    });

    await Promise.race([channel.waitForConfirms(), result]);

    return await result;
  } finally {
    clearTimeout(timer);

    await awaitDomainPhase(connection.close(), Date.now() + 1000).catch((): void => {});
  }
};

export default requestDomainRead;
