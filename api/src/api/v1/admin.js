import os from 'os';
import fs from 'fs';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import formidable from 'formidable';

import db from '../../db';
// import utils from '../../lib/utils';
import EmailSender from '../../classes/EmailSender';
import ApiResponse from '../../classes/ApiResponse';
import ApiResult from '../../classes/ApiResult';
import FileUploader from '../../classes/FileUploader';
import config from '../../config';
import { getTransaction } from '../../lib/utils';

const ROWS_PER_PAGE = 50;
const S3_URL_PREFIX = 'https://s3-us-west-1.amazonaws.com/instausercontent';
const fileUploader = new FileUploader();
const emailSender = new EmailSender();

const hasResult = (rows) => {
  return rows && rows.length >= 1;
};

const hasValue = (thing) => {
  return thing && (thing.length || !isNaN(parseInt(thing)));
};

(async function () {
  const file = fs.existsSync(process.cwd() + '/admins.json')
    ? fs.readFileSync(process.cwd() + '/admins.json')
    : '[]';
  const users = JSON.parse(file);
  for (let user of users) {
    const { password } = user;
    if (!password) continue;
    const hashed = bcryptjs.hashSync(password, 10);
    const updated = await db('admin_users')
      .update('password', hashed)
      .where('email', user.email);
    if (!updated) {
      await db('admin_users').insert({ password: hashed, ...user });
    }
  }
})();

const login = async (req, res, next) => {
  const rows = await db('admin_users').where('email', req.body.email);

  if (hasResult(rows)) {
    const user = rows.pop();

    try {
      const passwordValid = await bcryptjs.compare(
        req.body.password,
        user.password
      );
      if (passwordValid) {
        const payload = {
          userId: user.userId,
          email: user.email,
        };
        const token = jwt.sign(payload, process.env.ADMIN_JWT_SECRET);
        delete user.password;
        user.token = token;
        return res.send(new ApiResponse('Login successful', user).response);
      } else {
        return next(createError(401, 'Invalid email or password'));
      }
    } catch (error) {
      console.log('[login] err: ', err.stack);
      return next(createError(401, 'Invalid email or password'));
    }
  } else {
    return next(createError(401, 'Invalid email or password'));
  }
};

const profile = async (req, res, next) => {
  let user = await db('admin_users').where('userId', req.user.userId);
  if (!hasResult(user)) {
    return next(createError(401, 'Invalid request'));
  }

  user = user.pop();
  delete user.password;
  return res.send(new ApiResponse('User found', user).response);
};

