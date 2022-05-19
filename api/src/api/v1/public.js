import fs, { lstat } from 'fs';
import os from 'os';
import net from 'net';
import createError from 'http-errors';
import twitter from 'twitter-text';
import formidable from 'formidable';
import _ from 'lodash';

import db from '../../db';
import Responses from '../../lib/api_response';

import utils from '../../lib/utils';
import ApiResponse from '../../classes/ApiResponse';
import FileUploader from '../../classes/FileUploader';
import ApiResult from '../../classes/ApiResult';

const ROWS_PER_PAGE_20 = 20;
const ROWS_PER_PAGE_30 = 30;
const S3_URL_PREFIX = 'https://s3-us-west-1.amazonaws.com/insta-assets';
const fileUploader = new FileUploader();

const hasResult = (rows) => {
  return rows && rows.length >= 1;
};

const hasValue = (thing) => {
  return thing && (thing.length || !isNaN(parseInt(thing)));
};

const countNormalPostsInCountry = (country) => {
  const countQuery = db('posts')
    .count('*')
    .join('users', 'users.userId', 'posts.userId')
    .where('posts.status', 'published')
    .whereRaw('LOWER(users.country) = ?', [country.toLowerCase()])
    .where('users.sponsored', false)
    .where('users.isActive', true)
    .where('users.isDeleted', false);

  console.log(countQuery.toString());
  return countQuery;
};

