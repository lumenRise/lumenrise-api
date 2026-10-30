import repairIndexedLaunchSlugs from './repairIndexedLaunchSlugs';
import type { MigrationDefinition } from '../types/database/migration';

const repairLaunchSlugs: MigrationDefinition = {
  name: '20261029-repair-indexed-launch-slugs',
  up: repairIndexedLaunchSlugs,
};

export default repairLaunchSlugs;
