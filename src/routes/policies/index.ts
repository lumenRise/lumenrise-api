import { Router } from 'express';

import getPoliciesRoute from './get';
import postPolicyRoute from './post';
import getPolicyByKeyRoute from './getByKey';
import evaluatePolicyRoute from './evaluate';
import requireSession from '../../middleware/requireSession';

const policyRoutes = Router();

policyRoutes.get('/', requireSession, getPoliciesRoute);
policyRoutes.post('/', requireSession, postPolicyRoute);
policyRoutes.get('/:key', requireSession, getPolicyByKeyRoute);
policyRoutes.post('/:key/evaluate', requireSession, evaluatePolicyRoute);

export default policyRoutes;