const queryWithoutUser = (sponsored, country, nextPageId, limit) => {
  const pubQuery = db('posts as p')
    .select(db.raw('distinct on (p."postId") p."postId"'))
    .select([
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
      'p.soundId',
      'p.sponsored',
      'p.likes',
      'p.views',
      'p.comments',
      'p.iOSFront',
      db.raw(`
      (
          SELECT row_to_json(u)
            FROM(
              SELECT
                u."userId",
                u."userName",
                u."fullName",
                u."imageUrl",
                u."isActive",
                u."isDeleted",
                u."description",
                false as "isBlocked",
                false as "isFollowing",
                false as "isReported",
                u."followersCount",
                u."followingsCount",
                u."postViewCount",
                u."postCount"
              FROM users u
              WHERE u."userId" = p."userId"
            ) u
        ) "postedBy"
    `),
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
    .join('users', 'users.userId', 'p.userId')
    .where('p.status', 'published')
    .where('users.isActive', true)
    .where('users.isDeleted', false)
    .where('p.sponsored', sponsored); //;

  if (country) {
    pubQuery.where(function () {
      this.whereRaw(`LOWER(users.country) = ?`, [
        country.toLowerCase(),
      ]).orWhereIn(
        'p.userId',
        db('user_countries')
          .select('userId')
          .whereRaw(`LOWER(user_countries.country) = ?`, [
            country.toLowerCase(),
          ])
      );
    });
  }

  if (nextPageId) {
    pubQuery.andWhere('p.postId', '<=', nextPageId);
  }

  pubQuery.orderBy('p.postId', 'desc');
  if (limit) {
    pubQuery.limit(limit);
  } else {
    pubQuery.limit(ROWS_PER_PAGE_20 + 1);
  }

  // console.log(pubQuery.toString());
  return pubQuery;
};

const publicPostQuery = (sponsored, userId, country, nextPageId, limit) => {
  if (!userId) {
    return queryWithoutUser(sponsored, country, nextPageId, limit);
  }
  const query = db('posts as p')
    .select(db.raw('distinct on (p."postId") p."postId"'))
    .select([
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
      'p.soundId',
      'p.likes',
      'p.views',
      'p.comments',
      'p.iOSFront',
      db.raw(
        `array_to_json(ARRAY(
          SELECT "userName"
          FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
            AND "userId" NOT IN (
              SELECT "userId" from user_blocks ub
              WHERE ub."blockedUserId" = ?
            )
        )) "mentions"`,
        [userId]
      ),
      db.raw(
        `EXISTS(
          SELECT
            "likeId"
          FROM post_likes l
          WHERE l."postId" = p."postId" AND l."userId" = ?
        ) "isLiked"`,
        [userId]
      ),
      db.raw(
        `EXISTS(
          SELECT
            "viewId"
          FROM post_views pv
          WHERE pv."postId" = p."postId" AND pv."userId" = ?
        ) "isViewed"
      `,
        [userId]
      ),
      db.raw(
        `EXISTS(
          SELECT
            "reportId"
          FROM reported_users ru
          WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
        ) "isUserReported"
      `,
        [userId]
      ),
      db.raw(
        `EXISTS(
          SELECT
            "reportId"
          FROM reported_posts rp
          WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
        ) "isPostReported"
      `,
        [userId]
      ),
      db.raw(
        `EXISTS(
          SELECT
            "followId"
          FROM user_follows uf
          WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
        ) "isFollowed"
      `,
        [userId]
      ),
      db.raw(
        `
      (
          SELECT row_to_json(u)
            FROM(
              SELECT
                u."userId",
                u."userName",
                u."fullName",
                u."imageUrl",
                u."isActive",
                u."isDeleted",
                u."description",
                EXISTS(
                  SELECT
                    "blockId"
                  FROM user_blocks ub
                  WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
                ) "isBlocked",
                false as "iAmBlocked",
                EXISTS(
                  SELECT
                    "followId"
                  FROM user_follows uf
                  WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
                ) "isFollowing",
                EXISTS(
                  SELECT
                    "reportId"
                  FROM reported_users ru
                  WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
                ) "isReported",
                u."followersCount",
                u."followingsCount",
                u."postViewCount" ,
                u."postCount"
              FROM users u
              WHERE u."userId" = p."userId"
            ) u
        ) "postedBy"
    `,
        [userId, userId, userId]
      ),
      db.raw(
        `
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
              ) "totalPosts",
              EXISTS(
                  SELECT
                    "postId"
                  FROM posts as p
                  WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
                ) as "postAdded"   
            FROM categories c
            WHERE c."categoryId" = p."categoryId"
          ) c
        ) "category"`,
        [userId]
      ),
    ])
    .join('users', 'users.userId', 'p.userId')
    .where('p.status', 'published')
    .where('users.isActive', true)
    .where('users.isDeleted', false)
    .where('p.sponsored', sponsored)
    .whereNotIn(
      'p.userId',
      db('user_blocks').select(['userId']).where('blockedUserId', userId)
    )
    .whereNotIn(
      'p.postId',
      db('post_views')
        .select('post_views.postId')
        .where('post_views.userId', userId)
    );

  if (country) {
    query.where(function () {
      this.whereRaw(`LOWER(users.country) = ?`, [
        country.toLowerCase(),
      ]).orWhereIn(
        'p.userId',
        db('user_countries')
          .select('userId')
          .whereRaw(`LOWER(user_countries.country) = ?`, [
            country.toLowerCase(),
          ])
      );
    });
  }

  if (nextPageId) {
    query.andWhere('p.postId', '<=', nextPageId);
  }

  query.orderBy('p.postId', 'desc');
  if (limit) {
    query.limit(limit);
  } else {
    query.limit(ROWS_PER_PAGE_20 + 1);
  }
  return query;
};

const mergePosts = (count, sponsoredList, posts) => {
  let evens = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
  let odds = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  //console.log('[mergePosts] count: ', count);
  if (count > 50) {
    for (let i in evens) {
      if (!sponsoredList.length) break;
      if (posts[evens[i]]) {
        posts.splice(evens[i], 0, sponsoredList.shift());
      } else {
        posts.push(sponsoredList.shift());
      }
    }
  } else if (count < 50) {
    for (let i in odds) {
      //console.log('odds: ', odds[i]);
      if (!sponsoredList.length) break;
      if (posts[odds[i]]) {
        posts.splice(odds[i], 0, sponsoredList.shift());
      } else {
        posts.push(sponsoredList.shift());
      }
    }
  }

  return posts;
};

const publicPosts = async (req, res, next) => {
  try {
    const { body } = req;
    let { nextPageId } = body;
    console.log(`[publicPosts] body: ${JSON.stringify(body)} `);
    let includeSponsored = false;

    let withUser = req.user && req.user.userId;
    let userId = withUser ? req.user.userId : null;
    let country;

    if (userId) {
      country = (await db('users').select(['country']).where({ userId })).pop()[
        'country'
      ];
    } else {
      if (net.isIPv4(req.clientIp) || net.isIPv6(req.clientIp)) {
        try {
          let location = await utils.getCountryFromIp(req.clientIp);
          if (location && hasValue(location.country)) {
            country = location.country;
          }
        } catch (err) {
          console.log(`[publicPosts] err: ${err.stack}`);
          return next(
            createError(
              502,
              'Server is busy at the moment, please try again later.'
            )
          );
        }
      } else {
        console.log(`[publicPosts] ${req.clientIp} not a valid ip address`);
        return next(
          createError(
            502,
            'Server is busy at the moment, please try again later.'
          )
        );
      }
    }

    console.log(`[publicPosts] userId:`, userId, `country:`, country);
    if (!country) country = 'IN';
    if (!country) {
      return next(
        createError(
          502,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    const countResults = (
      await countNormalPostsInCountry(country).then()
    ).pop();
    const { count } = countResults;

    if (!nextPageId && count < 50) {
      includeSponsored = true;
    }

    console.log(
      `[publicPosts] count: ${count}, includeSponsored: `,
      includeSponsored
    );

    let query = publicPostQuery(includeSponsored, userId, country, nextPageId);

    const result = await query.then();
    console.log(`[publicPosts] result: `, result.length);
    if (!hasResult(result)) {
      return next(createError(502, 'No posts found'));
    }

    let sponsoredList = [];
    let sponsoredPostLimit = 10;
    let nextPage = 0;
    if (result.length >= ROWS_PER_PAGE_20) {
      const lastRow = result.pop();
      nextPage = lastRow.postId;
    }

    if (includeSponsored) {
      let sponsoredQuery = publicPostQuery(
        true,
        userId,
        country,
        null,
        sponsoredPostLimit
      );
      sponsoredList = await sponsoredQuery.then();
      console.log(`[publicPosts] sponsoredList: `, sponsoredList.length);
    }

    let list = sponsoredList.length
      ? mergePosts(count, Object.assign([], sponsoredList), result)
      : result;
    console.log(`[publicPosts] list: `, list.length);

    if (list.length < ROWS_PER_PAGE_20 && sponsoredList.length) {
      const limit = ROWS_PER_PAGE_20 - list.length;
      let sponsoredQuery = publicPostQuery(
        true,
        userId,
        country,
        sponsoredList[sponsoredList.length - 1].postId,
        limit
      );
      const newSponsoredList = await sponsoredQuery.then();
      list = list.concat(newSponsoredList);
    }

    console.log(`[publicPosts] list: `, list.length);
    return res.send(
      new ApiResult(
        'Success',
        list,
        parseInt(nextPageId),
        parseInt(nextPage)
      ).success()
    );
  } catch (error) {
    console.log(`[publicPosts] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

export default {
  publicPosts,
};
