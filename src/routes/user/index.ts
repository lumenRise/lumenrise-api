import { Router } from 'express';

import getMeRoute from './get';
import putAvatarRoute from './putAvatar';
import deleteAvatarRoute from './deleteAvatar';
import avatarUpload from '../../middleware/avatarUpload';
import requireSession from '../../middleware/requireSession';

const userRoutes = Router();

userRoutes.get('/', requireSession, getMeRoute);
userRoutes.put('/avatar', requireSession, avatarUpload, putAvatarRoute);
userRoutes.delete('/avatar', requireSession, deleteAvatarRoute);

export default userRoutes;
