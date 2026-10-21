import type { RequestHandler } from 'express';

import log from '../../logger';
import DatabaseMigration from '../../models/DatabaseMigration';

const getMigrations: RequestHandler = async (_req, res) => {
  try {
    const migrations = await DatabaseMigration.distinct('name');

    res.set('Cache-Control', 'no-store');

    return res.json({
      status: 'success',
      message: 'Migrations retrieved',
      result: { migrations },
    });
  } catch (error) {
    log.error({ error }, 'Migration lookup failed');

    return res.status(503).json({
      status: 'error',
      message: 'Migrations are unavailable',
      result: {},
    });
  }
};

export default getMigrations;
