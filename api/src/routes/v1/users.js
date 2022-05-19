import express from 'express';
import api from '../../api/v1/users';
import { isLoggedIn, isAuthorised } from '../../middlewares';

const router = express.Router();

router.post('/', api.register);
router.put('/', isLoggedIn, api.updateProfile);
router.post('/login', api.login);
router.get('/logout', isLoggedIn, api.logout);
router.post('/facebookLogin', api.facebookLogin);
router.post('/token', isLoggedIn, isAuthorised, api.registerDeviceToken);
router.post('/image', isLoggedIn, isAuthorised, api.updateImage);

router.post('/forgotPassword', api.forgotPassword);
router.post('/resetPassword', api.resetPassword);
router.post('/changePassword', isLoggedIn, api.changePassword);
router.post('/alertActivation', isLoggedIn, isAuthorised, api.alertActivation);
router.post('/deleteAccount', isLoggedIn, api.deleteAccount);

router.post('/follow', isLoggedIn, isAuthorised, api.follow);
router.post('/unfollow', isLoggedIn, isAuthorised, api.unfollow);
router.post('/followers', isLoggedIn, isAuthorised, api.followers);
router.post('/followings', isLoggedIn, isAuthorised, api.followings);

router.post('/block', isLoggedIn, isAuthorised, api.block);
router.post('/unblock', isLoggedIn, isAuthorised, api.unblock);
router.post('/blockedUsers', isLoggedIn, isAuthorised, api.blockedUsers);
router.post('/getMentions', isLoggedIn, isAuthorised, api.getMentions);

router.post('/feedback', isLoggedIn, isAuthorised, api.postFeedback);
router.get('/token', isLoggedIn, isAuthorised, api.getDeviceToken);
router.get('/', isLoggedIn, isAuthorised, api.get);
//router.get('/general/:type', api.general);

router.post('/reportUser', isLoggedIn, isAuthorised, api.reportUser);
router.post('/reportPost', isLoggedIn, isAuthorised, api.reportPost);
router.post('/profile', isLoggedIn, isAuthorised, api.getProfile);

router.post('/search', isLoggedIn, isAuthorised, api.searchUsers);
router.post('/suggested', isLoggedIn, isAuthorised, api.suggestedUsers);
router.post('/notifications', isLoggedIn, isAuthorised, api.getNotifications);
router.post(
  '/notifications/read',
  isLoggedIn,
  isAuthorised,
  api.markNotificationRead
);

router.post('/verify', isLoggedIn, isAuthorised, api.verify);
export default router;
