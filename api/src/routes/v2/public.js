import express from 'express';
import api from '../../api/v2/public';
import * as middlewares from '../../middlewares';

const router = express.Router();
router.post('/posts', middlewares.decodeJwt, api.publicPosts);

export default router;
