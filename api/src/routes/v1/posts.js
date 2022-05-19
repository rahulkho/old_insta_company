import express from 'express';
import * as api from '../../api/v1/posts';
import { download } from '../../lib/watermark';
import { isLoggedIn, isAuthorised } from '../../middlewares';

const router = express.Router();

router.post('/', isLoggedIn, isAuthorised, api.newPost);
router.post('/video', isLoggedIn, api.postVideo);
router.post('/view', isLoggedIn, api.postView);

router.post('/comment', isLoggedIn, isAuthorised, api.postComment);
router.post('/deleteComment', isLoggedIn, isAuthorised, api.deleteComment);
router.post('/comments', isLoggedIn, isAuthorised, api.getComments);

router.post('/likes', isLoggedIn, isAuthorised, api.getLikes);
router.post('/blessings', isLoggedIn, isAuthorised, api.getBlessings);

router.post('/like', isLoggedIn, isAuthorised, api.like);
router.post('/unlike', isLoggedIn, isAuthorised, api.unlike);
router.post('/removeMention', isLoggedIn, isAuthorised, api.removeMention);

router.post('/bless', isLoggedIn, isAuthorised, api.bless);
router.post('/unbless', isLoggedIn, isAuthorised, api.unbless);

router.post(
  '/skippedCategories',
  isLoggedIn,
  (req, res, next) => {
    req.body.status = 'skipped';
    next();
  },
  api.getCategories
);

router.post(
  '/pendingCategories',
  isLoggedIn,
  (req, res, next) => {
    req.body.status = 'pending';
    next();
  },
  api.getCategories
);

router.post(
  '/completedCategories',
  isLoggedIn,
  (req, res, next) => {
    req.body.status = 'completed';
    next();
  },
  api.getCategories
);

router.post(
  '/searchCategories',
  isLoggedIn,
  (req, res, next) => {
    req.body.status = 'pending';
    next();
  },
  api.getCategories
);

router.post('/categories', isLoggedIn, api.getCategories);
router.post('/categoriesWithPosts', isLoggedIn, api.categoriesWithPosts);

router.delete('/:postId', isLoggedIn, isAuthorised, api.deletePost);
router.get('/drafts', isLoggedIn, isAuthorised, api.getAllDrafts);
router.get('/:postId', isLoggedIn, isAuthorised, api.getPost);
router.get('/:postId/download', download);

router.post(
  '/fromUserCircle',
  isLoggedIn,
  isAuthorised,
  api.postFromUserCirlce
);
router.post('/byCategory', isLoggedIn, isAuthorised, api.postByCategory);
router.post('/userUploaded', isLoggedIn, isAuthorised, api.postUserUploaded);
router.post('/userMentioned', isLoggedIn, isAuthorised, api.postByMention);
router.post('/searchByText', isLoggedIn, isAuthorised, api.postByText);
router.post('/bySound', isLoggedIn, isAuthorised, api.postBySound);
router.post('/searchByHashtag', isLoggedIn, isAuthorised, api.postByHashtag);

router.post('/searchHashtags', isLoggedIn, isAuthorised, api.searchHashtags);

router.post('/skipCategory', isLoggedIn, isAuthorised, api.skipCategory);
export default router;
