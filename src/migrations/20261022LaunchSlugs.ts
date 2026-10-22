import { createHash } from 'node:crypto';

import Launch from '../models/Launch';
import LaunchName from '../models/LaunchName';
import TokenImage from '../models/TokenImage';
import toLaunchSlug from '../utils/launch/toLaunchSlug';
import type { MigrationDefinition } from '../types/database/migration';

const launchSlugs: MigrationDefinition = {
  name: '20261022-launch-slugs',
  up: async (): Promise<void> => {
    const launches = await Launch.find({}).sort({ network: 1, contractId: 1 }).lean();
    const claimed = new Map<string, string>();
    const bases = new Map<string, string>();
    const reserved = new Set<string>();
    const assignments = new Map<string, string>();
    const fallbacks = new Set<string>();

    for (const launch of launches) {
      const identity = `${launch.network}:${launch.contractId}`;
      let base: string;

      try {
        base = toLaunchSlug(launch.metadata.name);
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'LaunchNameConflict') {
          throw error;
        }

        base = 'legacy-launch';

        fallbacks.add(identity);
      }

      bases.set(identity, base);
      reserved.add(`${launch.network}:${base}`);

      if (launch.slug) {
        const key = `${launch.network}:${launch.slug}`;
        const previous = claimed.get(key);

        if (previous && previous !== launch.contractId) {
          throw new Error(`Duplicate existing slug ${key}: ${previous} and ${launch.contractId}`);
        }

        claimed.set(key, launch.contractId);
        assignments.set(identity, launch.slug);
      }
    }

    for (const launch of launches) {
      const identity = `${launch.network}:${launch.contractId}`;

      if (assignments.has(identity)) {
        continue;
      }

      const base = bases.get(identity)!;
      const digest = createHash('sha256').update(identity).digest('hex').slice(0, 12);
      let slug = fallbacks.has(identity) ? `${base}-${digest}` : base;
      let attempt = fallbacks.has(identity) ? 1 : 0;

      while (
        claimed.has(`${launch.network}:${slug}`) ||
        (attempt > 0 && reserved.has(`${launch.network}:${slug}`))
      ) {
        const suffix = attempt === 0 ? digest : `${digest}-${attempt}`;

        slug = `${base.slice(0, 99 - suffix.length)}-${suffix}`;
        attempt += 1;
      }

      claimed.set(`${launch.network}:${slug}`, launch.contractId);
      assignments.set(identity, slug);
    }

    await LaunchName.createIndexes();
    await Launch.createIndexes();
    await TokenImage.createIndexes();

    for (const launch of launches) {
      const slug = assignments.get(`${launch.network}:${launch.contractId}`)!;

      await LaunchName.updateOne(
        {
          network: launch.network,
          slug,
          ownerAddress: launch.owner,
          publicUrl: launch.metadata.logo,
        },
        {
          $set: { contractId: launch.contractId, status: 'indexed' },
          $setOnInsert: {
            network: launch.network,
            slug,
            ownerAddress: launch.owner,
            publicUrl: launch.metadata.logo,
          },
        },
        { upsert: true },
      );

      if (launch.slug) {
        continue;
      }

      await Launch.collection.updateOne(
        { _id: launch._id, slug: { $exists: false } },
        { $set: { slug } },
      );
    }
  },
};

export default launchSlugs;
