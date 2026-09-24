import { Router } from 'express';

import getPoliciesRoute from './get.js';
import postPolicyRoute from './post.js';
import getPolicyByKeyRoute from './getByKey.js';
import evaluatePolicyRoute from './evaluate.js';
import requireSession from '../../middleware/requireSession.js';

const policyRoutes = Router();

policyRoutes.get('/', requireSession, getPoliciesRoute);
policyRoutes.post('/', requireSession, postPolicyRoute);
policyRoutes.get('/:key', requireSession, getPolicyByKeyRoute);
policyRoutes.post('/:key/evaluate', requireSession, evaluatePolicyRoute);

export default policyRoutes;
