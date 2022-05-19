'use strict';
import fs, { stat } from 'fs';
import os from 'os';
import { URL } from 'url';
import createError from 'http-errors';
import twitter from 'twitter-text';
import formidable from 'formidable';
import isUrl from 'is-url';
import _ from 'lodash';

import {
  sendPostComment,
  sendPostLike,
  sendPostMention,
  sendCommentMention,
  sendPostViewIncrease,
} from '../../lib/notifications';
import { startModerationJob } from '../../lib/moderation';

import db from '../../db';
import Responses from '../../lib/api_response';
import { watermark, getFinalVideoURL, deleteOldMedia } from '../../lib/overlay';

import utils, { getTransaction, replaceDomains } from '../../lib/utils';
import ApiResponse from '../../classes/ApiResponse';
import FileUploader from '../../classes/FileUploader';
import ApiResult from '../../classes/ApiResult';
import buckets from '../../lib/buckets';
import * as categoryQueries from '../../lib/category_queries';
import config from '../../config';
import {
  fromUserCircle,
  searchByCategory,
  searchByText,
  searchBySoundId,
  postByUserUploaded,
  completedCategories,
  skippedCategories,
  pendingCategries,
  postByUserMentioned,
  getSinglePost,
  getSingleComment,
  getCommentsQuery,
  getLikesQuery,
  getBlessingsQuery,
} from '../../lib/post_queries';
import { updatePostCount } from './sounds';
import { applyWatermarkAndUpload } from '../../lib/watermark';

const ROWS_PER_PAGE_20 = config.paging.ROWS_PER_PAGE_20;
const ROWS_PER_PAGE_30 = config.paging.ROWS_PER_PAGE_30;

const S3_URL_PREFIX = 'https://s3-us-west-1.amazonaws.com/insta-assets';
const fileUploader = new FileUploader();

const hasResult = (rows) => {
  return rows && rows.length >= 1;
};

const hasValue = (thing) => {
  return thing && (thing.length || !isNaN(parseInt(thing)));
};

export const deletePostNotifications = async (postId) => {
  await db('notifications').where({ postId }).del();
};

export const updateCategoryTotalPosts = async (categoryId) => {
  const postsInThisCategory = (
    await db('posts')
      .where('categoryId', categoryId)
      .andWhere('status', config.postStatus.published)
      .count('postId')
  ).pop();

  await db('categories')
    .update('totalPosts', parseInt(postsInThisCategory.count))
    .where('categoryId', categoryId);
};

const checkIsBlocked = async (user1, user2) => {
  return (
    await db('user_blocks')
      .where(db.raw(`("userId" = ? AND "blockedUserId" = ?)`, [user1, user2]))
      .orWhere(db.raw(`("blockedUserId" = ? AND "userId" = ?)`, [user1, user2]))
  ).pop();
};

const fetchPost = async (postId) => {
  return (
    await db
      .select(['postId', 'userId'])
      .from('posts')
      .where('postId', postId)
      .where('status', config.postStatus.published)
  ).pop();
};

const getPost = async (req, res, next) => {
  const params = req.params;
  console.log(`[getPost] params: ${JSON.stringify(params)}`);

  try {
    // const rows = await db('posts').where('postId', params.postId);
    // if (!hasResult(rows)) {
    // 	return res.send(new ApiResponse('Invalid postId', null, 0).response);
    // }
    const result = await getSinglePost(params.postId, req.user.userId);

    if (!hasResult(result)) {
      return next(createError(401, 'The post is unavailable'));
    }
    return res.send(new ApiResponse('Success', result.pop()).response);
  } catch (error) {
    console.log(`[getPost] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const createHashtags = async (tags) => {
  try {
    console.log(`[createHashtags] hashtags: ${JSON.stringify(tags)}`);
    const existingHashtagsColl = await db('hashtags').whereIn('hashtag', tags);

    if (existingHashtagsColl.length === tags.length) {
      return existingHashtagsColl;
    }

    const existingHashtags = _.map(existingHashtagsColl, 'hashtag');
    console.log(
      `[createHashtags] existingHashtags: ${JSON.stringify(existingHashtags)}`
    );

    const hashtagsToAdd = _.difference(tags, existingHashtags);
    console.log(
      `[createHashtags] hashtagsToAdd: ${JSON.stringify(hashtagsToAdd)}`
    );

    if (hasResult(hashtagsToAdd)) {
      const newHashtags = await db
        .insert(
          hashtagsToAdd.map((tag) => {
            return {
              hashtag: tag,
            };
          }),
          '*'
        )
        .into('hashtags');

      return existingHashtagsColl.concat(newHashtags);
    } else {
      return existingHashtagsColl;
    }
  } catch (error) {
    console.log(`[createHashtags] error: ${error.stack}`);
    return [];
  }
};

const createMentions = async (mentions) => {
  try {
    console.log(`[createMentions] mentions: ${JSON.stringify(mentions)}`);
    const mentionIds = await db
      .select('userId')
      .from('users')
      .whereIn('userName', mentions);
    return mentionIds;
  } catch (error) {
    console.log(`[createMentions] error: ${error.stack}`);
    return [];
  }
};

const getStreamUrl = (videoUrl) => {
  const url = new URL(videoUrl);
  for (let i in buckets) {
    let bucketData = buckets[i];

    if (videoUrl.includes(bucketData.bucket)) {
      return `https://${bucketData.edgeDomain}${url.pathname}`;
    }
  }
  return videoUrl;
};

const getImageUrl = (imgUrl) => {
  const url = new URL(imgUrl);
  for (let i in buckets) {
    let bucketData = buckets[i];

    if (imgUrl.includes(bucketData.bucket)) {
      return `https://${bucketData.edgeDomain}${url.pathname}`;
    }
  }
  return imgUrl;
};

