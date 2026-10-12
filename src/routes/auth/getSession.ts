import type { RequestHandler } from 'express';

const getSessionRoute: RequestHandler = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'User identified',
    result: { identityId: req.auth!.identityId.toString(), userId: req.auth!.userId },
  });
};

export default getSessionRoute;
