import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const runDomainWorkerFixture = async (): Promise<void> => {
  const owner = process.argv[2];
  const repository = resolve(process.cwd(), `../lumenrise-${owner}`);
  const require = createRequire(`${repository}/package.json`);
  const mongoose = require('mongoose');

  const { default: startDomainWorker } = await import(
    `${repository}/src/services/messaging/startDomainWorker.ts`
  );

  const handlerName = owner === 'launch' ? 'handleLaunchRequest' : 'handleReputationRequest';

  const { default: handler } = await import(
    `${repository}/src/services/messaging/${handlerName}.ts`
  );

  await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, { dbName: process.env.DB_NAME });

  const worker = await startDomainWorker(owner, handler, (error: unknown): void => {
    process.stderr.write(String(error) + '\n');
  });

  let cleanup: { stop: () => Promise<void> } | null = null;
  let broker: { close: () => Promise<void> } | null = null;
  let resumeCleanup: (() => Promise<void>) | null = null;

  if (owner === 'reputation') {
    const { default: startCleanup } = await import(
      `${repository}/src/workers/connectionCleanup.ts`
    );

    broker = await require('amqplib').connect(process.env.RABBITMQ_URL);

    resumeCleanup = async (): Promise<void> => {
      cleanup = await startCleanup(broker);
    };

    await resumeCleanup();
  }

  process.send?.('ready');

  process.on('message', async (command: unknown): Promise<void> => {
    if (command === 'pauseCleanup') {
      await cleanup?.stop();

      cleanup = null;

      process.send?.('cleanup-paused');

      return;
    }

    if (command === 'resumeCleanup') {
      await resumeCleanup?.();

      process.send?.('cleanup-resumed');

      return;
    }

    await cleanup?.stop();

    await broker?.close();

    await worker.stop();

    await mongoose.disconnect();

    process.exit(0);
  });
};

void runDomainWorkerFixture().catch((error: unknown): void => {
  process.stderr.write(String(error));

  process.exit(1);
});
