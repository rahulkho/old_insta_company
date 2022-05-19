import fs from 'fs';
import os from 'os';
import _ from 'lodash';
import bcryptjs from 'bcryptjs';
import request from 'request';
import jwt from 'jsonwebtoken';
import formidable from 'formidable';
import createError from 'http-errors';
import uuid from 'uuid/v4';

import db from '../../db';
import FileUploader from '../../classes/FileUploader';
import EmailSender from '../../classes/EmailSender';
import EmailPayload from '../../classes/EmailPayload';
import ApiResponse from '../../classes/ApiResponse';
import ApiResult from '../../classes/ApiResult';
import Responses from '../../lib/api_response';
import utils, { getTransaction, randomString } from '../../lib/utils';
import { sendUserFollow, actions } from '../../lib/notifications';
import { download } from '../../lib/download';

import config from '../../config';
const { cdnUrl, cdnStoragePath } = config.app;

import {
  searchUsersQuery,
  suggestedUsersQuery,
  getSingleUser,
  getBlockedUsers,
  getFollowersQuery,
  getAlertsQuery,
  getAlertsQueryWithoutPosts,
} from '../../lib/user_queries';
import { deleteById } from './sounds';

const genericErrorMsg = 'Server is busy at the moment, please try again later.';
const S3_URL_PREFIX = 'https://s3-us-west-1.amazonaws.com/instausercontent';
const CLOUDFRONT_URL = 'https://d1meaeg0x3jt1n.cloudfront.net';

const env = process.env.NODE_ENV === 'production' ? 'p' : 'd';

const hasResult = (rows) => {
  return rows && rows.length >= 1;
};

const hasValue = (thing) => {
  return thing && (thing.length || !isNaN(parseInt(thing)));
};

const log = (arg1, arg2 = '', arg3 = '', arg4 = '', arg5 = '') => {
  console.log(
    `${new Date().toISOString()} ${arg1} ${arg2} ${arg3} ${arg4} ${arg5}`
  );
};

const TWELVE_HOURS_IN_MILLIS = 12 * 3600000;
const emailSender = new EmailSender();
const fileUploader = new FileUploader();

const LIMIT_30 = 30;

const get = async (req, res, next) => {
  try {
    const rows = await getSingleUser(req.user.userId, req.user.userId);
    const user = rows.pop();
    if (user) {
      return res.send(new ApiResult('Success', user).success());
    } else {
      return next(createError(404, 'User does not exist'));
    }
  } catch (error) {
    console.log(error);
    return next(createError(500, 'Server error'));
  }
};

const userNameValid = (str) => {
  // var regex = /^[a-zA-Z0-9\s'-]+$/;
  let regex = new RegExp('^[0-9A-Za-z_.-]+$');
  if (regex.test(str)) {
    return true;
  } else {
    return false;
  }
};

const checkIsBlocked = async (user1, user2) => {
  const array = `ARRAY[${user1}, ${user2}]`;
  const rows = await db('user_blocks').where(
    db.raw(`"userId" = ANY(${array}) AND "blockedUserId" = ANY(${array})`)
  );

  return rows.pop();
};

const facebookLogin = async (req, res, next) => {
  // console.log(`[login] body :${JSON.stringify(req.body)}`);
  const body = req.body;
  const publicKey = req.body.publicKey;
  console.log(`[facebookLogin] body: ${JSON.stringify(body)}`);
  if (body.email == '') {
    delete body.email;
  }
  const _login = async (user, res, next) => {
    try {
      if (!user.isActive) {
        return res.send(
          new ApiResult().sendStatus(Responses.PROFILE.PROFILE_DEACTIVATED)
        );
      }
      const userId = user.userId;
      const payload = {
        userId,
      };
      const authToken = jwt.sign(payload, process.env.JWT_SECRET);
      const rows = await db('users')
        .update(
          {
            authToken,
            publicKey,
          },
          '*'
        )
        .where('userId', user.userId);
      const updated = rows.pop();
      delete updated.password;
      await utils.getIpAddrInfo(userId, req.clientIp);
      return res.send(
        new ApiResponse('Facebook login successful', updated).response
      );
    } catch (error) {
      console.log('[facebookLogin] err: ', error.stack);
      return next(createError(401, genericErrorMsg));
    }
  };

  const _register = async (body, res, next) => {
    try {
      if (!hasValue(body.userName)) {
        return res.send(
          new ApiResult().sendStatus(Responses.PROFILE.USERNAME_REQUIRED)
        );
      }

      if (!userNameValid(body.userName)) {
        return res.send(
          new ApiResult().sendStatus(Responses.PROFILE.USERNAME_INVALID)
        );
      }

      const userNameExists = await db('users')
        .where('userName', body.userName)
        .andWhere('active', 1);
      if (hasResult(userNameExists)) {
        return res.send(
          new ApiResult().sendStatus(Responses.PROFILE.USERNAME_ALREADY_EXISTS)
        );
      }

      if (hasValue(body.email)) {
        const emailExists = await db('users')
          .where('email', body.email)
          .andWhere('active', 1);
        if (hasResult(emailExists)) {
          return next(createError(401, 'Email already exists'));
        }
      }

      const rows = await db.insert(body, '*').into('users');
      if (!hasResult(rows)) {
        return next(createError(401, genericErrorMsg));
      }

      const user = rows.pop();
      const payload = {
        userId: user.userId,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET);
      await db('users')
        .update({
          authToken: token,
        })
        .where('userId', user.userId);
      user.authToken = token;
      await utils.getIpAddrInfo(user.userId, req.clientIp);
      //delete user.password;
      //return res.send(new ApiResponse('Facebook login successful', user).response);
      const registered = await getSingleUser(user.userId, user.userId);
      return res.send(new ApiResult('Success', registered.pop()).success());
    } catch (error) {
      console.log('[facebookLogin] err: ', error.stack);
      return res.send(new ApiResponse(genericErrorMsg, null, 0).response);
    }
  };

  const run = async () => {
    try {
      //console.log(body);
      const userExists = await db('users')
        .where('fbId', body.fbId)
        .andWhere('active', 1)
        .andWhere('isDeleted', false);

      if (hasResult(userExists)) {
        console.log(`[facebookLogin] user exists, logging in..`);
        //console.log(userExists);
        let existingUser = userExists.pop();
        if (!existingUser.isActive) {
          return res.send(
            new ApiResult().sendStatus(
              Responses.PROFILE.ACC_DISABLED_CONTACT_SUPPORT
            )
          );
        }
        _login(existingUser, res, next);
      } else if (hasValue(body.imageUrl)) {
        console.log(`[facebookLogin] registering..`);
        console.log(`[facebookLogin] downloading image`);
        download(body.imageUrl, (err, result) => {
          console.log(`[facebookLogin] ${err}`);
          console.log(`[facebookLogin] ${result}`);
          if (err) {
            body.imageUrl = null;
          } else {
            body.imageUrl = `${CLOUDFRONT_URL}/${result}`;
          }
          //console.log(`[facebookLogin] ${JSON.stringify(body)}`);
          _register(body, res, next);
        });
      } else {
        _register(body, res, next);
      }
    } catch (error) {
      console.log('[facebookLogin] err: ', error.stack);
      return res.send(new ApiResponse(genericErrorMsg, null, 0).response);
    }
  };

  if (!hasValue(body.fbId)) {
    return next(createError(401, 'Please provide Facebook ID'));
  }

  if (!hasValue(body.gender) || body.gender === '') {
    delete body.gender;
  }

  if (hasValue(body.password)) {
    delete body.password;
  }

  run();
};

