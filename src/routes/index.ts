import { Router } from 'express';

import healthRoutes from './health/index.js';

const router = Router();

router.use('/v1/health', healthRoutes);

export default router;
