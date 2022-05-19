'use strict';
import fs from 'fs';
import os from 'os';
import { URL } from 'url';
import createError from 'http-errors';
import twitter from 'twitter-text';
import formidable from 'formidable';

import _ from 'lodash';
import isUrl from 'is-url';
import db from '../../db';
import Responses from '../../lib/api_response';

import { getTransaction, getSoundStreamUrl } from '../../lib/utils';
import ApiResponse from '../../classes/ApiResponse';
import FileUploader from '../../classes/FileUploader';
import ApiResult from '../../classes/ApiResult';
import config from '../../config';
import buckets from '../../lib/buckets';
import {
  getSoundById,
  getSoundList,
  getSoundListCount,
  getSoundHome,
  getSearchSound,
  getPopularSounds,
  getSoundsByVideoCategory,
  getSoundsByAudioCategory,
} from '../../lib/sound_queries';

const ROWS_PER_PAGE_20 = config.paging.ROWS_PER_PAGE_20;
const ROWS_PER_PAGE_30 = config.paging.ROWS_PER_PAGE_30;

const S3_URL_PREFIX = 'https://s3-us-west-1.amazonaws.com/insta-assets';
const fileUploader = new FileUploader();

export const updatePostCount = async (soundId) => {
  const postCount = (
    await db('posts')
      .count('postId')
      .where('status', config.postStatus.published)
      .andWhere({ soundId })
  ).pop();
  console.log(
    `[updatePostCount] for sound: ${soundId}, count: ${JSON.stringify(
      postCount
    )}`
  );
  await db('sounds')
    .update('postCount', parseInt(postCount.count))
    .where('id', soundId);
};

const getStreamUrl = (soundUrl) => {
  const url = new URL(soundUrl);
  for (let i in buckets) {
    let bucketData = buckets[i];

    if (soundUrl.includes(bucketData.bucket)) {
      return `https://${bucketData.edgeDomain}${url.pathname}`;
    }
  }
  return soundUrl;
};

