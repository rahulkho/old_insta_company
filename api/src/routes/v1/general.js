import express from 'express';
import api from '../../api/v1/general';
import { isLoggedIn } from '../../middlewares';

const router = express.Router();
//const isLoggedIn = middleWares.isLoggedIn;

router.get('/license', api.license);
router.get('/response-codes', api.responseCodes);
router.get('/terms', api.terms);
router.get('/privacyPolicy', api.privacyPolicy);
router.post('/appSettings', isLoggedIn, api.appSettings);
router.post('/legal', api.legal);

export default router;
