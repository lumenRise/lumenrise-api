import { Router } from 'express';

import authRoutes from './auth/index.js';
import docsRoutes from './docs/index.js';
import oauthRoutes from './oauth/index.js';
import healthRoutes from './health/index.js';
import policyRoutes from './policies/index.js';
import stellarRoutes from './stellar/index.js';
import reputationRoutes from './reputation/index.js';
import connectionRoutes from './connections/index.js';

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/policies', policyRoutes);
router.use('/v1', docsRoutes);
router.use('/v1/oauth', oauthRoutes);
router.use('/v1/health', healthRoutes);
router.use('/v1/stellar', stellarRoutes);
router.use('/v1/connections', connectionRoutes);
router.use('/v1/reputation', reputationRoutes);

export default router;
