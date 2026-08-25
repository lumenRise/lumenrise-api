import { Router } from 'express';

import healthRoutes from './health';

const router = Router();

router.use('/v1/health', healthRoutes);

export default router;