const newPost = async (req, res, next) => {
  const body = req.body;
  console.log(`[newPost] body: ${JSON.stringify(body)}`);
  body.userId = req.user.userId;

  let {
    postId,
    soundId,
    status,
    categoryId,
    videoUrl,
    description,
    imageUrl,
    isLandscape,
    isOpen,
    duetWith,
    iOSFront,
  } = body;

  let post;

  const postMedia = {
    imageUrl,
    videoUrl,
  };

  if (parseInt(categoryId) === 0) {
    categoryId = null;
  }

  if (postId) {
    post = (await db('posts').where({ postId })).pop();
    if (post.status === config.postStatus.published) {
      return res.send(
        new ApiResponse('Post is already published', null, 0).response
      );
    }

    if (!isOpen && !categoryId && !post.categoryId) {
      return res.send(
        new ApiResponse('Category is required', null, 0).response
      );
    }

    if (!isOpen && !categoryId && post.categoryId) {
      categoryId = post.categoryId;
    }
  }

  if (!postId && !status) status = config.postStatus.draft;
  if (
    ![
      config.postStatus.draft,
      config.postStatus.published,
      config.postStatus.discarded,
      config.postStatus.deleted,
    ].includes(status)
  ) {
    return res.send(new ApiResponse('Invalid post status', null, 0).response);
  }

  if (!postId && !isOpen && !hasValue(categoryId)) {
    return res.send(new ApiResponse('Category is required', null, 0).response);
  }

  if (!postId && !isUrl(videoUrl)) {
    return res.send(new ApiResponse('Invalid Video URL', null, 0).response);
  }

  if (!postId && !isUrl(videoUrl)) {
    return res.send(new ApiResponse('Invalid Video URL', null, 0).response);
  }

  let videoStreamUrl;
  if (videoUrl) {
    videoStreamUrl = getStreamUrl(videoUrl);
  }
  //console.log('videoStreamUrl:', videoStreamUrl);
  if (imageUrl) {
    imageUrl = getImageUrl(imageUrl);
  }

  if (soundId) {
    const soundExists = (await db('sounds').where('id', soundId)).pop();

    if (!soundExists) {
      return next(createError(401, 'Invalid sound'));
    }
  }

  try {
    let duetUser;
    if (duetWith) {
      duetUser = (
        await db('users').select('userId').where('userName', duetWith)
      ).pop();
      if (!duetUser) duetWith = null;
    }

    let mentions, hashtags;

    if (description) {
      mentions = await createMentions(utils.parseMentions(description));

      description = description.replace(/\n/gi, '');
      hashtags = await createHashtags(twitter.extractHashtags(description));
      // get the list this user's following to check valid mentions
      let followings = await db
        .select('followedUserId')
        .from('user_follows')
        .where('userId', req.user.userId);
      followings = _.map(followings, 'followedUserId');

      // remove the mentions that are not followed by this user
      mentions = mentions.filter((m) => {
        return followings.includes(m.userId);
      });

      if (duetUser && !mentions.includes(duetUser.userId)) {
        mentions.push(duetUser);
      }
      hashtags = _.map(hashtags, 'tagId');
      mentions = _.map(mentions, 'userId');
    }

    if ([true, 'true'].indexOf(isLandscape) >= 0) {
      isLandscape = true;
    } else {
      isLandscape = false;
    }

    // check user is sponsored
    const user = (
      await db('users').select(['sponsored']).where('userId', req.user.userId)
    ).pop();

    let sponsored = false;
    if (user.sponsored) {
      sponsored = true;
    }

    let publishedTs;
    if (status === config.postStatus.published) {
      publishedTs = new Date();
    }
    let post;
    if (!postId) {
      post = (
        await db('posts')
          .insert({
            userId: req.user.userId,
            categoryId,
            soundId,
            status,
            description,
            videoStreamUrl,
            duetWith,
            imageUrl,
            isLandscape,
            sponsored,
            hashtags,
            mentions,
            isOpen: isOpen || false,
            updatedTs: new Date(),
            publishedTs,
            iOSFront,
          })
          .returning('*')
      ).pop();
      postId = post.postId;
    } else {
      post = (
        await db('posts')
          .update({
            categoryId,
            soundId,
            status,
            description,
            videoStreamUrl,
            duetWith,
            imageUrl,
            isLandscape,
            sponsored,
            hashtags,
            mentions,
            isOpen: isOpen || false,
            updatedTs: new Date(),
            createdTs: new Date(),
            publishedTs,
            iOSFront,
          })
          .update('updatedTs', 'now()')
          .where({ postId })
          .returning('*')
      ).pop();
    }

    if (post.status === config.postStatus.published && post.soundId) {
      updatePostCount(post.soundId);
    }

    if (post.status === config.postStatus.published && post.categoryId) {
      await updateCategoryTotalPosts(post.categoryId);
    }

    let postVideoPath, postVideoId;
    if (post.status === config.postStatus.published) {
      const { filepath, uuid } = await getFinalVideoURL(post);
      postVideoPath = filepath;
      postVideoId = uuid;
    }
    const newPostResult = (await getSinglePost(postId, req.user.userId)).pop();

    if (post.mentions && post.mentions.length) {
      sendPostMention(post, function () {
        res.send(new ApiResponse('Post created', newPostResult).response);
      });
    } else {
      res.send(new ApiResponse('Post created', newPostResult).response);
    }

    if (post.status === config.postStatus.published) {
      await db('skipped_categories')
        .where('userId', req.user.userId)
        .andWhere('categoryId', post.categoryId)
        .del();

      const postCounts = (
        await db.raw(
          `
          SELECT
            COUNT(DISTINCT "categoryId")::integer
          FROM
            posts p
          WHERE
            p."userId" = ? AND p."status" = 'published'
        `,
          [req.user.userId]
        )
      ).rows.pop();

      await db('users')
        .update('postCount', parseInt(postCounts.count))
        .where('userId', req.user.userId);

      if (videoUrl) {
        await watermark(videoUrl, newPostResult, postVideoPath, postVideoId);
        deleteOldMedia(postMedia);
      }
    }
  } catch (error) {
    console.log(`[newPost] error: ${error}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const categoriesWithPosts = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[categoriesWithPosts] body: ${JSON.stringify(body)}`);

    if (body.nextPageId && !isNaN(body.nextPageId)) {
      body.nextPageId = parseInt(body.nextPageId);
    }

    let query;
    let ordering = 'priority ASC';
    let join = '';
    let conditionalSelect = '';

    const userLocation = (
      await db('user_location_info').where('userId', req.user.userId)
    ).pop();

    let result = [];

    if (!userLocation) {
      result = await categoryQueries.categoriesWithPosts(
        req.user.userId,
        body.nextPageId
      );
    } else {
      console.log(`[categoriesWithPosts] country: ${userLocation.country}`);
      result = await categoryQueries.categoriesWithPostsByCountry(
        req.user.userId,
        userLocation.country,
        body.nextPageId
      );
    }

    let rows = result.rows.map((row) => {
      if (!row.videoUrl && row.posts && row.posts.length) {
        row.videoUrl = row.posts[0].videoUrl;
      }
      return row;
    });
    if (!hasResult(rows)) {
      return res.send(
        new ApiResult().sendStatus(Responses.POSTS.NO_CATEGORIES)
      );
    }
    rows = rows.map((row) => {
      if (row.skipped) {
        row.status = 'skipped';
      } else if (!row.skipped && row.uploaded) {
        row.status = 'completed';
      } else if (!row.skipped && !row.uploaded) {
        row.status = 'pending';
      }
      row.posts = (row.posts || []).map((p) => {
        p.createdTs = new Date(p.createdTs).toISOString();
        if (p.updatedTs) p.updatedTs = new Date(p.updatedTs).toISOString();
        return p;
      });
      delete row.skipped;
      delete row.uploaded;
      delete row.postId;
      delete row.skippedCategoryId;
      return row;
    });
    let nextPageId = null;
    if (rows.length >= config.paging.ROWS_PER_PAGE_20) {
      const lastRow = rows.pop();
      nextPageId = lastRow.priority;
    }

    return res.send(
      new ApiResult(
        'Categories found',
        rows,
        parseInt(body.nextPageId),
        nextPageId
      ).success()
    );
  } catch (error) {
    console.log(`[categoriesWithPosts] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getSkippedCategories = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[getSkippedCategories] body: ${JSON.stringify(body)}`);
    let { nextPageId } = body;
    if (nextPageId) nextPageId = parseInt(nextPageId);
    const { userId } = req.user;
    const q = skippedCategories(userId, nextPageId, ROWS_PER_PAGE_30 + 1);

    let rows = await q.then();

    if (!hasResult(rows)) {
      return res.send(
        new ApiResult().sendStatus(Responses.POSTS.NO_CATEGORIES)
      );
    }

    let nextPage = null;
    if (rows.length >= ROWS_PER_PAGE_30) {
      const lastRow = rows.pop();
      nextPage = lastRow.skippedCategoryId;
    }
    rows = rows.map((row) => {
      row.status = 'skipped';
      row.uploadedPostId = null;
      //row.totalPosts = 0;
      delete row.skippedCategoryId;
      return row;
    });

    return res.send(
      new ApiResult('Categories found', rows, nextPageId, nextPage).success()
    );
  } catch (error) {
    console.log(`[getSkippedCategories] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getCompletedCategories = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[getCompletedCategories] body: ${JSON.stringify(body)}`);
    let { nextPageId } = body;
    if (nextPageId) nextPageId = parseInt(nextPageId);
    const { userId } = req.user;

    const q = completedCategories(userId, nextPageId, ROWS_PER_PAGE_30 + 1);

    let rows = await q.then();

    if (!hasResult(rows)) {
      return res.send(
        new ApiResult().sendStatus(Responses.POSTS.NO_CATEGORIES)
      );
    }

    let nextPage = null;
    if (rows.length >= ROWS_PER_PAGE_30) {
      const lastRow = rows.pop();
      nextPage = lastRow.postId;
    }
    rows = rows.map((row) => {
      row.status = 'completed';
      return row;
    });
    return res.send(
      new ApiResult('Categories found', rows, nextPageId, nextPage).success()
    );
  } catch (error) {
    console.log(`[getCompletedCategories] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getPendingCategories = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[getPendingCategories] body: ${JSON.stringify(body)}`);
    let { text, subcategoryId, nextPageId } = body;
    if (nextPageId) nextPageId = parseInt(nextPageId);
    const { userId } = req.user;
    const q = pendingCategries(
      userId,
      text,
      subcategoryId,
      nextPageId,
      ROWS_PER_PAGE_30 + 1
    );

    let rows = await q.then();

    if (!hasResult(rows)) {
      return res.send(
        new ApiResult().sendStatus(Responses.POSTS.NO_CATEGORIES)
      );
    }

    let nextPage = null;
    if (rows.length >= ROWS_PER_PAGE_30) {
      const lastRow = rows.pop();
      //nextPage = lastRow.priority;
      nextPage =
        nextPageId > 0 ? nextPageId + ROWS_PER_PAGE_30 : ROWS_PER_PAGE_30;
    }
    rows = rows.map((row) => {
      row.status = 'pending';
      row.uploadedPostId = null;
      //row.totalPosts = 0;
      delete row.skippedCategoryId;
      return row;
    });
    return res.send(
      new ApiResult('Categories found', rows, nextPageId, nextPage).success()
    );
  } catch (error) {
    console.log(`[getPendingCategories] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getCategories = async (req, res, next) => {
  try {
    const body = req.body;
    if (body.status === 'pending') {
      return getPendingCategories(req, res, next);
    } else if (body.status === 'skipped') {
      return getSkippedCategories(req, res, next);
    } else if (body.status === 'completed') {
      return getCompletedCategories(req, res, next);
    }
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  } catch (error) {
    console.log(`[getCategories] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deletePost = async (req, res, next) => {
  const params = req.params;
  console.log(`[deletePost] params: ${JSON.stringify(params)}`);

  try {
    const post = (
      await db('posts').where({
        postId: params.postId,
      })
    ).pop();

    if (post.status === config.postStatus.deleted) {
      return next(createError(400, 'Already deleted'));
    }
    const result = (
      await db('posts')
        .update({ status: config.postStatus.deleted, isDeleted: true })
        .where('postId', params.postId)
        .andWhere('userId', req.user.userId)
        .returning('*')
    ).pop();

    const postCounts = (
      await db.raw(
        `
        SELECT
          COUNT(DISTINCT "categoryId")::integer
        FROM
          posts p
        WHERE
          p."userId" = ? AND p."status" = 'published'
      `,
        [req.user.userId]
      )
    ).rows.pop();

    await db('users')
      .update('postCount', parseInt(postCounts.count))
      .where('userId', req.user.userId);

    if (result.categoryId) {
      await updateCategoryTotalPosts(result.categoryId);
    }

    await deletePostNotifications(params.postId);

    if (hasValue(result)) {
      if (result.soundId) {
        updatePostCount(soundId);
      }
    }
    return res.send(new ApiResponse('Post deleted', result).response);
  } catch (error) {
    console.log(`[deletePost] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postVideo = async (req, res, next) => {
  console.log(`[postVideo]`);
  const form = new formidable.IncomingForm(),
    files = [],
    fields = {};

  form.uploadDir = os.tmpdir();
  form
    .on('field', function (field, value) {
      console.log(`[postVideo][field] ${field}: ${value}`);
      fields[field] = value;
    })
    .on('fileBegin', function (name, file) {
      console.log(`[postVideo][fileBegin]`);
      const extension = file.name.split('.').pop();
      const fileName = `${Date.now().toString(32)}.${extension}`;
      file.path = `${form.uploadDir}/${fileName}`;
      file.name = fileName;

      console.log(`[postVideo][fileBegin] ${fileName}`);
    })
    .on('file', function (field, file) {
      console.log(`[postVideo][file] ${JSON.stringify(file)}`);
      files.push(file);
    })
    .on('end', async function () {
      try {
        const postExists = await db('posts').where('postId', fields.postId);
        if (!hasResult(postExists)) {
          return next(
            createError(
              401,
              'Server is busy at the moment, please try again later.'
            )
          );
        }
        console.log(`[postVideo][end] fields: ${JSON.stringify(fields)}`);

        const video = files[0];
        let fileName;
        fileName = `p_/${video.name}`;
        const args = {
          fileName: fileName,
          file: fs.readFileSync(video.path),
          contentType: video.type,
        };

        fileUploader.uploadFile(args, async (err, result) => {
          if (err) {
            console.log('error: ', err);
            return next(createError(502, 'Error while uploading'));
          }
          console.log('upload: ', result);
          try {
            const videoUrl = `${S3_URL_PREFIX}/${args.fileName}`;
            const rows = await db('posts')
              .update(
                {
                  videoUrl: videoUrl,
                },
                ['videoUrl', 'postId']
              )
              .where('postId', fields.postId);
            if (hasResult(rows)) {
              return res.send(
                new ApiResponse('Post video updated', rows.pop()).response
              );
            } else {
              return next(
                createError(
                  502,
                  'Server is busy at the moment, please try again later.'
                )
              );
            }
          } catch (error) {
            console.log(error.stack);
            return next(
              createError(
                502,
                'Server is busy at the moment, please try again later.'
              )
            );
          }
        });
      } catch (error) {
        console.log(`[deletePost] error: ${error.stack}`);
        return next(
          createError(
            502,
            'Server is busy at the moment, please try again later.'
          )
        );
      }
    });
  form.parse(req);
};

const postView = async (req, res, next) => {
  try {
    let body = req.body;
    console.log(`[postView] body: ${JSON.stringify(body)}`);

    if (!hasValue(body.postId)) {
      return next(createError('Post id is required'));
    }

    body = {
      userId: req.user.userId,
      postId: body.postId,
    };

    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    // const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    // if (blocked) {
    //   if (blocked.userId === req.user.userId) {
    //     return next(createError(401, 'Please unblock the user'));
    //   }
    //   return next(createError(401, 'Posts unavailable'));
    // }

    const trx = await getTransaction(db);
    try {
      await db('post_views')
        .insert(body)
        .into('post_views')
        .transacting(trx)
        .returning('*');

      const viewCount = (
        await db('post_views')
          .transacting(trx)
          .where({ postId: body.postId })
          .count()
      ).pop();

      const userPostViews = (
        await db('post_views')
          .transacting(trx)
          .whereIn(
            'postId',
            db('posts')
              .select('postId')
              .where('userId', _post.userId)
              .andWhere('status', config.postStatus.published)
          )
          .count()
      ).pop();

      await db('users')
        .transacting(trx)
        .update('postViewCount', parseInt(userPostViews.count))
        .where('userId', _post.userId);

      await db('posts')
        .transacting(trx)
        .update('views', parseInt(viewCount.count))
        .where('postId', body.postId);
      await trx.commit();
      const result = {
        postId: body.postId,
        views: viewCount.count,
      };
      sendPostViewIncrease(result, function () {
        return res.send(
          new ApiResponse('Post view count updated', result).response
        );
      });
    } catch (err) {
      await trx.rollback();
      console.log(`[postView] error: ${err.message}`);
      if (
        err.message.includes('duplicate') &&
        err.message.includes('post_views_unique')
      ) {
        return next(createError(401, 'Post view by this user already updated'));
      }
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
  } catch (error) {
    console.log(`[postView] error: ${error.message}`);
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const commentLike = async (req, res, next) => {
  try {
    const { commentId, like } = req.body;
    const { userId } = req.user;

    console.log(`[commentLike] commentId : ${commentId}`);
    console.log(`[commentLike] like : ${like}`);
    console.log(`[commentLike] userId    : ${userId}`);

    if (!commentId) {
      return next(createError('Comment ID is required'));
    }

    const _comment = (await db('post_comments').where({ commentId })).pop();
    if (!_comment) {
      return next(createError('The comment is unavailable'));
    }

    if (like === true) {
      const _commentLike = (
        await db('comment_likes').where({ commentId, userId })
      ).pop();
      if (_commentLike) {
        return next(createError('You already liked this comment'));
      }
    }

    const blocked = await checkIsBlocked(userId, _comment.userId);

    console.log(`[commentLike] blocked: ${JSON.stringify(blocked)}`);
    if (blocked) {
      if (blocked.userId === userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Comment is unavailable'));
    }

    const trx = await getTransaction(db);
    try {
      if (like === true) {
        await db('comment_likes')
          .transacting(trx)
          .insert({ commentId, userId })
          .returning('*');
      } else {
        await db('comment_likes')
          .transacting(trx)
          .where({ commentId, userId })
          .del();
      }

      const numLikes = (
        await db('comment_likes').transacting(trx).where({ commentId }).count()
      ).pop();

      await db('post_comments')
        .transacting(trx)
        .update('likes', numLikes.count)
        .where({ commentId });

      await trx.commit();

      res.send(
        new ApiResponse(`Comment ${like ? 'like' : 'unlike'} successful`)
          .response
      );
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.log(`[commentLike] error: ${error.stack}`);
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const like = async (req, res, next) => {
  let body = req.body;
  console.log(`[like] body: ${JSON.stringify(body)}`);
  console.log(`[like] user: ${req.user.userId}`);
  if (!hasValue(body.postId)) {
    return next(createError('Post id is required'));
  }

  body = {
    userId: req.user.userId,
    postId: body.postId,
  };

  const _post = await fetchPost(body.postId);
  //console.log(blocked);
  console.log(`[like] _post: ${JSON.stringify(_post)}`);
  if (!_post) {
    return next(createError('The post is unavailable'));
  }
  let sendAlert = true;
  if (_post.userId === body.userId) {
    sendAlert = false;
  }
  const blocked = await checkIsBlocked(req.user.userId, _post.userId);
  console.log(`[like] blocked: ${JSON.stringify(blocked)}`);
  if (blocked) {
    if (blocked.userId === req.user.userId) {
      return next(createError(401, 'Please unblock the user'));
    }
    return next(createError(401, 'Post is unavailable'));
  }

  console.log(
    `[like] userId: ${body.userId}, postUserId: ${_post.userId}, sendAlert: ${sendAlert}`
  );

  const trx = await getTransaction(db);
  try {
    const likeObj = (
      await db('post_likes').transacting(trx).insert(body).returning('*')
    ).pop();

    const likesCount = (
      await db('post_likes')
        .transacting(trx)
        .where({ postId: body.postId })
        .count()
    ).pop();

    await db('posts')
      .transacting(trx)
      .update('likes', parseInt(likesCount.count))
      .where('postId', body.postId);

    await trx.commit();
    const result = {
      postId: likeObj.postId,
      likes: parseInt(likesCount.count),
    };
    if (sendAlert) {
      sendPostLike(likeObj, function () {
        res.send(new ApiResponse('Post like successful', result).response);
      });
    } else {
      res.send(new ApiResponse('Post like successful', result).response);
    }
  } catch (err) {
    await trx.rollback();
    console.log(`[like] error: ${err.stack}`);
    if (
      err.message.includes('duplicate') &&
      err.message.includes('post_like_unique')
    ) {
      return next(createError(401, 'Post already liked'));
    }
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const unlike = async (req, res, next) => {
  let body = req.body;
  console.log(`[unlike] body: ${JSON.stringify(body)}`);

  if (!hasValue(body.postId)) {
    return next(createError('Post id is required'));
  }

  body = {
    userId: req.user.userId,
    postId: body.postId,
  };
  try {
    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Post is unavailable'));
    }

    const trx = await getTransaction(db);
    try {
      await db('post_likes')
        .transacting(trx)
        .where('userId', body.userId)
        .andWhere('postId', body.postId)
        .del();

      const likesCount = (
        await db('post_likes')
          .transacting(trx)
          .where({ postId: body.postId })
          .count()
      ).pop();

      await db('posts')
        .transacting(trx)
        .update('likes', parseInt(likesCount.count))
        .where('postId', body.postId);

      await trx.commit();
      const result = {
        postId: body.postId,
        likes: parseInt(likesCount.count),
      };
      return res.send(
        new ApiResponse('Post unlike successful', result).response
      );
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.log(`[unlike] error: ${error.stack}`);
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const bless = async (req, res, next) => {
  let body = req.body;
  console.log(`[bless] body: ${JSON.stringify(body)}`);

  if (!hasValue(body.postId)) {
    return next(createError('Post id is required'));
  }

  body = {
    userId: req.user.userId,
    postId: body.postId,
  };

  try {
    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Post is unavailable'));
    }

    // const postUserId = postValid[0].userId;
    // const array = `ARRAY[${req.user.userId}, ${postUserId}]`;
    // const blockQuery = `
    //   SELECT * FROM user_blocks
    //   WHERE "userId" = ANY(${array}) AND "blockedUserId" = ANY(${array});
    // `;
    // console.log(`[postComment] blockQuery: ${blockQuery}`);
    // const isBlocked = await db.raw(blockQuery);
    // if(isBlocked.rows && hasResult(isBlocked.rows)){
    //   return next(createError(401, 'Invalid post'));
    // }

    db.transaction((trx) => {
      return db
        .transacting(trx)
        .insert(body, '*')
        .into('post_blessings')
        .then(() => {
          return db('posts')
            .increment('blessings', 1)
            .where('postId', body.postId)
            .transacting(trx);
        })
        .then(() => {
          return db
            .select(['postId', 'blessings'])
            .from('posts')
            .transacting(trx)
            .where('postId', body.postId);
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
      .then((rows) => {
        return res.send(
          new ApiResponse('Post bless successful', rows.pop()).response
        );
      })
      .catch((err) => {
        console.log(`[bless] error: ${err.stack}`);
        next(
          createError(
            401,
            'Server is busy at the moment, please try again later.'
          )
        );
      });
  } catch (error) {
    console.log(`[bless] error: ${error.stack}`);
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const unbless = async (req, res, next) => {
  let body = req.body;
  console.log(`[unbless] body: ${JSON.stringify(body)}`);

  if (!hasValue(body.postId)) {
    return next(createError('Post id is required'));
  }

  body = {
    userId: req.user.userId,
    postId: body.postId,
  };
  try {
    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Post is unavailable'));
    }

    db.transaction((trx) => {
      return db('post_blessings')
        .transacting(trx)
        .where('userId', body.userId)
        .andWhere('postId', body.postId)
        .del()
        .then(() => {
          return db('posts')
            .transacting(trx)
            .decrement('blessings', 1)
            .where('postId', body.postId)
            .returning(['postId', 'likes']);
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
      .then((rows) => {
        return res.send(
          new ApiResponse('Post unbless successful', rows.pop()).response
        );
      })
      .catch((err) => {
        console.log(`[unbless] error: ${err.stack}`);
        next(
          createError(
            401,
            'Server is busy at the moment, please try again later.'
          )
        );
      });
  } catch (error) {
    console.log(`[unbless] error: ${error.stack}`);
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postComment = async (req, res, next) => {
  const body = req.body;
  try {
    console.log(`[postComment] body: ${JSON.stringify(body)}`);
    body.userId = req.user.userId;
    if (!hasValue(body.postId)) {
      return res.send(
        new ApiResult().sendStatus(Responses.POSTS.POST_ID_REQUIRED)
      );
    }
    if (!hasValue(body.comment)) {
      return res.send(
        new ApiResult().sendStatus(Responses.POSTS.COMMENT_REQUIRED)
      );
    }

    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    // console.log(_post, typeof body.userId, typeof _post.userId);
    let sendAlert = true;
    if (_post.userId === body.userId) {
      sendAlert = false;
    }

    const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Post is unavailable'));
    }
    console.log(
      `[postComment] userId: ${body.userId}, postUserId: ${_post.userId}, sendAlert: ${sendAlert}`
    );

    if (hasValue(body.replyTo)) {
      const parentComment = await db
        .select(['replyTo'])
        .from('post_comments')
        .where('commentId', body.replyTo);
      const _comment = parentComment[0];
      // console.log(_comment);
      if (!hasResult(parentComment) || hasValue(_comment.replyTo)) {
        return res.send(
          new ApiResult().sendStatus(Responses.GENERAL.SERVER_ERR)
        );
      }
    } else {
      delete body.replyTo;
    }

    const mentions = await createMentions(utils.parseMentions(body.comment));
    console.log(`[postComment] mentions: ${JSON.stringify(mentions)}`);

    const hashtags = await createHashtags(
      twitter.extractHashtags(body.comment)
    );
    console.log(`[postComment] hashtags: ${JSON.stringify(hashtags)}`);

    body.hashtags = _.map(hashtags, 'tagId');
    body.mentions = _.map(mentions, 'userId');

    const trx = await getTransaction(db);
    try {
      console.log(`[postComment] body: ${JSON.stringify(body)}`);
      const comment = (
        await db('post_comments').transacting(trx).insert(body).returning('*')
      ).pop();

      const commentCount = (
        await db('post_comments')
          .transacting(trx)
          .where({ postId: body.postId })
          .andWhere('isDeleted', false)
          .count()
      ).pop();

      await db('posts')
        .transacting(trx)
        .update({ comments: parseInt(commentCount.count) })
        .where({ postId: body.postId });

      await trx.commit();
      const commentDetailed = await getSingleComment(
        comment.commentId,
        req.user.userId
      );

      if (sendAlert) {
        sendPostComment(comment, function () {
          res.send(new ApiResult('Success', commentDetailed.pop()).success());
        });
      } else {
        res.send(new ApiResult('Success', commentDetailed.pop()).success());
      }
    } catch (error) {
      console.log(`[postComment] error: ${error.stack}`);
      await trx.rollback();
      return res.send(new ApiResult().sendStatus(Responses.GENERAL.SERVER_ERR));
    }
  } catch (error) {
    console.log(`[postComment] error: ${error.stack}`);
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const searchHashtags = async (req, res, next) => {
  const body = req.body;
  console.log(`[searchHashtags] body: ${JSON.stringify(body)}`);
  try {
    if (!hasValue(body.text)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
    let condition = ``;
    if (body.nextPageId) body.nextPageId = parseInt(body.nextPageId);
    if (hasValue(body.nextPageId)) {
      condition = `AND h."tagId" <= ${body.nextPageId}`;
    }
    const query = `
      SELECT
        h."hashtag",
        (
          SELECT "imageUrl"
          FROM posts
          WHERE h."tagId" = ANY(hashtags)
          ORDER BY "postId" DESC LIMIT 1
        ) "imageUrl",
        (
          SELECT
            COUNT(p."postId")::INTEGER
          FROM posts p
          WHERE h."tagId" = ANY(p.hashtags) AND p."status" = 'published'
        ) "postCount"
      FROM hashtags h
      WHERE h.hashtag ILIKE '%${body.text}%' ${condition}
      ORDER BY "postCount" DESC
      LIMIT ${ROWS_PER_PAGE_20 + 1}
    `;

    const result = await db.raw(query);
    let rows = result.rows;

    if (!hasResult(rows)) {
      return next(createError(401, 'No hashtags found'));
    }
    let nextPageId = 0;
    if (rows.length >= ROWS_PER_PAGE_20) {
      const lastRow = rows.pop();
      nextPageId = lastRow.tagId;
    }
    res.send(
      new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
    );
    //res.send(new ApiResponse('Success', rows).response);
  } catch (error) {
    console.log(`[searchHashtags] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getComments = async (req, res, next) => {
  const body = req.body;
  const { userId } = req.user;
  const { postId } = req.body;
  console.log(`[getComments] user: ${userId}, body: ${JSON.stringify(body)}`);

  try {
    if (!hasValue(body.postId)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    let condition = ``;
    if (hasValue(body.nextPageId) && !isNaN(parseInt(body.nextPageId))) {
      body.nextPageId = parseInt(body.nextPageId);
      condition = `AND c."commentId" <= ${body.nextPageId}`;
    }

    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Posts unavailable'));
    }

    const rows = await getCommentsQuery(
      postId,
      userId,
      condition,
      ROWS_PER_PAGE_20 + 1
    );

    if (!hasResult(rows)) {
      return res.send(new ApiResult().sendStatus(Responses.POSTS.NO_COMMENTS));
    }
    let nextPageId = 0;
    if (rows.length >= ROWS_PER_PAGE_20) {
      let lastRow = rows.pop();
      nextPageId = parseInt(lastRow.commentId);
    }
    //res.send(new ApiResponse('Success', rows).response);
    res.send(
      new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
    );
  } catch (error) {
    console.log(`[getComments] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getLikes = async (req, res, next) => {
  const body = req.body;
  console.log(`[getLikes] body: ${JSON.stringify(body)}`);
  // console.log(`[getLikes] user: ${JSON.stringify(req.user)}`);

  try {
    if (!hasValue(body.postId)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    // console.log(`[getLikes] post: ${JSON.stringify(_post)}`);

    const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    // console.log(`blocked: `, blocked);

    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Posts unavailable'));
    }

    let condition = '';
    if (body.nextPageId && !isNaN(parseInt(body.nextPageId))) {
      condition = ` AND "likeId" <= ${body.nextPageId}`;
    }

    const { userId } = req.user;
    const { postId } = req.body;

    const result = await getLikesQuery(
      postId,
      userId,
      condition,
      ROWS_PER_PAGE_30 + 1
    );
    const rows = result.rows;
    if (!hasResult(result.rows)) {
      return next(createError(401, 'No result found'));
    }
    let nextPageId = 0;
    if (rows.length >= ROWS_PER_PAGE_30) {
      let lastRow = rows.pop();
      nextPageId = lastRow.likeId;
    }
    //res.send(new ApiResponse('Success', result.rows).response);
    res.send(
      new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
    );
  } catch (error) {
    console.log(`[getLikes] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getBlessings = async (req, res, next) => {
  const body = req.body;
  console.log(`[getBlessings] body: ${JSON.stringify(body)}`);
  const { userId } = req.user;
  const { postId } = req.body;
  try {
    if (!hasValue(body.postId)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    const _post = await fetchPost(body.postId);
    if (!_post) {
      return next(createError('The post is unavailable'));
    }
    const blocked = await checkIsBlocked(req.user.userId, _post.userId);
    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'Posts unavailable'));
    }

    let condition = '';
    if (body.nextPageId) {
      condition = ` AND "blessingId" <= ${body.nextPageId}`;
    }

    const result = await getBlessingsQuery(
      postId,
      userId,
      condition,
      ROWS_PER_PAGE_30 + 1
    );
    const rows = result.rows;
    if (!hasResult(result.rows)) {
      return next(createError(401, 'No result found'));
    }
    let nextPageId = 0;
    if (rows.length >= ROWS_PER_PAGE_30) {
      let lastRow = rows.pop();
      nextPageId = lastRow.blessingId;
    }
    res.send(
      new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
    );
  } catch (error) {
    console.log(`[getBlessings] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const removeMention = async (req, res, next) => {
  const body = req.body;
  console.log(`[removeMention] body: ${JSON.stringify(body)}`);
  try {
    if (!hasValue(body.postId)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    if (!hasValue(body.userId)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    const postUpdate = await db.raw(`
      UPDATE posts
      SET mentions = array_remove(mentions, ${req.user.userId})
      WHERE "postId" = ${body.postId} AND ${req.user.userId} = ANY(mentions)
    `);
    if (!hasValue(postUpdate.rowCount)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
    const rows = await getSinglePost(body.postId, req.user.userId);
    res.send(new ApiResult('Success', rows.pop()).success());
  } catch (error) {
    console.log(`[getBlessings] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[deleteComment] body: ${JSON.stringify(body)}`);

    if (!hasValue(body.commentId)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    const result = (
      await db('post_comments')
        .update('isDeleted', true)
        .where('commentId', body.commentId)
        .returning('*')
    ).pop();

    if (!result) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    const commentCount = (
      await db('post_comments')
        .where({ postId: result.postId })
        .andWhere('isDeleted', false)
        .count()
    ).pop();

    await db('posts')
      .update({ comments: parseInt(commentCount.count) })
      .where({ postId: result.postId });

    return res.send(new ApiResult('Success', result).success());
  } catch (error) {
    console.log(`[deleteComment] error: ${error.stack}`);
    return next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const skipCategory = async (req, res, next) => {
  try {
    const data = req.body;
    console.log(
      `[skipCategory] data: ${JSON.stringify(data)}, user: ${req.user.userId}`
    );

    const category = await db('categories')
      .select(['categoryId'])
      .where('categoryId', data.categoryId);

    if (!hasResult(category)) {
      return next(createError(401, 'Invalid category'));
    }
    const skipped = await db('skipped_categories')
      .where('userId', req.user.userId)
      .andWhere('categoryId', data.categoryId);

    if (hasResult(skipped)) {
      return next(createError(401, 'Category is already skipped'));
    }

    await db('skipped_categories').insert({
      userId: req.user.userId,
      categoryId: data.categoryId,
    });

    res.send(new ApiResult('Success', {}).success());
  } catch (error) {
    console.log(`[skipCategory] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getAllDrafts = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const rows = await db('posts as p')
      .select([
        'p.postId',
        'p.videoUrl',
        'p.videoStreamUrl',
        'p.imageUrl',
        'p.userId',
        'p.description',
        'p.status',
        'p.createdTs',
        'p.updatedTs',
        'p.isLandscape',
        'p.isOpen',
        'p.sponsored',
        'p.duetWith',
        db.raw(`
      (
        SELECT row_to_json(c)
          FROM(
            SELECT
              c."categoryId",
              c."categoryName",
              c."isDeleted",
              c."imageUrl",
              (
                SELECT
                  count(p."postId")::INTEGER
                FROM posts p
                WHERE p."categoryId" = c."categoryId" AND p."status" = 'published'
              ) "totalPosts"
            FROM categories c
            WHERE c."categoryId" = p."categoryId"
          ) c
        ) "category"`),
      ])
      .where('p.userId', userId)
      .andWhere('p.status', config.postStatus.draft)
      .orderBy('postId', 'desc');

    res.send(new ApiResult('Success', rows).success());
  } catch (error) {
    console.log(`[getAllDrafts] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postFromUserCirlce = async (req, res, next) => {
  try {
    const body = req.body;

    console.log(
      `[postFromUserCirlce] user: ${req.user.userId},  body: ${JSON.stringify(
        body
      )}`
    );

    let userId = req.user.userId;
    let targetUserId = req.user.userId;

    if (!body.userId && body.userName) {
      console.log(`[postFromUserCirlce] getting userId`);
      const targetUser = (
        await db('users').select('userId').where('userName', body.userName)
      ).pop();
      targetUserId = targetUser.userId;
      console.log(`[postFromUserCirlce] userId: ${userId}`);
    } else if (body.userId) {
      targetUserId = body.userId;
    } else {
      targetUserId = req.user.userId;
    }
    const query = fromUserCircle(
      userId,
      targetUserId,
      ROWS_PER_PAGE_20 + 1,
      body.nextPageId
    );
    const result = await query.then();

    if (hasResult(result)) {
      let rows = result;
      let nextPageId = 0;
      if (rows.length >= ROWS_PER_PAGE_20) {
        const lastRow = rows.pop();
        nextPageId = lastRow.postId;
      }

      return res.send(
        new ApiResult(
          'Success',
          replaceDomains(rows),
          parseInt(body.nextPageId),
          parseInt(nextPageId)
        ).success()
      );
    } else {
      return next(createError(502, 'No posts found'));
    }
  } catch (error) {
    console.log(`[postFromUserCirlce] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postByHashtag = async (req, res, next) => {
  try {
    const body = req.body;

    console.log(`[postByHashtag]  body: ${JSON.stringify(body)}`);

    let { userId } = req.user;
    let { nextPageId, hashtag } = req.body;
    nextPageId = parseInt(nextPageId);
    if (isNaN(nextPageId)) {
      nextPageId = 0;
    }

    const tag = (await db('hashtags').where({ hashtag })).pop();
    if (!tag) {
      return res.send(new ApiResult('Success', [], 0, 0).success());
    }
    const query = searchByText(
      tag.tagId,
      userId,
      ROWS_PER_PAGE_20 + 1,
      nextPageId,
      true
    );

    const result = await query.then();

    if (hasResult(result)) {
      let rows = result;
      let nextPage = 0;
      if (rows.length >= ROWS_PER_PAGE_20) {
        const lastRow = rows.pop();
        nextPage = nextPageId + ROWS_PER_PAGE_20;
      }

      return res.send(
        new ApiResult('Success', rows, nextPageId, nextPage).success()
      );
    } else {
      return next(createError(502, 'No posts found'));
    }
  } catch (error) {
    console.log(`[postByHashtag] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postByCategory = async (req, res, next) => {
  try {
    const body = req.body;

    console.log(`[postByCategory]  body: ${JSON.stringify(body)}`);

    let userId = req.user.userId;

    const query = searchByCategory(
      req.body.categoryId,
      userId,
      ROWS_PER_PAGE_20 + 1,
      body.nextPageId
    );

    const result = await query.then();

    if (hasResult(result)) {
      let rows = result;
      let nextPageId = 0;
      if (rows.length >= ROWS_PER_PAGE_20) {
        const lastRow = rows.pop();
        nextPageId = lastRow.postId;
      }

      return res.send(
        new ApiResult(
          'Success',
          replaceDomains(rows),
          parseInt(body.nextPageId),
          parseInt(nextPageId)
        ).success()
      );
    } else {
      return next(createError(502, 'No posts found'));
    }
  } catch (error) {
    console.log(`[postByCategory] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postUserUploaded = async (req, res, next) => {
  try {
    let { userId: targetUserId, nextPageId } = req.body;
    let userId = req.user.userId;
    console.log(`[postUserUploaded]  body: ${JSON.stringify(req.body)}`);
    console.log(
      `[postUserUploaded]  targetUserId: ${targetUserId}, userId: ${userId}`
    );

    const selfUser = targetUserId == userId;

    console.log(`[postUserUploaded]  selfUser: ${selfUser}`);

    if (nextPageId) nextPageId = parseInt(nextPageId);

    const query = postByUserUploaded(
      targetUserId,
      userId,
      ROWS_PER_PAGE_20 + 1,
      nextPageId
    );

    const result = await query.then();

    if (hasResult(result)) {
      let rows = result;
      let nextPage = 0;
      if (rows.length >= ROWS_PER_PAGE_20) {
        const lastRow = rows.pop();
        if (selfUser) {
          nextPage = parseInt(
            new Date(lastRow.updatedTs || lastRow.createdTs).getTime() / 1000
          );
        } else {
          nextPage = parseInt(lastRow.postId);
        }
      }

      return res.send(
        new ApiResult(
          'Success',
          replaceDomains(rows),
          nextPageId,
          nextPage
        ).success()
      );
    } else {
      return next(createError(502, 'No posts found'));
    }
  } catch (error) {
    console.log(`[postUserUploaded] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postByMention = async (req, res, next) => {
  try {
    let { userId: targetUserId, nextPageId } = req.body;
    let userId = req.user.userId;
    console.log(`[postByMention]  body: ${JSON.stringify(req.body)}`);
    console.log(
      `[postByMention]  targetUserId: ${targetUserId}, userId: ${userId}`
    );

    if (nextPageId) nextPageId = parseInt(nextPageId);

    const query = postByUserMentioned(
      targetUserId,
      userId,
      ROWS_PER_PAGE_20 + 1,
      nextPageId
    );

    const rows = await query.then();

    if (rows.length) {
      let nextPage = 0;
      if (rows.length > ROWS_PER_PAGE_20) {
        const lastRow = rows.pop();
        nextPage = lastRow.postId;
      }

      return res.send(
        new ApiResult(
          'Success',
          replaceDomains(rows),
          nextPageId,
          nextPage
        ).success()
      );
    } else {
      return next(createError(502, 'No posts found'));
    }
  } catch (error) {
    console.log(`[postByMention] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postByText = async (req, res, next) => {
  try {
    const body = req.body;

    console.log(`[postByText]  body: ${JSON.stringify(body)}`);

    let userId = req.user.userId;

    const query = searchByText(
      req.body.text,
      userId,
      ROWS_PER_PAGE_20 + 1,
      body.nextPageId
    );

    const result = await query.then();

    if (hasResult(result)) {
      let rows = result;
      let nextPageId = 0;
      if (rows.length >= ROWS_PER_PAGE_20) {
        const lastRow = rows.pop();
        nextPageId = lastRow.postId;
      }

      return res.send(
        new ApiResult(
          'Success',
          replaceDomains(rows),
          parseInt(body.nextPageId),
          parseInt(nextPageId)
        ).success()
      );
    } else {
      return next(createError(502, 'No posts found'));
    }
  } catch (error) {
    console.log(`[postByText] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

const postBySound = async (req, res, next) => {
  try {
    const body = req.body;

    console.log(`[postBySound]  body: ${JSON.stringify(body)}`);

    let userId = req.user.userId;

    const query = searchBySoundId(
      req.body.soundId,
      userId,
      ROWS_PER_PAGE_20 + 1,
      body.nextPageId
    );

    const result = await query.then();

    if (hasResult(result)) {
      let rows = result;
      let nextPageId = 0;
      if (rows.length >= ROWS_PER_PAGE_20) {
        const lastRow = rows.pop();
        nextPageId = lastRow.postId;
      }

      return res.send(
        new ApiResult(
          'Success',
          replaceDomains(rows),
          parseInt(body.nextPageId),
          parseInt(nextPageId)
        ).success()
      );
    } else {
      return next(createError(502, 'No posts found'));
    }
  } catch (error) {
    console.log(`[postBySound] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

export {
  getPost,
  newPost,
  getCategories,
  deletePost,
  postVideo,
  postView,
  like,
  commentLike,
  unlike,
  bless,
  unbless,
  postComment,
  getComments,
  searchHashtags,
  getLikes,
  getBlessings,
  removeMention,
  deleteComment,
  skipCategory,
  categoriesWithPosts,
  getAllDrafts,
  postFromUserCirlce,
  postByCategory,
  postByText,
  postByHashtag,
  postBySound,
  postUserUploaded,
  postByMention,
  getCompletedCategories,
};
