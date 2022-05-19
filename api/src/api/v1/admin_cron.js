import os from 'os';
import fs from 'fs';
import _ from 'underscore';

import db from '../../db';

export const updateCategoryVideoUrls = async () => {
  try {
    const categories = await db('categories')
      .whereNull('videoUrl')
      .orderBy('categoryId');

    for (let c of categories) {
      const { categoryId } = c;
      const post = (
        await db('posts')
          .where({ categoryId })
          .whereNotNull('videoStreamUrl')
          .orderBy('views', 'desc')
          .limit(1)
      ).pop();

      if (post) {
        console.log(
          `[cron] updating categoryId: ${categoryId}, with post #${post.postId}, url: ${post.videoStreamUrl}`
        );
        await db('categories')
          .update('videoUrl', post.videoStreamUrl)
          .where({ categoryId });
      }
    }
  } catch (error) {
    console.log('[updateCategoryVideoUrls]', error);
  }
};

export const hourly = async (req, res, next) => {
  res.status(200).end();
  await updateCategoryVideoUrls();
};