const register = async (req, res, next) => {
  const body = req.body;
  console.log(`[register] body : ${JSON.stringify(req.body)}`);

  if (!hasValue(body.email)) {
    return res.send(
      new ApiResult().sendStatus(Responses.PROFILE.EMAIL_REQUIRED)
    );
  }

  if (!hasValue(body.userName)) {
    return res.send(
      new ApiResult().sendStatus(Responses.PROFILE.USERNAME_REQUIRED)
    );
  }

  if (!userNameValid(body.userName)) {
    return res.send(
      new ApiResult().sendStatus(Responses.PROFILE.USERNAME_INVALID)
    );
  }

  if (!hasValue(body.fbId) && !hasValue(body.password)) {
    return res.send(
      new ApiResult().sendStatus(Responses.PROFILE.PASSWORD_REQUIRED)
    );
  }

  // if (!hasValue(body.email) || body.email === '') {
  //   delete body.email;
  // }

  if (!hasValue(body.gender) || body.gender === '') {
    delete body.gender;
  }

  if (hasValue(body.gender)) {
    body.gender = body.gender.toLowerCase();
  }

  if (hasValue(body.deviceType)) {
    body.deviceType = body.deviceType.toLowerCase();
  }
  // if(!body.fbId)delete body.fbId;
  // if(!body.imageUrl) delete body.imageUrl;
  for (let key in body) {
    if (!body[key]) delete body[key];
  }
  const user = {
    ...body,
    password: bcryptjs.hashSync(body.password, 10),
  };

  console.log(`[register] user : ${JSON.stringify(user)}`);

  db.transaction(function (trx) {
    return db('users')
      .where('email', req.body.email)
      .andWhere('active', 1)
      .transacting(trx)
      .then((rows) => {
        if (!hasResult(rows)) {
          return user;
        } else {
          let existingUser = rows.pop();
          if (!existingUser.isActive) {
            res.send(
              new ApiResult().sendStatus(
                Responses.PROFILE.ACC_DISABLED_CONTACT_SUPPORT
              )
            );
          } else {
            res.send(
              new ApiResult().sendStatus(Responses.PROFILE.EMAIL_ALREADY_EXISTS)
            );
          }
          return Promise.reject();
        }
      })
      .then((user) => {
        return db('users')
          .where('userName', req.body.userName)
          .andWhere('active', 1)
          .transacting(trx)
          .then((rows) => {
            if (!hasResult(rows)) {
              return user;
            } else {
              res.send(
                new ApiResult().sendStatus(
                  Responses.PROFILE.USERNAME_ALREADY_EXISTS
                )
              );
              return Promise.reject();
            }
          });
        // return db('users')
        //   .where('email', req.body.email)
        //   .transacting(trx)
        //   .then((rows) => {
        //     if (!hasResult(rows)) {
        //       return user;
        //     } else {
        //       res.send(new ApiResult().sendStatus(Responses.PROFILE.EMAIL_ALREADY_EXISTS));
        //       return Promise.reject();
        //     }
        //   })
      })
      .then((user) => {
        return db
          .insert(user, '*')
          .into('users')
          .transacting(trx)
          .then((rows) => {
            return rows.pop();
          });
      })
      .then(function (result) {
        const payload = {
          userId: result.userId,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET);

        return db('users')
          .update(
            {
              authToken: token,
            },
            '*'
          )
          .transacting(trx)
          .where('userId', result.userId)
          .then((rows) => {
            return rows.pop();
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  })
    .then(async function (result) {
      // result = result.pop();
      if (result.email) {
        // const emailPayload =
        //   new EmailPayload(
        //     'Welcome to Insta',
        //     'You have sucessfully registered',
        //     result.email,
        //     `user-${result.userId}`
        //   );
        // console.log(`[register] payload: ${JSON.stringify(emailPayload)}`);
        // emailSender.sendEmail(emailPayload, (err, sesResult) => {
        //   if (err) console.log(`[register] err: ${err.stack}`);
        //   console.log(`[register] sesResult: ${JSON.stringify(sesResult)}`);
        // });
      }
      delete result.password;
      await utils.getIpAddrInfo(result.userId, req.clientIp);
      const rows = await getSingleUser(result.userId, result.userId);
      return res.send(new ApiResult('Success', rows.pop()).success());
    })
    .catch(function (error) {
      console.log(`[register] err: ${error.stack}`);
      // if (error.promiseError) {
      //   return res.send(new ApiResponse(error.message, null, 0).response);
      // }
      // return next(createError(401, genericErrorMsg));
    });
};

const logout = async (req, res, next) => {
  try {
    log(`[logout] body :${JSON.stringify(req.body)}`);
    const result = await db('users')
      .update({
        authToken: null,
        deviceToken: null,
      })
      .where('userId', req.user.userId);

    log('[logout]', result);
    if (hasValue(result)) {
      return res.send(new ApiResult().sendStatus(Responses.GENERAL.SUCCESS));
    }
  } catch (e) {
    console.log(`[register] err: ${error.stack}`);
    return next(createError(401, genericErrorMsg));
  }
};

const login = async (req, res, next) => {
  log(`[login] user :${req.body.email}`);

  if (!hasValue(req.body.email)) {
    return next(createError(401, 'Email is required'));
  }

  if (!hasValue(req.body.password)) {
    return next(createError(401, 'Invalid email address or password'));
  }
  const publicKey = req.body.publicKey;
  const rows = await db('users')
    .where('email', req.body.email)
    .andWhere('active', 1);

  if (hasResult(rows)) {
    const user = rows.pop();

    if (!user.isActive) {
      return res.send(
        new ApiResult().sendStatus(
          Responses.PROFILE.ACC_DISABLED_CONTACT_SUPPORT
        )
      );
    }

    /**
     * 09/04/2019 mad echanges as per skype convo
     */
    // if (user.isDeleted) {
    //   return res.send(new ApiResult().sendStatus(Responses.PROFILE.PROFILE_DELETED));
    // }

    try {
      const passwordValid = await bcryptjs.compare(
        req.body.password,
        user.password
      );
      if (passwordValid) {
        const payload = {
          userId: user.userId,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET);

        let updatedUser = await db('users')
          .update(
            {
              authToken: token,
              publicKey,
            },
            '*'
          )
          .where('userId', user.userId);
        updatedUser = updatedUser.pop();
        const rows = await getSingleUser(
          updatedUser.userId,
          updatedUser.userId
        );
        await utils.getIpAddrInfo(updatedUser.userId, req.clientIp);
        return res.send(new ApiResult('Success', rows.pop()).success());
        // return res.send(
        //   new ApiResponse(
        //     'Login successful',
        //     updatedUser
        //   ).response);
      } else {
        return res.send(
          new ApiResponse('Invalid email address or password', null, 0).response
        );
      }
    } catch (error) {
      log('[login] err: ', error.stack);
      return res.send(
        new ApiResponse('Invalid email address or password', null, 0).response
      );
    }
  } else {
    return res.send(
      new ApiResponse('Invalid email address or password', null, 0).response
    );
  }
};

const registerDeviceToken = async (req, res, next) => {
  try {
    const updatedUser = await db('users')
      .update('deviceToken', req.body.deviceToken)
      .where('userId', req.user.userId)
      .returning(['userId', 'deviceToken']);

    if (hasResult(updatedUser)) {
      const user = updatedUser.pop();
      delete user.password;
      delete user.authToken;
      return res.send(new ApiResponse('Device token saved', user).response);
    } else {
      return next(createError(500, genericErrorMsg));
    }
  } catch (error) {
    console.log(error.stack);
    return next(createError(500, genericErrorMsg));
  }
};

const getDeviceToken = async (req, res, next) => {
  console.log(`[getDeviceToken] users :${JSON.stringify(req.user)}`);
  const rows = await db
    .select('deviceToken')
    .from('users')
    .where('userId', req.user.userId);
  if (hasResult(rows)) {
    return res.send(new ApiResponse('Device token found', rows.pop()).response);
  } else {
    return next(createError(401, 'Invalid userId'));
  }
};

const updateProfile = async (req, res, next) => {
  console.log(`[updateProfile] body :${JSON.stringify(req.body)}`);
  const body = req.body;

  delete body.userId;
  delete body.password;
  delete body.authToken;
  delete body.email;
  delete body.userName;

  if (!hasValue(body.email)) {
    delete body.email;
  }

  if (hasValue(body.gender)) {
    body.gender = body.gender.toLowerCase();
  }

  if (hasValue(body.deviceType)) {
    body.deviceType = body.deviceType.toLowerCase();
  }

  try {
    await db('users')
      .update(body)
      .where('userId', req.user.userId)
      .returning('*');

    const savedUser = await getSingleUser(req.user.userId, req.user.userId);
    const userPayload = savedUser.pop();

    return res.send(
      new ApiResult().withPayload(
        Responses.PROFILE.PROFILE_UPDATED,
        userPayload
      )
    );
  } catch (error) {
    console.log(`[updateProfile] Err: ${error.stack}`);
    if (
      error.message.includes('duplicate') &&
      error.message.includes('users_email_unique')
    ) {
      return next(createError(401, 'Email already exists'));
    }
    next(createError(401, 'Invalid parameters'));
  }
};

const updateImage = async (req, res, next) => {
  let user = req.user;
  const form = new formidable.IncomingForm(),
    files = [],
    fields = [];

  const { userId } = user;
  form.uploadDir = os.tmpdir();

  form
    .on('field', function (field, value) {
      fields.push([field, value]);
    })
    .on('fileBegin', function (name, file) {
      const fileName = `user-${user.userId}-image.png`;

      file.path = `${form.uploadDir}/${fileName}`;
      file.name = fileName;
    })
    .on('file', function (field, file) {
      files.push(file);
    })
    .on('end', async function () {
      const fileName = `${env}/avatars/${userId}-${randomString(8)}.png`;
      const file = files[0];
      fs.createReadStream(file.path)
        .pipe(
          request.put({
            url: cdnStoragePath + '/' + fileName,
            headers: { AccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY },
          })
        )
        .on('end', async function () {
          console.log('stream end');
          const imageUrl = cdnUrl + '/' + fileName;
          const result = (
            await db('users')
              .update(
                {
                  imageUrl: imageUrl,
                  imageThumbUrl: imageUrl,
                },
                ['imageUrl', 'imageThumbUrl']
              )
              .where('userId', user.userId)
          ).pop();

          if (result) {
            res.send(new ApiResponse('Profile image updated', result).response);
          } else {
            next(createError(502, genericErrorMsg));
          }
        })
        .on('error', function (err) {
          console.log('stream err:', err.stack);
          return next(createError(502, genericErrorMsg));
        });
    });
  form.parse(req);
};

const forgotPassword = async (req, res, next) => {
  try {
    console.log(`[forgotPassword] body :${JSON.stringify(req.body)}`);
    const body = req.body;
    let link;
    let user = await db('users').where('email', body.email);
    if (!hasResult(user)) {
      return next(
        createError(
          401,
          'Please enter an email address which is associated with your account with Lellenge.'
        )
      );
    }
    user = user.pop();

    let request = await db('password_reset_requests').where(
      'userId',
      user.userId
    );
    if (hasResult(request)) {
      request = request.pop();
      await db('password_reset_requests')
        .where('requestId', request.requestId)
        .del();
    }

    const resetRequest = {
      userId: user.userId,
      resetToken: uuid(),
    };

    const inserted = await db('password_reset_requests')
      .insert(resetRequest)
      .returning('*');
    if (!hasResult(inserted)) {
      return next(createError(401, 'Invalid request'));
    }

    request = inserted.pop();

    link = `http://lellenge.com/reset-password?token=${request.resetToken}`;

    const emailPayload = new EmailPayload(
      'Reset your password',
      utils.resetPasswordMarkup(link),
      user.email
    );

    let emailResult = await emailSender.sendEmail(emailPayload);

    console.log(`[forgotPassword] sesResult: ${JSON.stringify(emailResult)}`);

    return res.send(
      new ApiResponse(
        'We have emailed you instructions for setting your password, if an account exists with the email you entered. You should receive them shortly.',
        null
      ).response
    );
  } catch (error) {
    console.log(`[forgotPassword] error: ${error.stack}`);
    return next(createError(401, 'Invalid request'));
  }
};

const resetPassword = async (req, res, next) => {
  const body = req.body;
  console.log(`[resetPassword] body: ${JSON.stringify(body)}`);

  if (body.password !== body.passwordConfirmation) {
    return next(createError(401, 'Passwords do not match'));
  }
  try {
    let resetRequest = await db('password_reset_requests').where(
      'resetToken',
      body.resetToken
    );
    if (!hasResult(resetRequest)) {
      return next(createError(401, 'Invalid token'));
    }
    resetRequest = resetRequest.pop();
    const expires = new Date(resetRequest.expires);
    const userId = resetRequest.userId;
    if (expires < new Date()) {
      await db('password_reset_requests')
        .where('requestId', resetRequest.requestId)
        .del();
      console.log(`[resetPassword] token has expired`);
      return next(createError(401, 'Token has expired'));
    }

    const password = bcryptjs.hashSync(body.password, 10);
    const updatedUser = await db('users')
      .update({
        password: password,
      })
      .where('userId', userId)
      .returning('*');

    if (hasResult(updatedUser)) {
      console.log(`[resetPassword] reset completed`);
      res.send(new ApiResponse('Password reset successful', null).response);
      await db('password_reset_requests')
        .where('requestId', resetRequest.requestId)
        .del();
    } else {
      return next(createError(401, 'Invalid token'));
    }
  } catch (error) {
    console.log(`[resetPassword] error: ${error.stack}`);
    return next(createError(401, 'Invalid token'));
  }
};

const changePassword = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(req.user);
    console.log(body);
    if (!hasValue(body.oldPassword) || !hasValue(body.newPassword)) {
      return next(createError(401, genericErrorMsg));
    }

    const rows = await db('users')
      .select('password')
      .where('userId', req.user.userId);
    let user = rows.pop();

    const passwordValid = await bcryptjs.compare(
      req.body.oldPassword,
      user.password
    );
    if (!passwordValid) {
      return res.send(
        new ApiResult().sendStatus(
          Responses.PROFILE.CHANGE_PASS_INVALID_OLD_PASS
        )
      );
    }

    const newPassword = bcryptjs.hashSync(body.newPassword, 10);
    const update = await db('users')
      .update('password', newPassword)
      .where('userId', req.user.userId);

    if (!hasValue(update)) {
      return next(createError(401, genericErrorMsg));
    }
    //return res.send(new ApiResult('Success', null).success());
    return res.send(
      new ApiResult().sendStatus(Responses.PROFILE.CHANGE_PASS_SUCCESS)
    );
  } catch (error) {
    console.log(`[changePassword] error: ${error.stack}`);
    return next(createError(401, genericErrorMsg));
  }
};

const general = async (req, res, next) => {
  try {
    if (req.params.type === 'response-codes') {
      return res.send(Responses);
    }
    const rows = await db('general_info').where('type', req.params.type);
    if (!hasResult(rows)) {
      return next(createError(401, 'Invalid request'));
    }
    res.send(new ApiResponse('Resource found', rows.pop()).response);
  } catch (error) {
    console.log(`[general]error: ${error.stack} `);
    next(createError(401, 'Invalid request'));
  }
};

const postFeedback = async (req, res, next) => {
  console.log(`[postFeedback] body :${JSON.stringify(req.body)}`);
  const body = req.body;
  if (req.user) {
    body.userId = req.user.userId;
  }

  if (!hasValue(body.type)) {
    return next(createError(401, genericErrorMsg));
  }
  body.type = body.type.toLowerCase();

  if (!['feedback', 'report'].includes(body.type)) {
    return next(createError(401, genericErrorMsg));
  }
  console.log(`[feedback] body: ${JSON.stringify(body)}`);
  try {
    const feedback = await db.insert(body, '*').into('user_feedbacks');
    let row = feedback.pop();
    if (row.type === 'feedback') {
      res.send(
        new ApiResult().withPayload(Responses.GENERAL.FEEDBACK_SUCCESS, row)
      );
    } else {
      res.send(
        new ApiResult().withPayload(Responses.GENERAL.REPORT_SUCCESS, row)
      );
    }
  } catch (error) {
    console.log(`[postFeedback] error: ${error.stack}`);
    if (body.type === 'feedback') {
      return res.send(
        new ApiResult().sendStatus(Responses.GENERAL.FEEDBACK_ERR)
      );
    }
    res.send(new ApiResult().sendStatus(Responses.GENERAL.SERVER_ERR));
  }
};

const follow = async (req, res, next) => {
  const body = req.body;

  try {
    const { userId } = req.user;
    const { followedUserId } = req.body;
    if (userId === followedUserId) {
      return next(createError(401, genericErrorMsg));
    }

    const targetUserRow = await db('users')
      .select(['isActive', 'isDeleted'])
      .where('userId', followedUserId);
    const targetUser = targetUserRow.pop();

    if (
      (targetUser && !targetUser.isActive) ||
      (targetUser && targetUser.isDeleted)
    ) {
      return next(
        createError(401, 'The user is unavailable, please refresh the page')
      );
    }

    const isBlocked = await db('user_blocks')
      .where({ userId })
      .andWhere('blockedUserId', followedUserId);

    if (hasResult(isBlocked)) {
      return next(createError(401, 'Please unblock the user'));
    }

    const iAmBlocked = await db('user_blocks')
      .where('blockedUserId', userId)
      .andWhere('userId', followedUserId);

    if (hasResult(iAmBlocked)) {
      return next(createError(401, 'The user is unavailable'));
    }

    const isFollowing = await db('user_follows')
      .where({ userId })
      .andWhere('followedUserId', followedUserId);
    if (hasResult(isFollowing)) {
      return next(createError(401, 'You are already following this user'));
    }
    console.log(`[follow] body: ${JSON.stringify(body)}`);

    const trx = await getTransaction(db);
    try {
      const result = await db
        .transacting(trx)
        .insert({ userId, followedUserId }, '*')
        .into('user_follows');
      if (!hasResult(result)) {
        return next(createError(401, genericErrorMsg));
      }

      const followObj = result.pop();

      const followCount = (
        await db('user_follows')
          .transacting(trx)
          .where({ followedUserId })
          .count()
      ).pop();

      await db('users')
        .transacting(trx)
        .update('followersCount', parseInt(followCount.count))
        .where('userId', followedUserId);

      const followingsCount = (
        await db('user_follows').transacting(trx).where({ userId }).count()
      ).pop();

      await db('users')
        .transacting(trx)
        .update('followingsCount', parseInt(followingsCount.count))
        .where({ userId });

      await trx.commit();
      sendUserFollow(followObj, () => {
        res.send(
          new ApiResponse('User followed successfully', followObj).response
        );
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.log(`[follow] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const unfollow = async (req, res, next) => {
  const body = req.body;

  try {
    const { userId } = req.user;
    const { followedUserId } = req.body;
    if (userId === followedUserId) {
      return next(createError(401, genericErrorMsg));
    }

    const isBlocked = await db('user_blocks')
      .where('userId', req.user.userId)
      .andWhere('blockedUserId', followedUserId);

    if (hasResult(isBlocked)) {
      return next(createError(401, 'Please unblock the user'));
    }

    const iAmBlocked = await db('user_blocks')
      .where('blockedUserId', req.user.userId)
      .andWhere('userId', followedUserId);

    if (hasResult(iAmBlocked)) {
      return next(createError(401, 'The user is unavailable'));
    }

    const isFollowing = await db('user_follows').where({
      userId,
      followedUserId,
    });
    if (!hasResult(isFollowing)) {
      return next(createError(401, 'You are not following this user'));
    }

    const trx = await getTransaction(db);
    try {
      const followObj = (
        await db('user_follows')
          .transacting(trx)
          .where({ userId, followedUserId })
          .del()
          .returning('*')
      ).pop();

      if (!followObj) {
        return next(createError(401, genericErrorMsg));
      }

      const followCount = (
        await db('user_follows')
          .transacting(trx)
          .where({ followedUserId })
          .count()
      ).pop();

      await db('users')
        .transacting(trx)
        .update('followersCount', parseInt(followCount.count))
        .where('userId', followedUserId);

      const followingsCount = (
        await db('user_follows').transacting(trx).where({ userId }).count()
      ).pop();

      await db('users')
        .transacting(trx)
        .update('followingsCount', parseInt(followingsCount.count))
        .where({ userId });

      await trx.commit();
      res.send(
        new ApiResponse('User unfollowed successfully', followObj).response
      );
    } catch (error) {
      console.log(`[unfollow] error: ${error.stack}`);
      await trx.rollback();
      return next(createError(401, genericErrorMsg));
    }
  } catch (error) {
    console.log(`[unfollow] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const block = async (req, res, next) => {
  const body = req.body;
  console.log(`[block] body: ${JSON.stringify(body)}`);
  try {
    body.userId = req.user.userId;
    if (body.userId === body.blockedUserId) {
      return next(createError(401, genericErrorMsg));
    }
    console.log(`[block] body: ${JSON.stringify(body)}`);

    const result = await db.insert(body, '*').into('user_blocks');

    if (!hasResult(result)) {
      return next(createError(401, genericErrorMsg));
    }
    const array = `ARRAY[${req.user.userId}, ${body.blockedUserId}]`;
    const delQuery = `
      DELETE FROM user_follows
      WHERE "userId" = ANY(${array}) AND "followedUserId" = ANY(${array});
    `;
    console.log(`[block] delQuery: ${delQuery}`);
    const delResult = await db.raw(delQuery);

    const del1Query = `
      UPDATE posts
        SET mentions = array_remove(mentions, ${req.user.userId})
      WHERE "userId" = ${body.blockedUserId}
    `;

    const del2Query = `
      UPDATE posts
        SET mentions = array_remove(mentions, ${body.blockedUserId})
      WHERE "userId" = ${req.user.userId}
    `;

    console.log(`[block] del1Query: ${del1Query}`);
    console.log(`[block] del2Query: ${del2Query}`);

    const del1 = await db.raw(del1Query);
    const del2 = await db.raw(del2Query);

    res.send(
      new ApiResponse('User blocked successfully', result.pop()).response
    );
  } catch (error) {
    console.log(`[block] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const unblock = async (req, res, next) => {
  const body = req.body;
  console.log(`[unblock] body: ${JSON.stringify(body)}`);
  try {
    body.userId = req.user.userId;
    if (body.userId === body.blockedUserId) {
      return next(createError(401, genericErrorMsg));
    }

    const result = await db('user_blocks')
      .where('userId', body.userId)
      .andWhere('blockedUserId', body.blockedUserId)
      .del();
    if (!hasValue(result)) {
      return next(createError(401, genericErrorMsg));
    }
    res.send(new ApiResponse('User unblocked successfully', result).response);
  } catch (error) {
    console.log(`[unblock] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const blockedUsers = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(
      `[blockedUsers] user: ${req.user.userId}, body: ${JSON.stringify(body)}`
    );
    const { userId } = req.user;
    let condition = `b."userId" = ${req.user.userId}`;
    if (body.nextPageId) {
      condition = `${condition} and u."userId" <= ${body.nextPageId}`;
    }

    const result = await getBlockedUsers(userId, condition, LIMIT_30 + 1);
    const rows = result.rows;
    if (!hasResult(rows)) {
      return res.send(
        new ApiResult().sendStatus(Responses.SOCIAL.NO_BLOCKED_USERS)
      );
    }
    let nextPageId = 0;
    if (rows.length >= LIMIT_30) {
      let lastRow = rows.pop();
      nextPageId = lastRow.userId;
    }
    res.send(
      new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
    );
  } catch (error) {
    console.log(`[blockedUsers] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const followers = async (req, res, next) => {
  const body = req.body;
  console.log(
    `[followers] user: ${req.user.userId}, body: ${JSON.stringify(body)}`
  );

  try {
    let userId = body.userId || req.user.userId;
    if (hasValue(body.userName)) {
      console.log(`[followers] getting userId`);
      const user = (
        await db('users').select('userId').where('userName', body.userName)
      ).pop();
      if (user) userId = user.userId;
      console.log(`[followers] userId: ${userId}`);
    }
    // else if (body.userId) {
    //   userId = body.userId;
    // } else {
    //   userId = req.user.userId;
    // }

    let condition = `f."followedUserId" = ${userId}`;
    if (body.nextPageId && Number.isInteger(body.nextPageId)) {
      condition = `${condition} AND f."followId" <= ${body.nextPageId}`;
    }

    const blocked = await checkIsBlocked(req.user.userId, userId);

    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'No results'));
    }

    userId = req.user.userId;

    const result = await getFollowersQuery(userId, condition, LIMIT_30 + 1);
    const rows = result.rows;

    if (!hasResult(rows)) {
      return next(createError(401, 'No result'));
    }
    let nextPageId = 0;
    if (rows.length >= LIMIT_30) {
      let lastRow = rows.pop();
      nextPageId = lastRow.followId;
    }
    //res.send(new ApiResponse('Success', rows).response);
    res.send(
      new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
    );
  } catch (error) {
    console.log(`[followers] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const followings = async (req, res, next) => {
  const body = req.body;
  console.log(
    `[followings] user: ${req.user.userId}, body: ${JSON.stringify(body)}`
  );
  let userId;
  try {
    if (!hasValue(body.userId) && hasValue(body.userName)) {
      console.log(`[followings] getting userId`);
      const user = await db('users')
        .select('userId')
        .where('userName', body.userName);
      userId = user.pop().userId;
      console.log(`[followings] userId: ${userId}`);
    } else if (body.userId) {
      userId = body.userId;
    } else {
      userId = req.user.userId;
    }

    let condition = `f."userId" = ${userId}`;
    if (hasValue(body.nextPageId)) {
      condition = `${condition} and f."followId" <= ${body.nextPageId}`;
    }

    const blocked = await checkIsBlocked(req.user.userId, userId);
    console.log(blocked);
    if (blocked) {
      if (blocked.userId === req.user.userId) {
        return next(createError(401, 'Please unblock the user'));
      }
      return next(createError(401, 'No results'));
    }

    const query = `
      SELECT
        f."followId",
        u."userId",
        u."userName",
        u."fullName",
        u."imageUrl",
        u."country",
        u."isActive",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks ub WHERE ub."blockedUserId" = u."userId"
          AND ub."userId" = ${req.user.userId}
        ) "isBlocked",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks "ub" WHERE ub."userId" = u."userId"
          AND ub."blockedUserId" = ${req.user.userId}
        ) "iAmBlocked",
        EXISTS(
          SELECT
            "userId"
          FROM user_follows uf
          WHERE uf."followedUserId" = u."userId" AND uf."userId" = ${
            req.user.userId
          }
        ) "isFollowing",
        EXISTS(
          SELECT
            "reportId"
          FROM reported_users ru
          WHERE ru."reportedUserId" = u."userId" AND ru."userId" = ${
            req.user.userId
          }
        ) "isReported",
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."userId"
          WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followersCount",
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."followedUserId"
          WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followingsCount",
        (
          SELECT COUNT("viewId")::INTEGER
          FROM post_views v
          JOIN posts p ON p."postId" = v."postId"
          WHERE p."userId" = u."userId"
            AND p."isActive" = TRUE AND p."isDeleted" = FALSE
        ) "postViewCount",
        (
          SELECT COUNT("blessingId")::INTEGER
          FROM post_blessings b
          WHERE b."postId" IN (SELECT "postId" FROM posts p2 WHERE p2."userId" = u."userId")
        ) "blessCount",
        (
          SELECT
            COUNT(DISTINCT "categoryId")::integer
          FROM
            posts p
          WHERE
            p."userId" = u."userId" AND p."status" = 'published'
        ) "postCount"
      FROM users u
      JOIN user_follows f ON f."followedUserId" = u."userId"
      WHERE ${condition}
      AND u."userId" NOT IN (
        SELECT "userId"
        FROM user_blocks ub
        WHERE ub."blockedUserId" = ${req.user.userId}
      )
      AND u."userId" NOT IN (
        SELECT "blockedUserId"
        FROM user_blocks ub
        WHERE ub."userId" = ${req.user.userId}
      )
      AND u."isActive" = TRUE AND u."isDeleted" = FALSE
      ORDER BY f."followId" DESC
      LIMIT ${LIMIT_30 + 1}
    `;
    console.log(`[followers] query: ${query}`);
    const result = await db.raw(query);
    const rows = result.rows;

    if (!hasResult(rows)) {
      return res.send(
        new ApiResult().sendStatus(Responses.SOCIAL.NO_FOLLOWINGS)
      );
    }
    let nextPageId = 0;
    if (rows.length >= LIMIT_30) {
      let lastRow = rows.pop();
      nextPageId = lastRow.followId;
    }
    //res.send(new ApiResponse('Success', rows).response);
    res.send(
      new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
    );
  } catch (error) {
    console.log(`[followings] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const getProfile = async (req, res, next) => {
  const body = req.body;
  console.log(`[getProfile] body: ${JSON.stringify(body)}`);

  try {
    let queryKey;
    let queryVal;

    if (hasValue(body.userId)) {
      queryKey = 'userId';
      queryVal = body.userId;
    } else if (hasValue(body.userName)) {
      queryKey = 'userName';
      queryVal = body.userName;
    } else {
      queryKey = 'userId';
      queryVal = req.user.userId;
    }

    console.log(
      `[getProfile] userId: ${req.user.userId}, queryKey: ${queryKey}, queryVal: ${queryVal}`
    );
    let rows = await db('users')
      .where(queryKey, queryVal)
      .andWhere('isActive', true)
      .andWhere('isDeleted', false);
    if (!hasResult(rows)) {
      return next(createError(401, 'The user is unavailable'));
    }

    let user = rows.pop();

    const array = `ARRAY[${req.user.userId}, ${user.userId}]`;
    const blockQuery = `
      SELECT * FROM user_blocks
      WHERE "userId" = ANY(${array}) AND "blockedUserId" = ANY(${array});
    `;
    console.log(blockQuery);
    const isBlocked = await db.raw(blockQuery);

    if (isBlocked.rows && hasResult(isBlocked.rows)) {
      let blocked = isBlocked.rows.pop();
      // console.log(blocked);
      if (blocked.blockedUserId === req.user.userId) {
        // return next(createError(401, 'Please unblock the user'));
        return next(createError(401, 'The user is unavailable'));
      }
    }

    let userPayload = await getSingleUser(user.userId, req.user.userId);
    userPayload = userPayload.pop();
    delete userPayload.authToken;
    res.send(new ApiResult('Success', userPayload).success());
  } catch (error) {
    console.log(`[getProfile] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const reportUser = async (req, res, next) => {
  const body = req.body;
  console.log(`[reportUser] body: ${JSON.stringify(body)}`);
  try {
    body.userId = req.user.userId;

    if (!hasValue(body.reportedUserId)) {
      return next(createError(401, genericErrorMsg));
    }

    if (body.userId === body.reportedUserId) {
      return next(createError(401, genericErrorMsg));
    }

    const isBlocked = await checkIsBlocked(
      req.user.userId,
      body.reportedUserId
    );
    if (isBlocked) {
      return next(createError(401, 'User is unavailable'));
    }
    const result = await db
      .insert(body, ['userId', 'reportedUserId'])
      .into('reported_users');
    if (!hasResult(result)) {
      return next(createError(401, genericErrorMsg));
    }
    res.send(
      new ApiResponse('User reported successfully', result.pop()).response
    );
  } catch (error) {
    console.log(`[reportUser] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const reportPost = async (req, res, next) => {
  const body = req.body;
  console.log(`[reportPost] body: ${JSON.stringify(body)}`);
  try {
    body.userId = req.user.userId;

    if (!hasValue(body.reportedPostId)) {
      return next(createError(401, genericErrorMsg));
    }

    const result = await db
      .insert(body, ['userId', 'reportedPostId'])
      .into('reported_posts');
    if (!hasResult(result)) {
      return next(createError(401, genericErrorMsg));
    }
    res.send(
      new ApiResponse('Post reported successfully', result.pop()).response
    );
  } catch (error) {
    console.log(`[reportPost] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const suggestedUsers = async (req, res, next) => {
  const body = req.body;
  console.log(
    `[suggestedUsers] user: ${req.user.userId}, body: ${JSON.stringify(body)}`
  );
  try {
    const { userId } = req.user;
    const country = (
      await db('users').select(['country']).where({ userId })
    ).pop()['country'];
    const query = suggestedUsersQuery(
      userId,
      country,
      body.nextPageId,
      LIMIT_30 + 1
    );
    //console.log(`[suggestedUsers] query: ${query.toString()}`);
    const rows = await query.then();
    if (!hasResult(rows)) {
      return next(createError(401, 'No users found'));
    }
    //let rows = result.rows;
    let nextPageId = parseInt(body.nextPageId) || 0;
    if (rows.length >= LIMIT_30) {
      rows.pop();
      nextPageId += LIMIT_30;
    }
    res.send(
      new ApiResult(
        'Success',
        rows,
        parseInt(body.nextPageId),
        nextPageId
      ).success()
    );
  } catch (error) {
    console.log(`[suggestedUsers] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const searchUsers = async (req, res, next) => {
  const body = req.body;
  console.log(
    `[searchUsers] user: ${req.user.userId}, body: ${JSON.stringify(body)}`
  );
  try {
    if (!hasValue(body.text)) {
      return next(createError(401, genericErrorMsg));
    }
    const query = searchUsersQuery(
      body.text,
      req.user.userId,
      body.nextPageId,
      LIMIT_30 + 1
    );
    //console.log(`[searchUsers] query: ${query.toString()}`);
    const rows = await query.then();
    if (!hasResult(rows)) {
      return next(createError(401, 'No users found'));
    }
    //let rows = result.rows;
    let nextPageId = 0;
    if (rows.length >= LIMIT_30) {
      const lastRow = rows.pop();
      nextPageId = lastRow.userId;
    }
    res.send(
      new ApiResult(
        'Success',
        rows,
        parseInt(body.nextPageId),
        nextPageId
      ).success()
    );
    // res.send(new ApiResponse('Success', result.rows).response);
  } catch (error) {
    console.log(`[searchUsers] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const alertActivation = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(
      `[alertActivation] user: ${req.user.userId}, body: ${JSON.stringify(
        req.body
      )}`
    );

    if (typeof body.alertsEnabled != 'boolean') {
      return next(createError(401, genericErrorMsg));
    }

    const result = await db('users')
      .update('alertsEnabled', body.alertsEnabled)
      .where('userId', req.user.userId);

    if (!hasValue(result)) {
      return next(createError(401, genericErrorMsg));
    }

    res.send(new ApiResult('Success', null).success());
  } catch (error) {
    console.log(`[alertActivation] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const body = req.body;
    console.log(
      `[deleteAccount] user: ${req.user.userId}, body: ${JSON.stringify(
        req.body
      )}`
    );

    if (typeof body.isDeleted != 'boolean') {
      return next(createError(401, genericErrorMsg));
    }

    let update = {
      isDeleted: true,
    };

    if (update.isDeleted) {
      update.fbId = null;
      update.authToken = null;
      update.deviceToken = null;
      update.active = null;
      update.password = null;
      update.userName = null;
      update.email = null;
      update.publicKey = null;
    }
    console.log(`[deleteAccount] update: ${JSON.stringify(update)}`);
    const result = await db('users')
      .update(update)
      .where('userId', req.user.userId);

    await db('posts')
      .update({ isDeleted: true, status: config.postStatus.deleted })
      .where('userId', req.user.userId);

    await db('post_comments')
      .update('isDeleted', true)
      .where('userId', req.user.userId);

    await db('user_follows')
      .where('followedUserId', req.user.userId)
      .orWhere('userId', req.user.userId)
      .del();

    await db('notifications')
      .where('userId', req.user.userId)
      .orWhere('authorId', req.user.userId)
      .del();

    if (!hasValue(result)) {
      return next(createError(401, genericErrorMsg));
    }

    // if(body.isDeleted === true) {
    //   const updateToken = await db('users')
    //     .update({authToken: null, deviceToken: null})
    //     .where('userId', req.user.userId);
    // }

    res.send(
      new ApiResult('Success', null).sendStatus(Responses.GENERAL.SUCCESS)
    );
  } catch (error) {
    console.log(`[deleteAccount] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const getMentions = async (req, res, next) => {
  try {
    let conditions = [`f."userId" = ${req.user.userId}`];
    if (req.body.text) {
      conditions.push(`u."userName" ILIKE '${req.body.text}%'`);
    }
    conditions.push('u."isActive" = TRUE');
    conditions.push('u."isDeleted" = FALSE');

    conditions = conditions.join(' AND ');
    const query = `SELECT u."userName"
    FROM users u
    JOIN user_follows f ON f."followedUserId" = u."userId"
    WHERE ${conditions}`;
    console.log(`[getMentions] query: ${query}`);
    const result = await db.raw(query);
    if (hasResult(result.rows)) {
      res.send(
        new ApiResult('Success', _.map(result.rows, 'userName')).success()
      );
    } else {
      return next(createError(401, 'No results found'));
    }
  } catch (error) {
    console.log(`[getMentions] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const getNotifications = async (req, res, next) => {
  try {
    let body = req.body;
    let userId = req.user.userId;

    const offset = !isNaN(parseInt(body.nextPageId))
      ? parseInt(body.nextPageId)
      : null;
    console.log(
      `[getNotifications] user: ${userId}, data: ${JSON.stringify(req.body)}`
    );

    const query = getAlertsQuery(userId, LIMIT_30 + 1, offset);
    const query2 = getAlertsQueryWithoutPosts(userId, LIMIT_30 + 1, offset);

    let result = await query.then();
    let result2 = await query2.then();

    result.rows = result.rows.concat(result2.rows);
    if (hasResult(result.rows)) {
      let rows = result.rows;
      let nextPageId = 0;
      //console.log(`[getNotifications] found ${rows.length} rows, `);
      if (rows.length >= LIMIT_30) {
        const lastRow = rows.pop();
        nextPageId = lastRow.notificationId;
      }
      //console.log(`[getNotifications] nextPageId: ${nextPageId}`);
      rows = rows
        .map((row) => {
          row.details = {};
          row.notificationId = parseInt(row.notificationId);
          if (row.type === actions.post_comment) {
            row.details.postId = row.postId;
            row.details.status = row.status;
            row.details.postImageUrl = row.postImageUrl;
            row.details.commentId = row.commentId;
            row.details.comment = row.comment;
            row.details.description = `${row.author.userName} has added a comment on your post.`;
          } else if (row.type === actions.post_like) {
            row.details.postId = row.postId;
            row.details.status = row.status;
            row.details.postImageUrl = row.postImageUrl;
            row.details.description = `${row.author.userName} has liked your post.`;
          } else if (row.type === actions.post_view_milestone) {
            row.details.postId = row.postId;
            row.details.status = row.status;
            row.details.postImageUrl = row.postImageUrl;
            row.details.description = row.description;
          } else if (row.type === actions.post_tag) {
            row.details.postId = row.postId;
            row.details.status = row.status;
            row.details.postImageUrl = row.postImageUrl;
            row.details.description = `${row.author.userName} has tagged you on a post.`;
          } else if (row.type === actions.comment_tag) {
            row.details.postId = row.postId;
            row.details.status = row.status;
            row.details.postImageUrl = row.postImageUrl;
            row.details.description = `${row.author.userName} has tagged you on a comment.`;
          } else if (row.type === actions.user_follow) {
            row.details.description = `${row.author.userName} has started following you.`;
          }
          delete row.postId;
          delete row.postImageUrl;
          delete row.commentId;
          delete row.comment;
          delete row.description;
          delete row.status;
          return row;
        })
        .sort((a, b) => {
          return b.notificationId - a.notificationId;
        });

      rows = _.uniqBy(rows, 'notificationId');
      res.send(
        new ApiResult('Success', rows, body.nextPageId, nextPageId).success()
      );
    } else {
      return next(createError(401, 'No results found'));
    }
  } catch (error) {
    console.log(`[getNotifications] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    // console.log(`[markNotificationRead] user: ${req.user.userId}`);
    let result = await db('notifications')
      .update('isRead', true)
      .where('id', req.body.notificationId)
      .andWhere('userId', req.user.userId)
      .returning(['id as notificationId', 'isRead']);
    // console.log(result);
    if (!hasResult(result)) {
      return next(createError(401, genericErrorMsg));
    }
    res.send(new ApiResult('Success', result.pop()).success());
  } catch (error) {
    console.log(`[markNotificationRead] error: ${error.stack}`);
    next(createError(401, genericErrorMsg));
  }
};

const verify = async (req, res, next) => {
  const body = req.body;
  console.log(`[verify] body: ${JSON.stringify(body)}`);
  try {
    const { userId } = req.user;

    if (!hasValue(body.videoUrl)) {
      return next(createError(401, 'videoUrl parameter not found.'));
    }

    let user = (
      await db('users')
        .where('userId', userId)
        .andWhere('isActive', true)
        .andWhere('isDeleted', false)
    ).pop();

    const request = (
      await db('user_verification_requests').where({ userId })
    ).pop();

    if (user.verification === config.verificationStatus.requested) {
      return next(
        createError(401, 'Your request is in queue for verification.')
      );
    }

    const trx = await getTransaction(db);
    try {
      const userRequest = {
        userId,
        verificationLink: body.videoUrl,
        status: config.verificationStatus.requested,
      };

      if (!request) {
        await db
          .transacting(trx)
          .insert(userRequest, '*')
          .into('user_verification_requests');
      } else {
        await db('user_verification_requests')
          .transacting(trx)
          .update(userRequest, '*');
      }

      await db('users')
        .transacting(trx)
        .update('verification', config.verificationStatus.requested)
        .where({ userId });

      await trx.commit();
      res.send(
        new ApiResponse('User verification requested successfully').response
      );
    } catch (error) {
      await trx.rollback();
      console.log(`[verify] error: ${error.message}`);
      return next(createError(401, genericErrorMsg));
    }
  } catch (error) {
    console.log(`[verify] error: ${error.message}`);
    next(createError(401, genericErrorMsg));
  }
};

export default {
  get,
  login,
  logout,
  register,
  updateImage,
  updateProfile,
  getDeviceToken,
  registerDeviceToken,
  forgotPassword,
  resetPassword,
  changePassword,
  postFeedback,
  general,
  follow,
  unfollow,
  followers,
  followings,
  block,
  unblock,
  blockedUsers,
  facebookLogin,
  getProfile,
  reportUser,
  reportPost,
  searchUsers,
  suggestedUsers,
  alertActivation,
  deleteAccount,
  getMentions,
  getNotifications,
  markNotificationRead,
  verify,
};
