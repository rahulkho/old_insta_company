import express from 'express';
import {
  uploadSound,
  getById,
  listSounds,
  deleteById,
  soundHome,
  searchSound,
  popularSounds,
  soundsByVideoCategory,
  soundsByAudioCategory,
} from '../../api/v1/sounds';
import { isLoggedIn, isAuthorised } from '../../middlewares';

const router = express.Router();

router.post('/', isLoggedIn, isAuthorised, uploadSound);
router.post('/getById', isLoggedIn, isAuthorised, getById);
router.post('/list', isLoggedIn, isAuthorised, listSounds);
router.post('/delete', isLoggedIn, isAuthorised, deleteById);
router.post('/home', isLoggedIn, isAuthorised, soundHome);
router.post('/search', isLoggedIn, isAuthorised, searchSound);
router.post('/popular', isLoggedIn, isAuthorised, popularSounds);
router.post(
  '/byVideoCategory',
  isLoggedIn,
  isAuthorised,
  soundsByVideoCategory
);
router.post(
  '/byAudioCategory',
  isLoggedIn,
  isAuthorised,
  soundsByAudioCategory
);
export default router;
