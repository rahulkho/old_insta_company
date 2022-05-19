import express from 'express';
import api from '../../api/v1/public';
import v2Api from '../../api/v2/public';
import * as middlewares from '../../middlewares';

const router = express.Router();
router.post('/posts', middlewares.decodeJwt, v2Api.publicPosts);

export default router;
