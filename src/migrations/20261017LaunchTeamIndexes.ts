import LaunchTeamMember from '../models/LaunchTeamMember';
import type { MigrationDefinition } from '../types/database/migration';

const launchTeamIndexes: MigrationDefinition = {
  name: '20261017-launch-team-indexes',
  up: async () => {
    await LaunchTeamMember.createIndexes();
  },
};

export default launchTeamIndexes;
