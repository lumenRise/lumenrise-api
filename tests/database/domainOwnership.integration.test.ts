import request from 'supertest';
import { randomUUID } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { fork, type ChildProcess } from 'node:child_process';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import Launch from '../../src/models/Launch';
import Identity from '../../src/models/Identity';
import LaunchTrade from '../../src/models/LaunchTrade';
import XDataSnapshot from '../../src/models/XDataSnapshot';
import StellarAccount from '../../src/models/StellarAccount';
import ExternalAccount from '../../src/models/ExternalAccount';
import ReputationSnapshot from '../../src/models/ReputationSnapshot';
import StellarActivityScan from '../../src/models/StellarActivityScan';
import ReputationCleanupJob from '../../src/models/ReputationCleanupJob';
import requestDomainRead from '../../src/services/messaging/requestDomainRead';
import SorobanTransactionEvidence from '../../src/models/SorobanTransactionEvidence';
import * as reputationPublisher from '../../src/services/integration/publishReputationJob';

const identity = new Types.ObjectId();
const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const name = `ownership_${randomUUID().replaceAll('-', '')}`;
const workers: ChildProcess[] = [];

vi.mock('../../src/middleware/requireSession', () => ({
  default: (req: object, _res: unknown, next: () => void): void => {
    Object.assign(req, { auth: { identityId: identity } });

    next();
  },
}));