const users = async (req, res, next) => {
  const params = req.body;
  try {
    console.log(`[users] params: ${JSON.stringify(params)}`);

    const page = parseInt(params.page) || 1;
    const offset = ROWS_PER_PAGE * (page - 1);

    const countQuery = db('users as u').count('*');
    const knexQuery = db('users as u').select([
      'u.userId',
      'fullName',
      'userName',
      'email',
      'u.imageUrl',
      'gender',
      'fbId',
      'deviceType',
      'country',
      'sponsored',
      'soundSponsored',
      'verification',
      'r.verificationLink',
      'u.isActive',
      'u.isDeleted',
      'u.joinedTs',
      db.raw(`
            (
              SELECT COUNT("reportId")::integer
              FROM reported_users ru
              WHERE ru."reportedUserId" = u."userId"
            ) "reportedCount"`),
      db.raw(`
            (
              SELECT
                COUNT("followId")::INTEGER
              FROM user_follows uf
              JOIN users usr ON usr."userId" = uf."userId"
              WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
            ) "followersCount"`),
      db.raw(`
            (
              SELECT
                COUNT("followId")::INTEGER
              FROM user_follows uf
              JOIN users usr ON usr."userId" = uf."userId"
              WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
            ) "followingsCount"`),
      db.raw(`           (
              SELECT
                COUNT("viewId")::INTEGER
              FROM post_views v
              JOIN posts p ON p."postId" = v."postId"
              WHERE p."userId" = u."userId"
                AND p."isActive" = TRUE AND p."isDeleted" = FALSE
            ) "postViewCount"`),
      db.raw(`
            (
              SELECT
                COUNT("blessingId")::INTEGER
              FROM post_blessings b
              INNER JOIN posts p2 ON p2."userId" = u."userId"
              WHERE b."postId" = p2."postId"
            ) "blessingsCount"`),
      db.raw(
        `
        array_to_json(ARRAY(
          SELECT "country"
          FROM user_countries uc WHERE uc."userId" = u."userId"
        )) "countries"
    `
      ),
    ]);

    knexQuery.leftJoin(
      'user_verification_requests as r',
      'r.userId',
      'u.userId'
    );

    if (
      hasValue(params.deviceType) &&
      ['ios', 'android'].includes(params.deviceType.toLowerCase())
    ) {
      knexQuery.whereRaw('TRIM(BOTH FROM u."deviceType") = ?', [
        params.deviceType,
      ]);
      countQuery.whereRaw('TRIM(BOTH FROM u."deviceType") = ?', [
        params.deviceType,
      ]);
    }

    if (
      hasValue(params.verification) &&
      Object.keys(config.verificationStatus).includes(params.verification)
    ) {
      knexQuery.where('verification', params.verification);
      countQuery.where('verification', params.verification);
    }

    if (hasValue(params.country)) {
      knexQuery.where('country', params.country);
      countQuery.where('country', params.country);
    }

    if (hasValue(params.joinedTs)) {
      knexQuery.where('joinedTs', '>', params.joinedTs);
      countQuery.where('joinedTs', '>', params.joinedTs);
    }

    if ([true, 'true'].includes(params.sponsored)) {
      knexQuery.andWhere(function () {
        this.where('sponsored', true).orWhere('soundSponsored', true);
      });
      countQuery.andWhere(function () {
        this.where('sponsored', true).orWhere('soundSponsored', true);
      });
      // knexQuery.where('sponsored', true);
      // knexQuery.where('soundSponsored', true);
      // countQuery.where('sponsored', true);
      // countQuery.where('soundSponsored', true);
    } else {
      knexQuery.where('sponsored', false);
      knexQuery.where('soundSponsored', false);
      countQuery.where('sponsored', false);
      countQuery.where('soundSponsored', false);
    }

    if (hasValue(params.userType)) {
      if (params.userType === 'deleted') {
        knexQuery.where('isDeleted', true);
        countQuery.where('isDeleted', true);
      } else if (params.userType === 'disabled') {
        knexQuery.where('isDeleted', false);
        knexQuery.where('isActive', false);

        countQuery.where('isDeleted', false);
        countQuery.where('isActive', false);
      } else if (params.userType === 'active') {
        knexQuery.where('isDeleted', false);
        knexQuery.where('isActive', true);

        countQuery.where('isDeleted', false);
        countQuery.where('isActive', true);
      } else if (params.userType === 'reported') {
        knexQuery.join('reported_users', 'reported_users.userId', 'u.userId');

        countQuery.join('reported_users', 'reported_users.userId', 'u.userId');
      }
    }

    if (hasValue(params.text)) {
      let { text } = params;

      knexQuery.andWhere(function () {
        this.where('userName', 'ilike', text + '%')
          .orWhere('fullName', 'ilike', text + '%')
          .orWhere('email', 'ilike', text + '%');
      });

      countQuery.andWhere(function () {
        this.where('userName', 'ilike', text + '%')
          .orWhere('fullName', 'ilike', text + '%')
          .orWhere('email', 'ilike', text + '%');
      });
    }

    knexQuery.offset(offset);
    knexQuery.limit(ROWS_PER_PAGE);
    if (hasValue(params.orderBy)) {
      const orderBy = params.orderBy.split(',');
      knexQuery.orderBy(orderBy[0], orderBy[1]);
    } else {
      knexQuery.orderBy('joinedTs', 'desc');
    }

    countQuery
      .then((countResult) => {
        const count = parseInt(countResult.pop().count);
        knexQuery
          .then(function (results) {
            //query success
            res.send(
              new ApiResponse('Users found', {
                count,
                page,
                results,
              }).response
            );
          })
          .catch(function (err) {
            console.log(`[users] error: ${err.stack}`);
            next(
              createError(
                502,
                'Server is busy at the moment, please try again later.'
              )
            );
          });
      })
      .catch(function (err) {
        console.log(`[users] error: ${err.stack}`);
        next(
          createError(
            502,
            'Server is busy at the moment, please try again later.'
          )
        );
      });
  } catch (error) {
    console.log(`[users] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const feedbacks = async (req, res, next) => {
  const body = req.body;
  try {
    let condition = [`"type" = 'feedback'`];
    if ([true, false].indexOf(body.isBug) >= 0) {
      condition.push(`"isBug" = ${body.isBug}`);
    }

    if ([true, false].indexOf(body.isRead) >= 0) {
      condition.push(`"isRead" = ${body.isRead}`);
    }

    if (hasValue(body.ts)) {
      condition.push(`"ts" >= '${body.ts}'`);
    }

    condition = condition.join(' AND ');
    let countResult = await db('user_feedbacks')
      .where(db.raw(condition))
      .count('*');
    const count = parseInt(countResult.pop().count);
    const page = parseInt(body.page) || 1;
    const skip = ROWS_PER_PAGE * (page - 1);

    const query = `
      SELECT
        *
      FROM user_feedbacks
      WHERE ${condition}
      ORDER BY id DESC
      OFFSET ${skip}
      LIMIT ${ROWS_PER_PAGE}
    `;
    console.log(`[feedbacks] query: ${query}`);
    const result = await db.raw(query);
    const rows = result.rows;
    return res.send(
      new ApiResponse('Success', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[feedbacks] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const reports = async (req, res, next) => {
  const body = req.body;
  try {
    let condition = [`"type" = 'report'`];
    if ([true, false].indexOf(body.isBug) >= 0) {
      condition.push(`"isBug" = ${body.isBug}`);
    }

    if ([true, false].indexOf(body.isRead) >= 0) {
      condition.push(`"isRead" = ${body.isRead}`);
    }

    if (hasValue(body.ts)) {
      condition.push(`"ts" >= '${body.ts}'`);
    }

    condition = condition.join(' AND ');
    let countResult = await db('user_feedbacks')
      .where(db.raw(condition))
      .count('*');
    const count = parseInt(countResult.pop().count);
    const page = parseInt(body.page) || 1;
    const skip = ROWS_PER_PAGE * (page - 1);
    const query = `
      SELECT
        *
      FROM user_feedbacks
      WHERE ${condition}
      ORDER BY id DESC
      OFFSET ${skip}
      LIMIT ${ROWS_PER_PAGE}
    `;
    console.log(`[reports] query: ${query}`);
    const result = await db.raw(query);
    const rows = result.rows;
    return res.send(
      new ApiResponse('Success', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[reports] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getCategory = async (req, res, next) => {
  const params = req.params;
  console.log(`[getCategory] body: ${params}`);

  try {
    const rows = await db('categories').where('categoryId', params.categoryId);
    if (!hasResult(rows)) {
      return res.send(new ApiResponse('Invalid categoryId', null, 0).response);
    }
    return res.send(new ApiResponse('Category found', rows.pop()).response);
  } catch (error) {
    console.log(`[getCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getCategories = async (req, res, next) => {
  const params = req.params;
  console.log(`[getCategories] body: ${JSON.stringify(params)}`);

  try {
    let countResult = await db('categories').count('*');
    const count = parseInt(countResult.pop().count);
    const page = parseInt(params.page) || 1;
    const skip = ROWS_PER_PAGE * (page - 1);

    const query = `
      select
        c."categoryId",
        c."priority",
        c."categoryName",
        c."isDeleted",
        (
          select
            count(p."postId")::integer
          from posts p
          where p."categoryId" = c."categoryId" AND p."isActive" = TRUE AND p."isDeleted" = FALSE AND p."videoUrl" IS NOT NULL
        ) "totalPosts",
        0 as "timesUsed",
        c."videoUrl",
        c."imageUrl",
        c."rules",
        (
          select array_to_json(array_agg(row_to_json(k)))
          from (
            select id, subcategory
            from subcategories
            where id = any(c.subcategories)
          ) k
        ) "subcategories",
        (
          select array_to_json(array_agg(row_to_json(k)))
          from (
            select id, keyword
            from keywords
            where id = any(c.keywords)
          ) k
        ) "keywords"
      from
      categories c
      order by priority asc
      offset ${skip}
      limit ${ROWS_PER_PAGE}
    `;
    const result = await db.raw(query);

    const rows = result.rows;
    return res.send(
      new ApiResponse('Categories found', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[getCategories] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const addCategory = async (req, res, next) => {
  const body = req.body;
  console.log(`[addCategory] body: ${JSON.stringify(body)}`);

  try {
    if (!hasValue(body.priority)) {
      return next(createError(401, 'Priority is required'));
    }

    const exists = await db('categories').where(
      'categoryName',
      body.categoryName
    );
    if (hasResult(exists)) {
      return next(createError(401, 'Category already exists'));
    }
    body.priority = parseInt(body.priority);
    const priorityExists = await db
      .select(['categoryId'])
      .from('categories')
      .where('priority', body.priority);
    if (hasResult(priorityExists)) {
      // const existing = priorityExists.pop();
      console.log(`[addCategory] updating`);
      await db('categories')
        .increment('priority', 1)
        .where('priority', '>=', body.priority);
    }
    const rows = await db.insert(body, '*').into('categories');
    const category = rows.pop();
    return res.send(new ApiResponse('Category added', category).response);
  } catch (error) {
    console.log(`[addCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const editCategory = async (req, res, next) => {
  let body = req.body;
  console.log(`[editCategory] body: ${JSON.stringify(body)}`);
  const categoryId = body.categoryId;

  try {
    let rows = await db('categories').where('categoryId', categoryId);
    if (!hasResult(rows)) {
      return res.send(new ApiResponse('Invalid categoryId', null, 0).response);
    }
    if (body.priority) {
      const _cat = rows.pop();
      body.priority = parseInt(body.priority);
      if (
        !isNaN(body.priority) &&
        hasValue(body.priority) &&
        body.priority !== _cat.priority
      ) {
        const priorityExists = await db
          .select(['categoryId'])
          .from('categories')
          .where('priority', body.priority);
        if (hasResult(priorityExists)) {
          // const existing = priorityExists.pop();

          console.log(`[editCategory] updating`);
          const query = `
            update categories
            set priority = priority + 1
            where priority >= ${body.priority}
          `;
          console.log(`[editCategory] query: ${query}`);
          await db.raw(query);
          // await db('categories').increment('priority', 1).where('priority', '>=', body.priority);
        }
      }
    }
    console.log(`[editCategory] saving new values`);

    let category = await db('categories')
      .update(body, '*')
      .where('categoryId', categoryId);
    if (!hasResult(category)) {
      return res.send(
        new ApiResponse(
          'Server is busy at the moment, please try again later.',
          null,
          0
        ).response
      );
    }

    // if (body.keywords && body.keywords.length) {
    //   await db.raw(`
    //     update categories
    //     set keywords = array_cat(keywords, ARRAY[${body.keywords.join(',')}])
    //     where "categoryId" = ${categoryId}
    //   `);
    //   // const result = await db('categories')
    //   //   .update(await db.raw(``))
    //   //   .where('categoryId', category.categoryId);
    // }

    return res.send(
      new ApiResponse('Category updated successfully', category.pop()).response
    );
  } catch (error) {
    console.log(`[editCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deleteCategory = async (req, res, next) => {
  const params = req.params;
  console.log(`[deleteCategory] params: ${JSON.stringify(params)}`);

  try {
    const result = await db('categories')
      .update('isDeleted', true)
      .where('categoryId', params.categoryId)
      .returning('*');
    if (hasValue(result)) {
      return res.send(new ApiResponse('Category deleted', result).response);
    }
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  } catch (error) {
    console.log(`[deleteCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const categoryVideo = async (req, res, next) => {
  console.log(`[categoryVideo]`);
  const form = new formidable.IncomingForm(),
    files = [],
    fields = {};

  form.uploadDir = os.tmpdir();
  form
    .on('field', function (field, value) {
      console.log(`[categoryVideo][field] ${field}: ${value}`);
      fields[field] = value;
    })
    .on('fileBegin', function (name, file) {
      console.log(`[categoryVideo][fileBegin]`);
      const extension = file.name.split('.').pop();
      const fileName = `${Date.now().toString(32)}.${extension}`;
      file.path = `${form.uploadDir}/${fileName}`;
      file.name = fileName;
      // file._type = utils.getContentType(extension);

      console.log(`[categoryVideo][fileBegin] ${fileName}`);
    })
    .on('file', function (field, file) {
      console.log(`[categoryVideo][file] ${JSON.stringify(file)}`);
      files.push(file);
    })
    .on('end', function () {
      console.log(`[categoryVideo][end]`);

      const video = files[0];
      let fileName;
      fileName = `cat_${video.name}`;
      const args = {
        fileName: fileName,
        file: fs.readFileSync(video.path),
        contentType: video.type,
      };
      console.log('2', fields);
      fileUploader.uploadFile(args, async (err, result) => {
        if (err) {
          console.log('error: ', err);
          return next(createError(502, 'Error while uploading'));
        }
        console.log('upload: ', result);
        try {
          const videoUrl = `${S3_URL_PREFIX}/${args.fileName}`;
          return res.send(
            new ApiResponse('Category video uploaded', {
              videoUrl,
            }).response
          );
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
    });
  form.parse(req);
};

const categoryImage = async (req, res, next) => {
  let user = req.user;
  const form = new formidable.IncomingForm(),
    files = [],
    fields = {};

  form.uploadDir = os.tmpdir();

  form
    .on('field', function (field, value) {
      fields[field] = value;
    })
    .on('fileBegin', function (name, file) {
      console.log('1', fields);
      const fileName = `image.png`;
      file.path = `${form.uploadDir}/${fileName}`;
      file.name = fileName;
    })
    .on('file', function (field, file) {
      files.push(file);
    })
    .on('end', function () {
      const image = files[0];
      let fileName;
      fileName = 'cat_' + Date.now().toString(32) + '.png';
      const args = {
        fileName: fileName,
        file: fs.readFileSync(image.path),
        contentType: 'image/png',
      };
      console.log('2', fields);
      fileUploader.uploadFile(args, async (err, result) => {
        if (err) {
          console.log('error: ', err);
          return next(createError(502, 'Error while uploading'));
        }
        console.log('upload: ', result);
        try {
          const imageUrl = `${S3_URL_PREFIX}/${args.fileName}`;
          return res.send(
            new ApiResponse('Category image uploaded', {
              imageUrl,
            }).response
          );
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
    });
  form.parse(req);
};

const getCounts = async (req, res, next) => {
  const params = req.body;
  try {
    console.log(`[users] params: ${JSON.stringify(params)}`);
    let conditions = [];
    let join = '';

    if (hasValue(params.deviceType)) {
      conditions.push(`u."deviceType" = '${params.deviceType}'`);
    }

    if (hasValue(params.country)) {
      conditions.push(`u."country" = '${params.country}'`);
    }

    if (hasValue(params.joinedTs)) {
      conditions.push(`u."joinedTs" > '${params.joinedTs}'`);
    }

    if (params.isReported == true) {
      join = `JOIN reported_users ru ON ru."reportedUserId" = u."userId"`;
    }

    let where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    console.log(`[users] conditions: ${where}`);
    console.log(`[users] join: ${join}`);

    const userCountQuery = `
      SELECT
        COUNT(u."userId")::INTEGER
      FROM users u ${join} ${where}`;

    conditions.push(`u."isActive" = TRUE`);
    conditions.push(`u."isDeleted" = FALSE`);
    where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const postCountQuery = `
      SELECT count(p."postId")::INTEGER
      FROM posts p
      WHERE p."userId" IN (SELECT u."userId" FROM users u ${join} ${where}) AND p."isActive" = TRUE AND p."isDeleted" = FALSE AND p."videoUrl" IS NOT NULL`;

    const activeUserCountQuery = `
      SELECT
        COUNT(u."userId")::INTEGER
      FROM users u WHERE ${conditions.join(' AND ')}
    `;

    console.log(`[users] userCountQuery: ${userCountQuery}`);
    console.log(`[users] postCountQuery: ${postCountQuery}`);
    console.log(`[users] activeUserCountQuery: ${activeUserCountQuery}`);
    const uCountResult = await db.raw(userCountQuery);
    const users = uCountResult.rows.pop();
    const pCountResult = await db.raw(postCountQuery);
    const posts = pCountResult.rows.pop();
    const activeUsersCountResult = await db.raw(activeUserCountQuery);
    const activeUserCount = activeUsersCountResult.rows.pop();

    return res.send(
      new ApiResponse('Success', {
        users,
        activeUserCount,
        posts,
      }).response
    );
  } catch (error) {
    console.log(`[getCounts] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const setUserSponsored = async (req, res, next) => {
  try {
    const { body } = req;
    console.log(`[setUserSponsored] body: ${JSON.stringify(body)}`);

    // if (!Object.keys(body).includes('sponsored')) {
    //   return next(createError(401, 'Invalid arguments'));
    // }
    const { userId } = body;
    if (!hasValue(userId)) {
      return next(createError(401, 'Invalid arguments'));
    }

    const updateObj = {};
    if ([true, false].includes(body.sponsored)) {
      updateObj.sponsored = body.sponsored;
    }

    if ([true, false].includes(body.soundSponsored)) {
      updateObj.soundSponsored = body.soundSponsored;
    }

    const result = (
      await db('users')
        .update(updateObj)
        .where('userId', userId)
        .returning(['userId', 'sponsored', 'soundSponsored'])
    ).pop();

    if (body.sponsored === false) {
      await db('posts').update('sponsored', false).where('userId', userId);
      await db('user_countries').where({ userId, defaultCountry: false }).del();
    }

    return res.send(new ApiResponse('Success', result).response);
  } catch (error) {
    console.log(`[setUserSponsored] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const setUserCountries = async (req, res, next) => {
  try {
    let { userId, countries } = req.body;
    console.log(`[setUserCountries] body: ${JSON.stringify(req.body)}`);

    const user = (await db('users').where({ userId })).pop();

    countries = countries
      .filter((c) => c && c.length > 0)
      .map((country) => {
        country = country.toLowerCase();
        return { userId, country };
      });

    if (user.country) {
      const index = countries.findIndex(
        (x) => x.country === user.country.toLowerCase()
      );
      if (index > -1) {
        countries.splice(index, 1);
      }
    }

    await db('user_countries').where({ userId, defaultCountry: false }).del();
    await db('user_countries').insert(countries);
    return res.send(new ApiResponse('Success').response);
  } catch (error) {
    console.log(`[setUserCountries] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const setUserStatus = async (req, res, next) => {
  const body = req.body;
  try {
    console.log(`[setUserStatus] body: ${JSON.stringify(body)}`);
    if (!hasValue(body.userId)) {
      return next(createError(401, 'Invalid arguments'));
    }
    let update = {
      isActive: body.isActive,
    };
    if (!update.isActive) {
      (update.authToken = null), (update.deviceToken = null);
    }
    console.log(`[setUserStatus] update: ${JSON.stringify(update)}`);
    const trx = await getTransaction(db);
    try {
      const result = await db('users')
        .transacting(trx)
        .update(update)
        .where('userId', body.userId)
        .returning(['userId', 'isActive']);

      if (body.isActive === true) {
        return db('posts')
          .transacting(trx)
          .update({ isActive: true, status: config.postStatus.published })
          .where('userId', body.userId)
          .andWhere('status', config.postStatus.unpublished);
      } else {
        await db('posts')
          .transacting(trx)
          .update({
            isActive: false,
            status: config.postStatus.unpublished,
          })
          .where('userId', body.userId)
          .andWhere('status', config.postStatus.published);
        await db('notifications')
          .transacting(trx)
          .where({ userId: body.userId })
          .orWhere({ authorId: body.userId })
          .del();
      }

      await trx.commit();
      return res.send(new ApiResponse('Success', result.pop()).response);
    } catch (error) {
      await trx.rollback();
      console.log(error);
      if (!hasResult(result)) {
        return next(
          createError(
            401,
            'Server is busy at the moment, please try again later.'
          )
        );
      }
    }
  } catch (error) {
    console.log(`[setUserStatus] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const markBug = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[markBug] body: ${JSON.stringify(body)}`);
    if (!hasValue(body.id)) {
      return next(createError(401, 'Invalid arguments'));
    }

    const result = await db('user_feedbacks')
      .update('isBug', body.isBug)
      .where('id', body.id)
      .returning('*');

    if (!hasResult(result)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    res.send(new ApiResult('Success', result.pop()).success());
  } catch (error) {
    console.log(`[markBug] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const markRead = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[markRead] body: ${JSON.stringify(body)}`);
    if (!hasValue(body.id)) {
      return next(createError(401, 'Invalid arguments'));
    }

    const result = await db('user_feedbacks')
      .update('isRead', body.isRead)
      .where('id', body.id)
      .returning('*');

    if (!hasResult(result)) {
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    res.send(new ApiResult('Success', result.pop()).success());
  } catch (error) {
    console.log(`[markRead] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getPosts = async (req, res, next) => {
  const body = req.body;
  console.log(`[getPosts] body: ${JSON.stringify(body)}`);

  let conditions = [];
  let order = `p."postId" DESC`;

  if (hasValue(body.deviceType)) {
    conditions.push(`u."deviceType" ILIKE '${body.deviceType}'`);
  }
  if (hasValue(body.country)) {
    conditions.push(`u."country" ILIKE '${body.country}'`);
  }
  if (hasValue(body.categoryId)) {
    conditions.push(`p."categoryId" = ${body.categoryId}`);
  }
  if (hasValue(body.userId)) {
    conditions.push(`u."userId" = ${body.userId}`);
  }

  if (hasValue(body.createdTs)) {
    conditions.push(`p."createdTs" >= '${body.createdTs}'`);
  }

  if (body.reportedPost === true) {
    conditions.push(`p."postId" IN (
          SELECT rp."reportedPostId"
          FROM reported_posts rp
        )`);
  }

  if (body.reportedPost === false) {
    conditions.push(`p."postId" NOT IN (
          SELECT rp."reportedPostId"
          FROM reported_posts as rp
        )`);
  }

  if (body.reportedUser === true) {
    conditions.push(`p."userId" IN (
          SELECT ru."reportedUserId"
          FROM reported_users ru
        )`);
  }

  if (body.reportedUser === false) {
    conditions.push(`p."userId" NOT IN (
          SELECT ru."reportedUserId"
          FROM reported_users ru
        )`);
  }

  if (hasValue(body.orderBy)) {
    body.orderBy = body.orderBy.split(',');
    order = `"${body.orderBy[0]}" ${body.orderBy[1].toUpperCase()}`;
  }

  conditions.push(`p."status" = '${config.postStatus.published}'`);
  // conditions.push('p."isActive" = TRUE');
  // conditions.push('p."isDeleted" = FALSE');
  // conditions.push('p."videoUrl" IS NOT NULL');
  conditions = conditions.join(' AND ');

  let countResult = await db('posts as p')
    .count('postId')
    .innerJoin('users as u', 'u.userId', 'p.userId')
    .leftJoin('reported_posts as rp', 'rp.reportedPostId', 'p.postId')
    .where(db.raw(conditions));

  const count = parseInt(countResult.pop().count);
  const page = parseInt(body.page) || 1;
  const skip = ROWS_PER_PAGE * (page - 1);

  if (hasValue(conditions))
    conditions = `
      WHERE ${conditions}`;

  try {
    const query = `
      SELECT
        p."postId",
        p."videoUrl",
        p."imageUrl",
        p."userId",
        p."description",
        p."createdTs" ,
        p."updatedTs",
        p."isActive",
        p."isDeleted",
        p."isOpen",
        (
          SELECT COUNT("commentId")::INTEGER
          FROM post_comments pc
          WHERE pc."postId" = p."postId"
        ) "comments",
        (
          SELECT COUNT("likeId")::INTEGER
          FROM post_likes pl
          WHERE pl."postId" = p."postId"
        ) "likes",
        (
          SELECT COUNT("blessingId")::INTEGER
          FROM post_blessings pb
          WHERE pb."postId" = p."postId"
        ) "blessings",
        (
          SELECT COUNT("viewId")::INTEGER
          FROM post_views pv
          WHERE pv."postId" = p."postId"
        ) "views",
        (
          SELECT COUNT("reportId")::INTEGER
          FROM reported_users ru
          WHERE ru."reportedUserId" = p."userId"
        ) "userReportedCount",
        (
          SELECT COUNT("reportId")::INTEGER
          FROM reported_posts rp
          WHERE rp."reportedPostId" = p."postId"
        ) "postReportedCount",
        (
          SELECT row_to_json(u)
            FROM(
              SELECT
                u."userId",
                u."userName",
                u."fullName",
                u."imageUrl",
                u."isActive",
                u."deviceType"
              FROM users u
              WHERE u."userId" = p."userId"
            ) u
        ) "postedBy",
        (
          SELECT row_to_json(c)
            FROM(
              SELECT
                c."categoryId",
                c."categoryName",
                c."isDeleted"
              FROM categories c
              WHERE c."categoryId" = p."categoryId"
            ) c
        ) category
      FROM posts as p
      JOIN users as u ON p."userId" = u."userId"
      LEFT JOIN reported_posts rp ON p."postId" = rp."reportedPostId" ${conditions}
      ORDER BY ${order}
      OFFSET ${skip}
      LIMIT ${ROWS_PER_PAGE}`;

    //console.log(`[getPosts] query: ${query}`);
    const result = await db.raw(query);

    const rows = result.rows;
    return res.send(
      new ApiResponse('Success', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[getPosts] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const togglePostDelete = async (req, res, next) => {
  const body = req.body;
  console.log(`[togglePostDelete] body: ${JSON.stringify(body)}`);
  try {
    if (!hasValue(body.postId)) {
      return next(createError(401, 'Invalid arguments'));
    }

    if ([true, false].indexOf(body.isDeleted) < 0) {
      return next(createError(401, 'Invalid arguments'));
    }

    const post = (
      await db('posts')
        .update({
          isDeleted: body.isDeleted,
          status:
            body.isDeleted == true
              ? config.postStatus.deleted
              : config.postStatus.published,
        })
        .where('postId', body.postId)
        .returning('*')
    ).pop();

    await db('post_comments')
      .update('isDeleted', body.isDeleted)
      .where('postId', body.postId);

    if (body.isDeleted == true) {
      await db('notifications').where({ postId: body.postId }).del();
      await db('notifications')
        .whereIn(
          'commentId',
          db('post_comments').select('commentId').where('postId', body.postId)
        )
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
          [post.userId]
        )
      ).rows.pop();

      await db('users')
        .update('postCount', parseInt(postCounts.count))
        .where('userId', post.userId);

      if (post.categoryId) {
        const postsInThisCategory = (
          await db('posts')
            .where('categoryId', post.categoryId)
            .andWhere('status', config.postStatus.published)
            .count('postId')
        ).pop();

        await db('categories')
          .update('totalPosts', parseInt(postsInThisCategory.count))
          .where('categoryId', post.categoryId);
      }
    }

    return res.send(new ApiResponse('Success', null).response);
  } catch (error) {
    console.log(`[togglePostDelete] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const togglePostActive = async (req, res, next) => {
  const body = req.body;
  console.log(`[togglePostActive] body: ${JSON.stringify(body)}`);
  try {
    if (!hasValue(body.postId)) {
      return next(createError(401, 'Invalid arguments'));
    }

    if ([true, false].indexOf(body.isActive) < 0) {
      return next(createError(401, 'Invalid arguments'));
    }

    await db('posts')
      .update({
        isActive: body.isActive,
        status:
          body.isActive === true
            ? config.postStatus.published
            : config.postStatus.unpublished,
      })
      .where('postId', body.postId);

    return res.send(new ApiResponse('Success', null).response);
  } catch (error) {
    console.log(`[togglePostActive] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const changePassword = async (req, res, next) => {
  const body = req.body;
  console.log(`[changePassword] body: ${JSON.stringify(body)}`);
  try {
    if (
      !hasValue(body.password) ||
      !hasValue(body.oldPass) ||
      !hasValue(body.passwordConfirm)
    ) {
      return next(createError(401, 'Invalid arguments'));
    }

    if (body.password !== body.passwordConfirm) {
      return next(createError(401, 'Passwords do not match'));
    }

    const existing = await db('admin_users')
      .select('password')
      .where('userId', req.user.userId);
    const passwordValid = await bcryptjs.compare(
      req.body.oldPass,
      existing[0].password
    );

    if (!passwordValid) {
      return next(createError(401, 'Invalid old password'));
    }

    body.password = bcryptjs.hashSync(body.password, 10);
    const result = await db('admin_users')
      .update('password', body.password)
      .where('userId', req.user.userId)
      .returning(['userId']);
    if (!hasResult(result)) {
      return next(
        createError(
          502,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
    return res.send(new ApiResponse('Success', result.pop()).response);
  } catch (error) {
    console.log(`[changePassword] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const addUser = async (req, res, next) => {
  const body = req.body;
  if (process.env.NODE_ENV === 'production') {
    return next(createError(401, ''));
  }

  console.log(`[addUser] body: ${JSON.stringify(body)}`);
  try {
    if (
      !hasValue(body.password) ||
      !hasValue(body.email) ||
      !hasValue(body.passwordConfirm)
    ) {
      return next(createError(401, 'Invalid arguments'));
    }

    if (body.password !== body.passwordConfirm) {
      return next(createError(401, 'Passwords do not match'));
    }

    body.password = bcryptjs.hashSync(body.password, 10);
    delete body.passwordConfirm;
    const result = await db
      .insert(body, ['userId', 'email'])
      .into('admin_users');
    if (!hasResult(result)) {
      return next(
        createError(
          502,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
    return res.send(new ApiResponse('Success', result.pop()).response);
  } catch (error) {
    console.log(`[addUser] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const editUser = async (req, res, next) => {
  const body = req.body;
  console.log(`[editUser] body: ${JSON.stringify(body)}`);
  if (process.env.NODE_ENV === 'production') {
    return next(createError(401, ''));
  }
  try {
    if (!hasValue(body.userId)) {
      return next(createError(401, 'userId is required'));
    }

    const userId = body.userId;
    delete body.userId;
    delete body.password;

    const result = await db('admin_users')
      .update(body)
      .where('userId', userId)
      .returning('*');
    if (!hasResult(result)) {
      return next(
        createError(
          502,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
    const user = result.pop();
    delete user.password;
    return res.send(new ApiResponse('Success', user).response);
  } catch (error) {
    console.log(`[editUser] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deleteUser = async (req, res, next) => {
  const body = req.body;
  console.log(`[deleteUser] body: ${JSON.stringify(body)}`);
  if (process.env.NODE_ENV === 'production') {
    return next(createError(401, ''));
  }
  try {
    if (!hasValue(body.userId)) {
      return next(createError(401, 'userId is required'));
    }

    if (body.userId === 1 || body.userId === req.user.userId) {
      return next(createError(401, 'Invalid arguments'));
    }

    const result = await db('admin_users').where('userId', body.userId).del();
    console.log(result);
    if (!hasValue(result)) {
      return next(
        createError(
          502,
          'Server is busy at the moment, please try again later.'
        )
      );
    }

    return res.send(new ApiResponse('Success', result).response);
  } catch (error) {
    console.log(`[deleteUser] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getAllAdmins = async (req, res, next) => {
  console.log(`[getAllAdmins]`);
  try {
    const rows = await db
      .select(['userId', 'email', 'name'])
      .from('admin_users')
      .where('userId', '!=', req.user.userId)
      .orderBy('userId', 'desc');
    return res.send(new ApiResponse('Success', rows).response);
  } catch (error) {
    console.log(`[getAllAdmins] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const appVersions = async (req, res, next) => {
  console.log(`[appVersions]`);
  try {
    const rows = await db('app_versions').select('*').orderBy('id', 'desc');

    return res.send(new ApiResponse('Success', rows).response);
  } catch (error) {
    console.log(`[getAllAdmins] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const updateAppVersion = async (req, res, next) => {
  try {
    let body = req.body;
    console.log(`[updateAppVersion] body: ${JSON.stringify(body)}`);

    if (!hasValue(body.version)) {
      return next(createError(502, 'Invalid version'));
    }

    body.version = body.version.toString();
    let regex = /^[0-9.]+$/;
    if (regex.test(body.version) === false) {
      return next(createError(502, 'Invalid version'));
    }

    if (!hasValue(body.platform)) {
      return next(createError(502, 'Unknown platform'));
    } else {
      body.platform = body.platform.toLowerCase();
      if (['android', 'ios'].indexOf(body.platform) < 0) {
        return next(createError(502, 'Unknown platform'));
      }
    }

    const existing = await db('app_versions').where('platform', body.platform);
    if (hasResult(existing)) {
      let current = existing.pop();
      // if (current.version < body.version) {
      //   return next(createError(502, 'Invalid version'));
      // }

      const updated = await db('app_versions')
        .update({
          version: body.version,
          forcedUpdate: body.forcedUpdate || false,
        })
        .where('id', current.id)
        .returning('*');

      if (hasResult(updated)) {
        return res.send(new ApiResponse('Success', updated.pop()).response);
      } else {
        next(
          createError(
            502,
            'Server is busy at the moment, please try again later.'
          )
        );
      }
    }
    res.send(body);
  } catch (error) {
    console.log(`[updateAppVersion] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const sendEmail = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[sendEmail] body: ${JSON.stringify(body)}`);

    let result = await emailSender.sendEmail({
      receiver: body.to,
      sender: 'contact@lellenge.com',
      subject: body.subject,
      body: body.body,
    });
    console.log(`[sendEmail] result: ${JSON.stringify(result)}`);
    return res.send(new ApiResponse('Success', {}).response);
  } catch (error) {
    console.log(`[sendEmail] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const addKeyword = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[addKeyword] body: ${JSON.stringify(body)}`);

    const result = (
      await db('keywords')
        .insert({
          keyword: body.keyword,
        })
        .returning('*')
    ).pop();

    res.send(new ApiResponse('Success', result).response);
  } catch (error) {
    console.log(`[addKeyword] error: ${error.stack}`);
    if (error.message.includes('keywords_keyword_key')) {
      return next(createError(401, 'Keyword already added'));
    }
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const addSubcategory = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[addSubcategory] body: ${JSON.stringify(body)}`);
    const exists = (
      await db('subcategories').whereRaw('lower(subcategory) = ?', [
        body.subcategory.toLowerCase(),
      ])
    ).pop();
    if (exists) {
      return next(createError(401, 'Subcategory already added'));
    }
    const result = (
      await db('subcategories')
        .insert({
          subcategory: body.subcategory,
        })
        .returning('*')
    ).pop();

    res.send(new ApiResponse('Success', result).response);
  } catch (error) {
    console.log(`[addSubcategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const updateKeyword = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[updateKeyword] body: ${JSON.stringify(body)}`);

    const result = (
      await db('keywords')
        .update({
          keyword: body.keyword,
        })
        .where('id', body.id)
        .returning('*')
    ).pop();

    res.send(new ApiResponse('Success', result).response);
  } catch (error) {
    console.log(`[updateKeyword] error: ${error.stack}`);
    if (error.message.includes('keywords_keyword_key')) {
      return next(createError(401, 'Keyword already added'));
    }
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const updateSubcategory = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[updateSubcategory] body: ${JSON.stringify(body)}`);

    const exists = (
      await db('subcategories').whereRaw('lower(subcategory) = ? AND id != ?', [
        body.subcategory.toLowerCase(),
        body.id,
      ])
    ).pop();

    if (exists) {
      return next(createError(401, 'Subcategory already added'));
    }

    const result = (
      await db('subcategories')
        .update({
          subcategory: body.subcategory,
        })
        .where('id', body.id)
        .returning('*')
    ).pop();

    res.send(new ApiResponse('Success', result).response);
  } catch (error) {
    console.log(`[updateSubcategory] error: ${error.stack}`);

    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deleteKeyword = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[deleteKeyword] body: ${JSON.stringify(body)}`);

    await db('keywords').where('id', body.id).del();
    res.send(new ApiResponse('Success', {}).response);
  } catch (error) {
    console.log(`[deleteKeyword] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deleteSubcategory = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[deleteSubcategory] body: ${JSON.stringify(body)}`);

    await db('subcategories').where('id', body.id).del();
    res.send(new ApiResponse('Success', {}).response);
  } catch (error) {
    console.log(`[deleteSubcategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getKeywords = async (req, res, next) => {
  const params = req.params;
  console.log(`[getKeywords] body: ${JSON.stringify(params)}`);

  try {
    let countResult = await db('keywords').count('id');
    const count = parseInt(countResult.pop().count);
    const page = parseInt(params.page) || 1;
    const skip = ROWS_PER_PAGE * (page - 1);

    const query = `
      select
        *
      from
      keywords k
      order by id desc
    `;
    // removed limit on publc demand
    // offset ${skip}
    // limit ${ROWS_PER_PAGE}

    const result = await db.raw(query);

    const rows = result.rows;
    return res.send(
      new ApiResponse('Keywords found', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[getKeywords] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getSubcategories = async (req, res, next) => {
  const params = req.params;
  console.log(`[getSubcategories] body: ${JSON.stringify(params)}`);

  try {
    let countResult = await db('subcategories').count('id');
    const count = parseInt(countResult.pop().count);
    const page = parseInt(params.page) || 1;
    const skip = ROWS_PER_PAGE * (page - 1);

    const query = `
      select
        *
      from
      subcategories k
      order by id desc
    `;

    const result = await db.raw(query);

    const rows = result.rows;
    return res.send(
      new ApiResponse('Subcategories found', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[getSubcategories] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const applyKeywords = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[applyKeywords] body: ${JSON.stringify(body)}`);

    const category = (
      await db('categories')
        .select(['keywords'])
        .where('categoryId', body.categoryId)
    ).pop();

    if (!category) {
      return next(createError(401, 'Invalid category'));
    }

    const result = await db('categories')
      .update(
        db.raw(
          `keywords = array_cat(keywords, ARRAY[${body.keywordId.join(',')}])`
        )
      )
      .where('categoryId', category.categoryId);

    res.send(new ApiResponse('Success', {}).response);
  } catch (error) {
    console.log(`[applyKeywords] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const applySubcategory = async (req, res, next) => {
  try {
    let { body } = req;
    console.log(`[applySubcategory] body: ${JSON.stringify(body)}`);

    const category = (
      await db('categories')
        .select(['subcategories'])
        .where('categoryId', body.categoryId)
    ).pop();

    if (!category) {
      return next(createError(401, 'Invalid category'));
    }

    await db.raw(`
      UPDATE categories
      SET subcategories = '{${body.subcategories.join(',')}}'
      WHERE "categoryId" = ${body.categoryId}
    `);
    // const result = await db('categories')
    //   .update(await db.raw(`subcategories = array_cat(subcategories, ARRAY[${body.subcategories.join(',')}])`))
    //   .where('categoryId', category.categoryId);

    res.send(new ApiResponse('Success', {}).response);
  } catch (error) {
    console.log(`[applySubcategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const addSoundCategory = async (req, res, next) => {
  const body = req.body;
  console.log(`[addSoundCategory] body: ${JSON.stringify(body)}`);

  try {
    const exists = (
      await db('sound_categories').where('categoryName', body.categoryName)
    ).pop();
    if (exists) {
      return next(createError(401, 'Category already exists'));
    }

    const category = (
      await db.insert(body, '*').into('sound_categories')
    ).pop();

    return res.send(new ApiResponse('Category added', category).response);
  } catch (error) {
    console.log(`[addCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const soundCategoryImage = async (req, res, next) => {
  const form = new formidable.IncomingForm(),
    files = [],
    fields = {};

  form.uploadDir = os.tmpdir();

  form
    .on('field', function (field, value) {
      fields[field] = value;
    })
    .on('fileBegin', function (name, file) {
      const fileName = `image.png`;
      file.path = `${form.uploadDir}/${fileName}`;
      file.name = fileName;
    })
    .on('file', function (field, file) {
      files.push(file);
    })
    .on('end', function () {
      const image = files[0];
      let fileName;
      fileName = 'img_' + Date.now().toString(32) + '.png';
      const args = {
        fileName: fileName,
        file: fs.readFileSync(image.path),
        contentType: 'image/png',
      };

      fileUploader.uploadFile(args, async (err, result) => {
        if (err) {
          console.log('error: ', err);
          return next(createError(502, 'Error while uploading'));
        }

        try {
          const imageUrl = `${S3_URL_PREFIX}/${args.fileName}`;
          return res.send(
            new ApiResponse('Category image uploaded', {
              imageUrl,
            }).response
          );
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
    });
  form.parse(req);
};

const editSoundCategory = async (req, res, next) => {
  let body = req.body;
  console.log(`[editSoundCategory] body: ${JSON.stringify(body)}`);
  const categoryId = body.id;

  try {
    let exists = (await db('sound_categories').where('id', categoryId)).pop();
    if (!exists) {
      return res.send(new ApiResponse('Invalid categoryId', null, 0).response);
    }

    let category = await db('sound_categories')
      .update(body, '*')
      .where('id', categoryId);
    if (!hasResult(category)) {
      return res.send(
        new ApiResponse(
          'Server is busy at the moment, please try again later.',
          null,
          0
        ).response
      );
    }

    return res.send(
      new ApiResponse('Category updated successfully', category.pop()).response
    );
  } catch (error) {
    console.log(`[editCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getSoundCategories = async (req, res, next) => {
  const params = req.params;
  console.log(`[getSoundCategories] body: ${JSON.stringify(params)}`);

  try {
    let countResult = await db('sound_categories').count('*');
    const count = parseInt(countResult.pop().count);
    const page = parseInt(params.page) || 1;
    const skip = ROWS_PER_PAGE * (page - 1);

    const query = `
      select
        c."id",
        c."categoryName",
        c."isDeleted",
        c."imageUrl",
        c.countries
      from
      sound_categories c
      order by id desc
      offset ${skip}
      limit ${ROWS_PER_PAGE}
    `;
    const result = await db.raw(query);

    const rows = result.rows;
    return res.send(
      new ApiResponse('Categories found', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[getCategories] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getSoundCategory = async (req, res, next) => {
  const params = req.params;
  console.log(`[getSoundCategory] body: ${params}`);

  try {
    const rows = await db('sound_categories').where('id', params.categoryId);
    if (!hasResult(rows)) {
      return res.send(new ApiResponse('Invalid categoryId', null, 0).response);
    }
    return res.send(new ApiResponse('Category found', rows.pop()).response);
  } catch (error) {
    console.log(`[getSoundCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deleteSoundCategory = async (req, res, next) => {
  const params = req.params;
  console.log(`[deleteSoundCategory] params: ${JSON.stringify(params)}`);

  try {
    const result = await db('sound_categories')
      .update('isDeleted', true)
      .where('id', params.categoryId)
      .returning('*');
    if (hasValue(result)) {
      return res.send(new ApiResponse('Category deleted', result).response);
    }
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  } catch (error) {
    console.log(`[deleteSoundCategory] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const getSounds = async (req, res, next) => {
  try {
    const params = req.params;
    const args = req.query;

    const countQuery = db('sounds')
      .count('*')
      .join('users', 'users.userId', 'sounds.userId')
      .where('users.soundSponsored', true)
      .andWhere('sounds.isDeleted', false);

    if (args && args.text) {
      countQuery.andWhere('title', 'ilike', `%${args.text}%`);
    }

    let countResult = await countQuery.then();

    const count = parseInt(countResult.pop().count);
    const page = parseInt(params.page) || 1;
    const skip = ROWS_PER_PAGE * (page - 1);

    console.log('skip:', skip);
    const query = db('sounds')
      .select(db.raw('distinct on (sounds.id) sounds.id'))
      .select([
        'title',
        'duration',
        'streamUrl',
        'sounds.imageUrl',
        'isPopular',
        'createdAt',
        db.raw(`
        (
          SELECT array_to_json(array_agg(row_to_json(c)))
            FROM(
              SELECT
                c."id",
                c."categoryName",
                c."isDeleted",
                c."imageUrl"
              FROM sound_categories c
              WHERE c."id" = any(sounds."soundCategoryIds")
            ) c
        ) "soundCategories"`),
        db.raw(`
        (
          SELECT array_to_json(array_agg(row_to_json(c)))
            FROM(
              SELECT
                c."categoryId" as id,
                c."categoryName",
                c."isDeleted",
                c."imageUrl"
              FROM categories c
              WHERE c."categoryId" = any(sounds."videoCategoryIds")
            ) c
        ) "videoCategories"`),
      ])

      .join('users', 'users.userId', 'sounds.userId')
      .where('users.soundSponsored', true)
      .andWhere('sounds.isDeleted', false)
      .orderBy('sounds.id', 'desc')
      .limit(ROWS_PER_PAGE)
      .offset(skip);

    if (args && args.text) {
      query.andWhere('title', 'ilike', `%${args.text}%`);
    }

    const rows = await query.then();
    return res.send(
      new ApiResponse('Found', {
        count,
        page,
        rows,
      }).response
    );
  } catch (error) {
    console.log(`[getSounds] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const updateSound = async (req, res, next) => {
  try {
    const { imageUrl, soundCategoryIds, videoCategoryIds, title } = req.body;
    const { id } = req.params;

    const sound = (await db('sounds').where({ id })).pop();
    if (!sound) {
      return res.send(new ApiResponse('Invalid sound', null, 0).response);
    }

    if (soundCategoryIds && soundCategoryIds.length) {
      const categories = await db('sound_categories')
        .select(['id'])
        .whereIn('id', soundCategoryIds);

      if (categories.length !== soundCategoryIds.length) {
        return res.send(
          new ApiResponse('Invalid sound categoryId', null, 0).response
        );
      }
    }

    if (videoCategoryIds && videoCategoryIds.length) {
      const categories = await db('categories')
        .select(['categoryId'])
        .whereIn('categoryId', videoCategoryIds);

      if (categories.length !== videoCategoryIds.length) {
        return res.send(
          new ApiResponse('Invalid video categoryId', null, 0).response
        );
      }
    }

    const result = await db('sounds')
      .update({ soundCategoryIds, videoCategoryIds, imageUrl, title })
      .where({ id });
    return res.send(new ApiResponse('Updated', result).response);
  } catch (error) {
    console.log(`[updateSound] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const deleteSound = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[deleteSound] id: ${id}`);
    const sound = (await db('sounds').where({ id })).pop();
    if (!sound) {
      return res.send(new ApiResponse('Invalid sound', null, 0).response);
    }

    await db('sounds').update({ isDeleted: true }).where({ id });
    return res.send(new ApiResponse('Deleted', {}).response);
  } catch (error) {
    console.log(`[deleteSound] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const allCategories = async (req, res) => {
  try {
    const results = {};
    results.soundCategories = await db('sound_categories')
      .select(['id', 'categoryName'])
      .where('isDeleted', false);
    results.videoCategories = await db('categories')
      .select(['categoryId as id', 'categoryName'])
      .where('isDeleted', false);

    return res.send(new ApiResponse('Category found', results).response);
  } catch (error) {
    console.log(`[updateSound] error: ${error.stack}`);
    return next(
      createError(502, 'Server is busy at the moment, please try again later.')
    );
  }
};

const changeVerification = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`[changeVerification] body: ${JSON.stringify(body)}`);

    if (!hasValue(body.verification)) {
      return next(createError(401, 'verification parameter not found.'));
    }

    if (!Object.keys(config.verificationStatus).includes(body.verification)) {
      return next(createError(401, 'Verification value is not valid.'));
    }

    const { userId } = req.params;
    const request = (
      await db('user_verification_requests').where({ userId })
    ).pop();

    if (!request) {
      return next(createError(404, 'Request not found.'));
    }

    const user = (
      await db('users')
        .where({ userId })
        .andWhere('isActive', true)
        .andWhere('isDeleted', false)
    ).pop();

    if (!user) {
      return next(createError(401, 'User not found.'));
    }

    const trx = await getTransaction(db);
    try {
      await db('users')
        .transacting(trx)
        .update('verification', body.verification)
        .where('userId', user.userId);

      await db('user_verification_requests')
        .transacting(trx)
        .update({ status: body.verification })
        .where({ userId });

      await trx.commit();
      res.send(
        new ApiResponse('User verification changed successfully').response
      );
    } catch (error) {
      console.log(`[changeVerification]; ${error.stack}`);
      await trx.rollback();
      return next(
        createError(
          401,
          'Server is busy at the moment, please try again later.'
        )
      );
    }
  } catch (error) {
    console.log(`[verify] error: ${error.message}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
};

export default {
  login,
  profile,
  users,
  feedbacks,
  reports,
  getCategory,
  getCategories,
  addCategory,
  editCategory,
  deleteCategory,
  categoryImage,
  categoryVideo,
  getCounts,
  setUserStatus,
  setUserSponsored,
  setUserCountries,
  markBug,
  markRead,
  getPosts,
  togglePostDelete,
  togglePostActive,
  changePassword,
  addUser,
  editUser,
  deleteUser,
  getAllAdmins,
  appVersions,
  updateAppVersion,
  sendEmail,
  addKeyword,
  updateKeyword,
  deleteKeyword,
  getKeywords,
  applyKeywords,
  addSubcategory,
  updateSubcategory,
  getSubcategories,
  deleteSubcategory,
  applySubcategory,
  addSoundCategory,
  soundCategoryImage,
  editSoundCategory,
  getSoundCategories,
  deleteSoundCategory,
  getSoundCategory,
  getSounds,
  updateSound,
  deleteSound,
  allCategories,
  changeVerification,
};
