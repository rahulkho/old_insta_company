import os from 'os';
import fs from 'fs';
import _ from 'underscore';
import csv from 'csvtojson';
import bcryptjs from 'bcryptjs';
import isUrl from 'is-url';

import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import formidable from 'formidable';

import db from '../../db';
// import utils from '../../lib/utils';
import EmailSender from '../../classes/EmailSender';
import ApiResponse from '../../classes/ApiResponse';
import ApiResult from '../../classes/ApiResult';
import { getSoundStreamUrl, getTransaction } from '../../lib/utils';
const categoryColumns = {
  categoryName: 'Category Name',
  imageUrl: 'Image URL',
  videoUrl: 'Video URL',
  priority: 'Priority',
  keywords: 'Keywords',
  subcategories: 'Subcategories',
};

export const uploadSounds = async (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        logger.info(`[uploadCategories] error: ${error.stack}`);
        return;
      }
      const file = _.toArray(files)[0];
      const sounds = (await csv().fromFile(file.path)).map((row) => {
        return {
          username: row['Username'],
          title: row['Sound Name'],
          url: row['Sound URL'],
          duration: row['Duration'],
        };
      });

      for (let sound of sounds) {
        const { url, title, duration } = sound;
        if (!isUrl(url) || !title || isNaN(parseInt(duration))) {
          console.log(`[uploadSounds] invalid data`);
          continue;
        }

        const user = (
          await db('users').select(['userId']).where('userName', sound.username)
        ).pop();

        if (!user) {
          console.log(
            `[uploadSounds] user not found with username: ${sound.username}`
          );
          continue;
        }

        const { userId } = user;

        const streamUrl = getSoundStreamUrl(url);
        const soundObj = {
          title,
          duration,
          url,
          streamUrl,
          userId,
        };
        console.log(`[uploadSounds] adding: ${title}`);
        try {
          const trx = await getTransaction(db);
          const addedSound = (
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

          await db('user_sounds')
            .transacting(trx)
            .insert({ userId, soundId: addedSound.id });

          await trx.commit();
        } catch (error) {
          await trx.rollback();
          console.log(`[uploadSounds] error: ${error.stack}`);
        }
      }
      return res.send(new ApiResponse('uploaded').response);
    });
  } catch (error) {
    console.log(`[uploadSounds] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const uploadCategories = async (req, res, next) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      logger.info(`[uploadCategories] error: ${error.stack}`);
      return;
    }
    const file = _.toArray(files)[0];
    const fileData = (await csv().fromFile(file.path)).map((row) => {
      return {
        categoryName: row[categoryColumns.categoryName],
        imageUrl: row[categoryColumns.imageUrl],
        videoUrl: row[categoryColumns.videoUrl],
        priority: row[categoryColumns.priority],
        keywords: row[categoryColumns.keywords]
          ? row[categoryColumns.keywords].split(',')
          : [],
        subcategories: row[categoryColumns.subcategories]
          ? row[categoryColumns.subcategories].split(',')
          : [],
      };
    });

    for (let data of fileData) {
      let keywords = [],
        subcategories = [];
      if (data.keywords) {
        for (let keyword of data.keywords) {
          keyword = keyword.trim();
          const keywordExists = (await db('keywords').where({ keyword })).pop();
          if (!keywordExists) {
            const kw = (
              await db('keywords').insert({ keyword }).returning('*')
            ).pop();

            keywords.push(kw.id);
          } else {
            keywords.push(keywordExists.id);
          }
        }
      }

      if (data.subcategories) {
        for (let subcategory of data.subcategories) {
          subcategory = subcategory.trim();
          const subExists = (
            await db('subcategories').where({ subcategory })
          ).pop();
          if (!subExists) {
            const sub = (
              await db('subcategories').insert({ subcategory }).returning('*')
            ).pop();

            subcategories.push(sub.id);
          } else {
            subcategories.push(subExists.id);
          }
        }
      }

      data.keywords = keywords;
      data.subcategories = subcategories;

      try {
        const categoryExists = (
          await db('categories').where('categoryName', data.categoryName)
        ).pop();
        if (categoryExists) {
          await db('categories')
            .update(data)
            .where('categoryId', categoryExists.categoryId);
        } else {
          await db('categories').insert(data);
        }
      } catch (error) {
        console.log(error.message);
      }

      // const exists = (
      //   await db('categories')
      //     .select('categoryId')
      //     .whereRaw(
      //       `LOWER("categoryName") = ?`,
      //       data.categoryName.toLowerCase()
      //     )
      // ).pop();
      // console.log(
      //   `[] exists: ${typeof exists != 'undefined'}, adding: ${JSON.stringify(
      //     data
      //   )}`
      // );
      // if (!exists) {
      //   await db('categories').insert(data);
      // }
    }
    return res.send(new ApiResponse('uploaded').response);
  });
};

export const manageSounds = async (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        logger.info(`[manageSounds] error: ${error.stack}`);
        return;
      }
      const file = _.toArray(files)[0];
      const sounds = (await csv().fromFile(file.path)).map((row) => {
        return {
          id: row['Sound ID'],
          imageUrl: row['Sound Image'],
          videoCategories: row['Video Categories'],
          audioCategories: row['Audio Categories'],
        };
      });

      for (let sound of sounds) {
        try {
          let { id, imageUrl, videoCategories, audioCategories } = sound;
          if (!isUrl(imageUrl)) {
            imageUrl = undefined;
          }

          if (!id) continue;

          let videoCategoryIds = [],
            soundCategoryIds = [];
          if (videoCategories && videoCategories.length) {
            if (videoCategories.includes('all')) {
              let rows = await db('categories').orderBy('categoryId');
              videoCategoryIds = _.pluck(rows, 'categoryId');
            } else {
              let rows = await db('categories')
                .whereIn('categoryId', videoCategories.split(','))
                .orderBy('categoryId');
              videoCategoryIds = _.pluck(rows, 'categoryId');
            }
          }

          if (audioCategories && audioCategories.length) {
            if (audioCategories.includes('all')) {
              let rows = await db('sound_categories').orderBy('id');
              soundCategoryIds = _.pluck(rows, 'id');
            } else {
              let rows = await db('sound_categories')
                .whereIn('id', audioCategories.split(','))
                .orderBy('id');
              soundCategoryIds = _.pluck(rows, 'id');
            }
          }

          const soundObj = {
            imageUrl,
            soundCategoryIds,
            videoCategoryIds,
          };

          console.log('sound:', id, soundObj);
          await db('sounds').update(soundObj).where({ id });
        } catch (error) {
          console.log(`[manageSounds] error: ${error.stack}`);
        }
      }
      return res.send(new ApiResponse('uploaded').response);
    });
  } catch (error) {
    console.log(`[manageSounds] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export const getSoundsTemp = async (req, res) => {
  try {
    const rows = await db('sounds').orderBy('id');
    res.render('index', {
      title: 'Sounds',
      rows,
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
};

export const getVideoCategoriesTemp = async (req, res) => {
  try {
    const rows = await db('categories').orderBy('categoryId');
    res.render('video_categories', {
      title: 'Video Categories',
      rows,
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
};

export const getAudioCategoriesTemp = async (req, res) => {
  try {
    const rows = await db('sound_categories').orderBy('id');
    res.render('sound_categories', {
      title: 'Sound Categories',
      rows,
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
};
