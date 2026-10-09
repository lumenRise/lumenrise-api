import { Router } from 'express';

import authRoutes from './auth/index';
import userRoutes from './user/index';
import docsRoutes from './docs/index';
import oauthRoutes from './oauth/index';
import healthRoutes from './health/index';
import policyRoutes from './policies/index';
import stellarRoutes from './stellar/index';
import launchRoutes from './launches/index';
import developerRoutes from './developers/index';
import reputationRoutes from './reputation/index';
import connectionRoutes from './connections/index';

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/policies', policyRoutes);
router.use('/v1/developers', developerRoutes);
router.use('/v1', docsRoutes);
router.use('/v1/oauth', oauthRoutes);
router.use('/v1/health', healthRoutes);
router.use('/v1/stellar', stellarRoutes);
router.use('/v1/connections', connectionRoutes);
router.use('/v1/reputation', reputationRoutes);
router.use('/v1/launches', launchRoutes);

export default router;
