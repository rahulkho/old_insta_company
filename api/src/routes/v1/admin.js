import express from 'express';
import api from '../../api/v1/admin';
import * as upload from '../../api/v1/admin_upload';
import * as middleWares from '../../middlewares';
import { hourly } from '../../api/v1/admin_cron';

const router = express.Router();
const isLoggedIn = middleWares.isAdminLoggedIn;

router.post('/login', api.login);

router.get('/category/:categoryId', isLoggedIn, api.getCategory);
router.delete('/category/:categoryId', isLoggedIn, api.deleteCategory);
router.get('/category/page/:page', isLoggedIn, api.getCategories);
router.post('/category', isLoggedIn, api.addCategory);
router.patch('/category', isLoggedIn, api.editCategory);
router.post('/categoryImage', isLoggedIn, api.categoryImage);
router.post('/categoryVideo', isLoggedIn, api.categoryVideo);

router.post('/users', isLoggedIn, api.users);

router.post('/feedbacks', isLoggedIn, api.feedbacks);
router.post('/reports', isLoggedIn, api.reports);

router.post('/getCounts', isLoggedIn, api.getCounts);

router.get('/', isLoggedIn, api.profile);
router.get('/all', isLoggedIn, api.getAllAdmins);

router.post('/setUserStatus', isLoggedIn, api.setUserStatus);
router.post('/setUserSponsored', isLoggedIn, api.setUserSponsored);
router.post('/setUserCountries', isLoggedIn, api.setUserCountries);
router.post('/setIsBug', isLoggedIn, api.markBug);
router.post('/setIsRead', isLoggedIn, api.markRead);

router.post('/posts', isLoggedIn, api.getPosts);
router.post('/togglePostDelete', isLoggedIn, api.togglePostDelete);
router.post('/togglePostActive', isLoggedIn, api.togglePostActive);

router.post('/addAdminUser', isLoggedIn, api.addUser);
router.post('/editAdminUser', isLoggedIn, api.editUser);
router.post('/deleteAdminUser', isLoggedIn, api.deleteUser);

router.post('/changePassword', isLoggedIn, api.changePassword);

router.get('/appVersions', isLoggedIn, api.appVersions);
router.post('/sendEmail', isLoggedIn, api.sendEmail);
router.post('/updateAppVersion', isLoggedIn, api.updateAppVersion);

router.post('/addKeyword', isLoggedIn, api.addKeyword);
router.post('/updateKeyword', isLoggedIn, api.updateKeyword);
router.post('/deleteKeyword', isLoggedIn, api.deleteKeyword);
router.get('/keywords', isLoggedIn, api.getKeywords);

router.post('/addSubcategory', isLoggedIn, api.addSubcategory);
router.post('/updateSubcategory', isLoggedIn, api.updateSubcategory);
router.post('/deleteSubcategory', isLoggedIn, api.deleteSubcategory);
router.get('/subcategories', isLoggedIn, api.getSubcategories);
router.post('/applySubcategory', isLoggedIn, api.applySubcategory);

router.post('/soundCategory', isLoggedIn, api.addSoundCategory);
router.post('/soundCategoryImage', isLoggedIn, api.soundCategoryImage);
router.patch('/soundCategory', isLoggedIn, api.editSoundCategory);
router.get('/soundCategory/page/:page', isLoggedIn, api.getSoundCategories);
router.get('/allCategories', isLoggedIn, api.allCategories);
router.get('/soundCategory/:categoryId', isLoggedIn, api.getSoundCategory);
router.delete(
  '/soundCategory/:categoryId',
  isLoggedIn,
  api.deleteSoundCategory
);

router.get('/sounds/page/:page', isLoggedIn, api.getSounds);
router.put('/sounds/:id', isLoggedIn, api.updateSound);
router.delete('/sounds/:id', isLoggedIn, api.deleteSound);
router.post('/upload/categories', isLoggedIn, upload.uploadCategories);
router.post('/upload/sounds', isLoggedIn, upload.uploadSounds);
router.post('/upload/manage_sounds', isLoggedIn, upload.manageSounds);
router.get('/sounds', upload.getSoundsTemp);
router.get('/sound_categories', upload.getAudioCategoriesTemp);
router.get('/video_categories', upload.getVideoCategoriesTemp);
router.post('/cron/hourly', hourly);

//user_verification_requests
router.put('/users/:userId/verification', isLoggedIn, api.changeVerification);
export default router;
