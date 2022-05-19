import express from 'express';
import { startRequestHandler, startJobStatusCheck } from '../../lib/moderation';
import * as middlewares from '../../middlewares';

const router = express.Router();

router.post('/start', startRequestHandler);
router.get('/check', startJobStatusCheck);
export default router;
