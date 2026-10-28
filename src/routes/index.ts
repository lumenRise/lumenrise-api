import { Router } from 'express';

import authRoutes from './auth/index';
import userRoutes from './user/index';
import docsRoutes from './docs/index';
import oauthRoutes from './oauth/index';
import configRoutes from './config/index';
import healthRoutes from './health/index';
import policyRoutes from './policies/index';
import stellarRoutes from './stellar/index';
import launchRoutes from './launches/index';
import migrationRoutes from './migrations/index';
import developerRoutes from './developers/index';
import reputationRoutes from './reputation/index';
import connectionRoutes from './connections/index';
import requireStellarChain from '../middleware/requireStellarChain';

const router = Router();

router.use('/v1/auth', authRoutes);

router.use('/v1/config', configRoutes);

router.use('/v1/user', userRoutes);

router.use('/v1/policies', requireStellarChain, policyRoutes);

router.use('/v1/developers', requireStellarChain, developerRoutes);

router.use('/v1', docsRoutes);

router.use('/v1/oauth', requireStellarChain, oauthRoutes);

router.use('/v1/health', healthRoutes);

router.use('/v1/migrations', migrationRoutes);

router.use('/v1/stellar', requireStellarChain, stellarRoutes);

router.use('/v1/connections', requireStellarChain, connectionRoutes);

router.use('/v1/reputation', requireStellarChain, reputationRoutes);

router.use('/v1/launches', launchRoutes);

export default router;
