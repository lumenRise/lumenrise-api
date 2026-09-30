import type { RequestHandler } from 'express';

import log from '../../logger';
import getSybilEvidence from '../../services/sybil/getSybilEvidence';
import type { ApiResponse, EmptyResult } from '../../types/response';
import type { SybilEvidenceResult } from '../../types/sybil/evidence';
const getSybilEvidenceRoute: RequestHandler = async (req, res) => {
  try {
    const evidence = await getSybilEvidence(req.auth!.identityId);

    if (!evidence) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Identity was not found',
        result: {},
      };

      return res.status(404).json(response);
    }

    const response: ApiResponse<SybilEvidenceResult> = {
      status: 'success',
      message: 'Sybil evidence retrieved',
      result: evidence,
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error, identityId: req.auth!.identityId }, 'Sybil evidence lookup failed');

    return res.status(503).json({
      status: 'error',
      message: 'Sybil evidence is temporarily unavailable',
      result: {},
    });
  }
};

export default getSybilEvidenceRoute;
