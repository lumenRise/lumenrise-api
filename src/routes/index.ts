import { Router } from 'express';

import authRoutes from './auth/index.js';
import oauthRoutes from './oauth/index.js';
import healthRoutes from './health/index.js';

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/oauth', oauthRoutes);
router.use('/v1/health', healthRoutes);

export default router;