describe.runIf(Boolean(process.env.LUMENRISE_TEST_AMQP_URL && process.env.LUMENRISE_TEST_DB_URI))(
  'unchanged HTTP contracts across real domain workers',
  (): void => {
    beforeAll(async (): Promise<void> => {
      await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, { dbName: name });

      await ReputationCleanupJob.createIndexes();

      await Identity.collection.insertOne({
        _id: identity,
        status: 'active',
        deletedAt: null,
        name: 'Example User',
      } as never);

      await StellarAccount.collection.insertOne({
        identity,
        address,
        isPrimary: true,
        disconnectedAt: null,
      } as never);

      await Launch.collection.insertOne({
        chain: 'stellar',
        network: 'testnet',
        contractId: 'example-contract',
        slug: 'example-project',
        metadata: { name: 'Example Project', symbol: 'EX', logo: '/image.png' },
        createdAt: new Date('2026-11-01T00:00:00Z'),
      } as never);

      await LaunchTrade.collection.insertOne({
        chain: 'stellar',
        network: 'testnet',
        contractId: 'example-contract',
        transactionHash: 'a'.repeat(64),
        operationIndex: 0,
        transactionIndex: 1,
        tradedAt: new Date('2026-11-01T10:00:00Z'),
        ledger: 100,
        trader: address,
        side: 'buy',
        assetAmount: '10000000',
        grossAmount: '10000000',
        executionPrice: '10000000',
      } as never);

      const scan = await StellarActivityScan.create({
        network: 'testnet',
        identity,
        address,
        sourceUrl: 'https://horizon.example',
        status: 'completed',
        active: false,
        completedAt: new Date('2026-11-01T12:00:00Z'),
        summary: {
          scope: 'scanned_pages',
          activeDayCount: 45,
          distinctTransactionCount: 150,
          initiatedOperationCount: 150,
          operationTypeCounts: { payment: 100, invoke_host_function: 50 },
        },
      });

      await SorobanTransactionEvidence.collection.insertOne({
        scan: scan._id,
        network: 'testnet',
        address,
        transactionHash: 'b'.repeat(64),
        operationIds: ['1'],
        initiatedOperation: true,
        observedAt: new Date(),
        rpcStatus: 'not_found',
        attempts: 3,
        ledger: null,
        returnValueXdr: null,
        envelopeXdr: null,
        events: [],
      } as never);

      for (const owner of ['launch', 'reputation']) {
        const child = fork('tests/helpers/runDomainWorkerFixture.ts', [owner], {
          execArgv: ['--import', 'tsx'],
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DB_NAME: name,
            RABBITMQ_URL: process.env.LUMENRISE_TEST_AMQP_URL!,
          },
          stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
        });

        workers.push(child);

        await new Promise<void>((resolve, reject): void => {
          child.once('message', (): void => resolve());

          child.once('error', reject);

          child.once('exit', (code): void => {
            if (code) {
              reject(new Error(`Worker exited with ${code}`));
            }
          });
        });
      }
    }, 20000);

    afterAll(async (): Promise<void> => {
      for (const child of workers) {
        const closed = new Promise<void>((resolve): void => {
          child.once('exit', (): void => resolve());
        });

        child.send('stop');

        await closed;
      }

      await mongoose.connection.dropDatabase();

      await mongoose.disconnect();
    }, 20000);

    it('preserves market totals, precision, participant counts and user counts', async (): Promise<void> => {
      const response = await request(app).get('/v1/stats/market');

      expect(response.status).toBe(200);

      expect(response.body.result).toMatchObject({
        currency: 'USDC',
        multiplier: 2,
        userCountScope: 'global_active_identities',
      });

      expect(
        response.body.result.combined.find(
          (group: { network: string }): boolean => group.network === 'testnet',
        ),
      ).toMatchObject({
        launchCount: 1,
        participantCount: 1,
        userCount: 1,
        volumeTotal: { amount: '2', tradeCount: 1, buyCount: 1, sellCount: 0 },
      });

      const volume = await requestDomainRead('launch', 'stats.volume', {
        network: 'testnet',
        now: '2026-11-01T12:00:00.000Z',
      });

      expect(volume).toMatchObject({
        network: 'testnet',
        volumeTotal: { amount: '2' },
        volume24h: { amount: '2' },
      });
    });

    it('preserves six chart series and UTC bucket boundaries', async (): Promise<void> => {
      const result = await requestDomainRead<{
        chains: unknown[];
        combined: Array<{ network: string; items: Array<{ volume: string; tradeCount: number }> }>;
      }>('launch', 'stats.chart', {
        now: '2026-11-01T12:00:00.000Z',
        query: {
          from: '2026-11-01T00:00:00.000Z',
          to: '2026-11-01T12:00:00.000Z',
          interval: 'day',
        },
      });

      expect(result.chains).toHaveLength(4);

      expect(result.combined).toHaveLength(2);

      expect(
        result.combined.find((group): boolean => group.network === 'testnet')?.items[0],
      ).toMatchObject({ volume: '2', tradeCount: 1 });
    });

    it('preserves score and Soroban evidence HTTP payloads without new pending responses', async (): Promise<void> => {
      const score = await request(app).get(`/v1/stellar/accounts/${address}/activity-score`);

      expect(score.status).toBe(200);

      expect(score.body.result).toMatchObject({
        address,
        score: expect.any(Number),
        source: 'horizon',
        ownershipVerified: false,
        algorithmVersion: 'stellar-activity-v1',
      });

      const evidence = await request(app).get(`/v1/stellar/accounts/${address}/soroban-evidence`);

      expect(evidence.status).toBe(200);

      expect(evidence.body.result).toMatchObject({
        address,
        coverage: { discoveredTransactions: 1, rpcNotFound: 1 },
        items: [{ transactionHash: 'b'.repeat(64), envelope: null, events: [] }],
      });
    });

    it('rejects cross-identity evidence requests inside the worker', async (): Promise<void> => {
      const scan = await StellarActivityScan.findOne({ identity });

      await expect(
        requestDomainRead('reputation', 'stellar.score', {
          scanId: scan!._id.toString(),
          identity: new Types.ObjectId().toString(),
          network: 'testnet',
        }),
      ).rejects.toThrow('not found');
    });

    it('keeps account disconnection successful and cleanup durable across broker failure and immediate reconnection', async (): Promise<void> => {
      const worker = workers[1]!;

      const paused = new Promise<void>((resolve): void => {
        worker.once('message', (): void => resolve());
      });

      worker.send('pauseCleanup');

      await paused;

      const accountId = new Types.ObjectId();
      const oldSnapshot = new Types.ObjectId();
      const freshSnapshot = new Types.ObjectId();
      const old = new Date(Date.now() - 10000);

      await ExternalAccount.collection.insertOne({
        _id: accountId,
        identity,
        provider: 'x',
        providerAccountId: 'example-provider',
        username: 'example',
        status: 'connected',
        connectedAt: old,
        disconnectedAt: null,
      } as never);

      await XDataSnapshot.collection.insertOne({
        _id: oldSnapshot,
        identity,
        externalAccount: accountId,
        collectedAt: old,
      } as never);

      await ReputationSnapshot.collection.insertOne({
        identity,
        category: 'social',
        calculatedAt: old,
        sources: [{ provider: 'x', snapshot: oldSnapshot }],
      } as never);

      const publish = vi
        .spyOn(reputationPublisher, 'publishReputationJob')
        .mockRejectedValueOnce(new Error('Broker unavailable'));

      const response = await request(app).delete('/v1/connections/x');

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        status: 'success',
        message: 'x account disconnected',
        result: {},
      });

      const accepted = await ReputationCleanupJob.findOne({ externalAccount: accountId });

      expect(accepted?.status).toBe('queued');

      expect(publish).toHaveBeenCalledWith(
        'lumenrise.reputation.connection-cleanup.v1',
        accepted!._id.toString(),
      );

      publish.mockRestore();

      // The original account connectedAt is immutable; the outbox retains the disconnect cutoff.
      await ExternalAccount.updateOne(
        { _id: accountId },
        { $set: { status: 'connected', disconnectedAt: null } },
      );

      const fresh = new Date(accepted!.cutoff.getTime() + 1);

      await XDataSnapshot.collection.insertOne({
        _id: freshSnapshot,
        identity,
        externalAccount: accountId,
        collectedAt: fresh,
      } as never);

      await ReputationSnapshot.collection.insertOne({
        identity,
        category: 'social',
        calculatedAt: fresh,
        sources: [{ provider: 'x', snapshot: freshSnapshot }],
      } as never);

      worker.send('resumeCleanup');

      await vi.waitFor(
        async (): Promise<void> => {
          expect((await ReputationCleanupJob.findById(accepted!._id))?.status).toBe('completed');
        },
        { timeout: 10000 },
      );

      await ReputationCleanupJob.updateOne(
        { _id: accepted!._id },
        { $set: { status: 'running', leaseUntil: new Date(0) } },
      );

      await vi.waitFor(
        async (): Promise<void> => {
          const recovered = await ReputationCleanupJob.findById(accepted!._id);

          expect(recovered?.status).toBe('completed');

          expect(recovered?.attempts).toBe(2);
        },
        { timeout: 10000 },
      );

      expect(await XDataSnapshot.exists({ _id: oldSnapshot })).toBeNull();

      expect(await XDataSnapshot.exists({ _id: freshSnapshot })).not.toBeNull();

      expect(await ReputationSnapshot.countDocuments({ identity, category: 'social' })).toBe(1);

      expect((await ExternalAccount.findById(accountId))?.status).toBe('connected');
    }, 30000);
  },
);
