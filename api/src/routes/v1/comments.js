import express from 'express';
import * as api from '../../api/v1/posts';
import { download } from '../../lib/watermark';
import { isLoggedIn, isAuthorised } from '../../middlewares';

const router = express.Router();
router.post('/like', isLoggedIn, isAuthorised, api.commentLike);
export default router;
