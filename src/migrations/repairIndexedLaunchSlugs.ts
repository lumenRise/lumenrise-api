import { createHash } from 'node:crypto';

import Launch from '../models/Launch';
import LaunchName from '../models/LaunchName';
import toLaunchSlug from '../utils/launch/toLaunchSlug';

const repairIndexedLaunchSlugs = async (): Promise<void> => {
  await Launch.collection.updateMany({ chain: { $exists: false } }, { $set: { chain: 'stellar' } });
  await LaunchName.collection.updateMany(
    { chain: { $exists: false } },
    { $set: { chain: 'stellar' } },
  );

  const launches = await Launch.find({})
    .sort({ prelaunchId: -1, chain: 1, network: 1, contractId: 1 })
    .lean();

  const names = await LaunchName.find({}).lean();
  const claimed = new Map<string, string>();
  const reserved = new Set<string>();
  const assignments = new Map<string, string>();

  for (const name of names) {
    const key = `${name.chain ?? 'stellar'}:${name.network}:${name.slug}`;

    claimed.set(key, name.contractId ?? `reservation:${name._id}`);
    reserved.add(key);
  }

  for (const launch of launches) {
    const scope = `${launch.chain ?? 'stellar'}:${launch.network}`;

    if (launch.slug) {
      reserved.add(`${scope}:${launch.slug}`);
    }

    try {
      reserved.add(`${scope}:${toLaunchSlug(launch.metadata.name)}`);
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'LaunchNameConflict') {
        throw error;
      }
    }
  }

  for (const launch of launches) {
    const chain = launch.chain ?? 'stellar';
    const scope = `${chain}:${launch.network}`;
    const identity = `${scope}:${launch.contractId}`;
    let base = launch.slug;

    if (!base) {
      try {
        base = toLaunchSlug(launch.metadata.name);
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'LaunchNameConflict') {
          throw error;
        }

        base = 'legacy-launch';
      }
    }

    const matching = names.find(
      (name): boolean =>
        (name.chain ?? 'stellar') === chain &&
        name.network === launch.network &&
        name.slug === base &&
        name.ownerAddress === launch.owner &&
        name.publicUrl === launch.metadata.logo &&
        name.status === 'reserved' &&
        !name.contractId,
    );

    if (matching) {
      claimed.set(`${scope}:${base}`, launch.contractId);
    }

    const digest = createHash('sha256').update(identity).digest('hex').slice(0, 12);
    let slug = base;
    let attempt = 0;

    while (
      (claimed.has(`${scope}:${slug}`) && claimed.get(`${scope}:${slug}`) !== launch.contractId) ||
      (attempt > 0 &&
        reserved.has(`${scope}:${slug}`) &&
        claimed.get(`${scope}:${slug}`) !== launch.contractId)
    ) {
      if (launch.prelaunchId) {
        throw new Error('A reserved API launch has a conflicting slug; manual review is required');
      }

      if (!launch.factoryContractId || !launch.contractId || launch.factoryIndex < 1) {
        throw new Error('Cannot automatically rename a launch without a factory identity');
      }

      const suffix = attempt === 0 ? digest : `${digest}-${attempt}`;

      slug = `${base.slice(0, 99 - suffix.length)}-${suffix}`;
      attempt += 1;
    }

    claimed.set(`${scope}:${slug}`, launch.contractId);
    assignments.set(identity, slug);
  }

  const canonicalClaims = new Map<string, string>();

  for (const name of names) {
    const identity = `${name.chain ?? 'stellar'}:${name.network}:${name.contractId}`;
    const desired = assignments.get(identity);

    if (name.status !== 'indexed' || !desired) {
      continue;
    }

    if (!canonicalClaims.has(identity) || name.slug === desired) {
      canonicalClaims.set(identity, String(name._id));
    }
  }

  for (const name of names) {
    const scope = `${name.chain ?? 'stellar'}:${name.network}`;
    const identity = `${scope}:${name.contractId}`;
    const desired = assignments.get(identity);

    if (name.status !== 'indexed' || !desired) {
      continue;
    }

    const canonical = canonicalClaims.get(identity) === String(name._id);
    const digest = createHash('sha256').update(String(name._id)).digest('hex').slice(0, 12);
    let slug = canonical ? desired : `${name.slug.slice(0, 80)}-legacy-${digest}`;
    let attempt = 0;

    while (!canonical && (reserved.has(`${scope}:${slug}`) || claimed.has(`${scope}:${slug}`))) {
      attempt += 1;

      slug = `${name.slug.slice(0, 70)}-legacy-${digest}-${attempt}`;
    }

    if (name.slug === slug) {
      continue;
    }

    if (name.prelaunchId) {
      throw new Error('Cannot automatically rename a reserved API name claim');
    }

    await LaunchName.collection.updateOne(
      { _id: name._id, slug: name.slug },
      { $set: { slug, ...(canonical ? {} : { status: 'expired' }) } },
    );

    reserved.add(`${scope}:${slug}`);
  }

  for (const launch of launches) {
    const chain = launch.chain ?? 'stellar';
    const slug = assignments.get(`${chain}:${launch.network}:${launch.contractId}`)!;

    await LaunchName.updateOne(
      {
        chain,
        network: launch.network,
        slug,
        ownerAddress: launch.owner,
        publicUrl: launch.metadata.logo,
      },
      {
        $set: { contractId: launch.contractId, status: 'indexed' },
        $setOnInsert: {
          chain,
          network: launch.network,
          slug,
          ownerAddress: launch.owner,
          publicUrl: launch.metadata.logo,
        },
      },
      { upsert: true },
    );

    if (launch.slug === slug) {
      continue;
    }

    await Launch.collection.updateOne(
      { _id: launch._id, ...(launch.slug ? { slug: launch.slug } : { slug: { $exists: false } }) },
      { $set: { slug } },
    );
  }
};

export default repairIndexedLaunchSlugs;
