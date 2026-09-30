import type { RequestHandler } from 'express';

import Session from '../../models/Session';
import { clearSessionCookie } from '../../services/auth/session';
import type { ApiResponse, EmptyResult } from '../../types/response';
const deleteSessionRoute: RequestHandler = async (req, res) => {
  await Session.updateOne({ _id: req.auth?.sessionId }, { $set: { revokedAt: new Date() } });
  clearSessionCookie(res);

  const response: ApiResponse<EmptyResult> = {
    status: 'success',
    message: 'Session ended',
    result: {},
  };

  return res.status(200).json(response);
};

export default deleteSessionRoute;
