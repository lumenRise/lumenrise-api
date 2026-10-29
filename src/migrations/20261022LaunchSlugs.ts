import Launch from '../models/Launch';
import LaunchName from '../models/LaunchName';
import TokenImage from '../models/TokenImage';
import repairIndexedLaunchSlugs from './repairIndexedLaunchSlugs';
import type { MigrationDefinition } from '../types/database/migration';

const launchSlugs: MigrationDefinition = {
  name: '20261022-launch-slugs',
  up: async (): Promise<void> => {
    await repairIndexedLaunchSlugs();

    await LaunchName.createIndexes();
    await Launch.createIndexes();
    await TokenImage.createIndexes();
  },
};

export default launchSlugs;