export const uploadSound = async (req, res, next) => {
  const trx = await getTransaction(db);
  try {
    const { body } = req;
    const { userId } = req.user;

    const { title, url, duration, id, isPopular, postId } = body;

    if (id) {
      const sound = (
        await db('sounds')
          .select([
            'id',
            'title',
            'duration',
            'streamUrl',
            'imageUrl',
            'isPopular',
            'createdAt',
          ])
          .where({ id })
      ).pop();
      if (!sound) {
        await trx.rollback();
        return res.send(new ApiResponse('Invalid Sound ID', null, 0).response);
      }

      const userSound = (
        await db('user_sounds').where({ soundId: id, userId })
      ).pop();

      if (userSound) {
        await trx.rollback();
        return res.send(
          new ApiResponse('Sound is already added', null, 0).response
        );
      }

      await db('user_sounds').transacting(trx).insert({ userId, soundId: id });
      await trx.commit();
      return res.send(new ApiResponse('Success', sound).response);
    }

    if (!isUrl(url)) {
      await trx.rollback();
      return res.send(new ApiResponse('Invalid Sound URL', null, 0).response);
    }

    if (!title) {
      await trx.rollback();
      return res.send(
        new ApiResponse('Sound title is required', null, 0).response
      );
    }

    if (!duration) {
      await trx.rollback();
      return res.send(
        new ApiResponse('Sound duration is required', null, 0).response
      );
    }

    if (isNaN(parseInt(duration))) {
      await trx.rollback();
      return res.send(new ApiResponse('Invalid duration', null, 0).response);
    }

    const streamUrl = getSoundStreamUrl(url);
    const soundObj = { title, duration, url, streamUrl, isPopular };
    if (!isPopular) {
      soundObj.userId = userId;
    }
    const sound = (
      await db('sounds')
        .transacting(trx)
        .insert(soundObj)
        .returning([
          'id',
          'title',
          'duration',
          'streamUrl',
          'imageUrl',
          'isPopular',
          'createdAt',
        ])
    ).pop();

    if (!isPopular) {
      await db('user_sounds')
        .transacting(trx)
        .insert({ userId, soundId: sound.id });
    }

    if (postId) {
      await db('posts')
        .transacting(trx)
        .update('soundId', sound.id)
        .where({ postId });
    }
    await trx.commit();
    res.send(new ApiResponse('Success', sound).response);
  } catch (error) {
    await trx.rollback();
    console.log(`[getPost] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const getById = async (req, res, next) => {
  try {
    const { body } = req;
    const { userId } = req.user;
    console.log(`[getById] body: ${JSON.stringify(body)}`);
    if (!body.id) {
      return res.send(new ApiResponse('Invalid parameters', null, 0).response);
    }

    const { id } = body;

    const sound = await getSoundById(id, userId);

    if (!sound) {
      return next(createError(502, 'Sound not available'));
    }
    // await db('user_sounds')
    //   .transacting(trx)
    //   .insert({ userId, soundId: sound.id });

    res.send(new ApiResponse('Success', sound).response);
  } catch (error) {
    console.log(`[getById] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const deleteById = async (req, res, next) => {
  try {
    const { body } = req;
    const { userId } = req.user;

    if (!body.id) {
      return res.send(new ApiResponse('Invalid parameters', null, 0).response);
    }

    const { id } = body;

    const sound = (
      await db('sounds')
        .join('user_sounds', 'user_sounds.soundId', 'sounds.id')
        .where('user_sounds.userId', userId)
        .andWhere('sounds.id', id)
    ).pop();

    if (!sound) {
      return next(createError(502, 'Sound not available'));
    }

    await db('user_sounds').where({ soundId: id, userId }).del();

    const totalSounds = await db('user_sounds').where({ soundId: id });
    if (totalSounds < 1) {
      await db('sounds').where({ id }).del();
    }

    res.send(new ApiResponse('Success').response);
  } catch (error) {
    console.log(`[deleteById] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const listSounds = async (req, res, next) => {
  try {
    let { userId: targetUserId, nextPageId } = req.body;
    const { userId } = req.user;

    if (!targetUserId) targetUserId = userId;

    nextPageId = parseInt(nextPageId);
    const selfUser = targetUserId == userId;
    console.log(`[listSounds] userId: ${targetUserId}, selfUser: ${selfUser}`);

    const soundCount = (await getSoundListCount(targetUserId, selfUser)).pop();
    console.log(`[listSounds] soundCount: ${JSON.stringify(soundCount)}`);

    const sounds = await getSoundList(
      targetUserId,
      userId,
      nextPageId,
      ROWS_PER_PAGE_20
    );

    if (sounds.length) {
      let nextPage = 0;
      if (sounds.length >= ROWS_PER_PAGE_20) {
        const lastRow = sounds.pop();
        nextPage = parseInt(lastRow.id);
      }
      return res.send(
        new ApiResult('Success', sounds, nextPageId, nextPage).success()
      );
    } else {
      return next(createError(502, 'No sounds found'));
    }
  } catch (error) {
    console.log(`[listSounds] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const soundHome = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const location = (await db('user_location_info').where({ userId })).pop();

    if (!location) {
      console.log(`[soundHome] location not found`);
      return next(
        createError(
          502,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    const { categories, popular, newest } = await getSoundHome(
      userId,
      location.country
    );
    return res.send(
      new ApiResult('Success', { categories, popular, newest }).success()
    );
  } catch (error) {
    console.log(`[soundHome] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const searchSound = async (req, res, next) => {
  try {
    const { userId } = req.user;
    let { text, nextPageId } = req.body;
    nextPageId = parseInt(nextPageId);

    const user = (await db('users').select('country').where({ userId })).pop();
    const result = await getSearchSound(
      userId,
      user.country,
      text,
      nextPageId,
      ROWS_PER_PAGE_20 + 1
    );

    if (result.length) {
      let nextPage = 0;
      if (result.length >= ROWS_PER_PAGE_20) {
        const lastRow = result.pop();
        nextPage = parseInt(lastRow.id);
      }
      return res.send(
        new ApiResult('Success', result, nextPageId, nextPage).success()
      );
    } else {
      return next(createError(502, 'No sounds found'));
    }
  } catch (error) {
    console.log(`[soundHome] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const popularSounds = async (req, res, next) => {
  try {
    const { userId } = req.user;
    let { text, nextPageId } = req.body;
    nextPageId = parseInt(nextPageId);

    const user = (await db('users').select('country').where({ userId })).pop();

    const result = await getPopularSounds(
      userId,
      user.country,
      nextPageId,
      ROWS_PER_PAGE_20 + 1
    );

    if (result.length) {
      let nextPage = 0;
      if (result.length >= ROWS_PER_PAGE_20) {
        const lastRow = result.pop();
        nextPage = nextPageId + ROWS_PER_PAGE_20;
      }
      return res.send(
        new ApiResult('Success', result, nextPageId, nextPage).success()
      );
    } else {
      return next(createError(502, 'No sounds found'));
    }
  } catch (error) {
    console.log(`[popularSounds] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const soundsByVideoCategory = async (req, res, next) => {
  try {
    const { userId } = req.user;
    let { categoryId, nextPageId } = req.body;
    nextPageId = parseInt(nextPageId);
    const result = await getSoundsByVideoCategory(
      userId,
      categoryId,
      nextPageId,
      ROWS_PER_PAGE_20 + 1
    );

    if (result.length) {
      let nextPage = 0;
      if (result.length >= ROWS_PER_PAGE_20) {
        const lastRow = result.pop();
        nextPage = nextPageId + ROWS_PER_PAGE_20;
      }
      return res.send(
        new ApiResult('Success', result, nextPageId, nextPage).success()
      );
    } else {
      return next(createError(502, 'No sounds found'));
    }
  } catch (error) {
    console.log(`[soundsByVideoCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const soundsByAudioCategory = async (req, res, next) => {
  try {
    const { userId } = req.user;
    let { categoryId, nextPageId } = req.body;
    nextPageId = parseInt(nextPageId) || 0;

    const result = await getSoundsByAudioCategory(
      userId,
      categoryId,
      nextPageId,
      ROWS_PER_PAGE_20 + 1
    );

    console.log(`[soundsByAudioCategory] result: ${result.length}`);
    if (result.length) {
      let nextPage = 0;
      if (result.length >= ROWS_PER_PAGE_20) {
        const lastRow = result.pop();
        nextPage = nextPageId + ROWS_PER_PAGE_20;
      }
      return res.send(
        new ApiResult('Success', result, nextPageId, nextPage).success()
      );
    } else {
      return next(createError(502, 'No sounds found'));
    }
  } catch (error) {
    console.log(`[soundsByVideoCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};
