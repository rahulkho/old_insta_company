import jwt from 'jsonwebtoken';
import createError from 'http-errors';

import db from '../db';
import ApiResult from '../classes/ApiResult';
import Responses from '../lib/api_response';

export const isLoggedIn = (req, res, next) => {
  const headers = req.headers;
  if (headers && headers.authorization) {
    const secret = process.env.JWT_SECRET;
    const authorization = headers.authorization;
    jwt.verify(authorization, secret, async (err, decoded) => {
      if (err) {
        console.log(`[auth] ${err.stack}`);
        return next(createError(401, 'Invalid auth token'));
      } else {
        const fromDb = await db('users')
          .select(['userId', 'isActive', 'isDeleted', 'authToken'])
          .where('userId', decoded.userId);

        if (!fromDb.length) {
          console.log(`[auth] user not found in database`);
          return next(createError(401, 'Invalid auth token'));
        }

        const user = fromDb.pop();

        if (user && !user.isActive) {
          return res.send(
            new ApiResult().sendStatus(
              Responses.PROFILE.ACC_DISABLED_CONTACT_SUPPORT
            )
          );
        }
        if (user && user.isDeleted) {
          return res.send(
            new ApiResult().sendStatus(Responses.PROFILE.PROFILE_DELETED)
          );
        } else if (user && !user.authToken) {
          console.log(`[auth] auth token is invalid`);
          return res.send(
            new ApiResult().sendStatus(Responses.GENERAL.SESSION_INVALID)
          );
        } else if (user && user.authToken === authorization) {
          req.user = user;
          next();
        } else {
          console.log(`[auth] session invalid`);
          return res.send(
            new ApiResult().sendStatus(Responses.GENERAL.SESSION_INVALID)
          );
          //return next(createError(104, Responses.PROFILE.SESSION_INVALID.message));
        }
      }
    });
  } else {
    return next(createError(401, 'Invalid auth token'));
  }
};

export const isAuthorised = (req, res, next) => {
  if (req.user && req.user.isActive && !req.user.isDeleted) {
    next();
  } else {
    return res.send(
      new ApiResult().sendStatus(Responses.PROFILE.NOT_AUTHORISED)
    );
  }
};

export const decodeJwt = (req, res, next) => {
  const headers = req.headers;
  if (headers && headers.authorization) {
    const secret = process.env.JWT_SECRET;
    const authorization = headers.authorization;
    jwt.verify(authorization, secret, (err, decoded) => {
      if (err) {
        return next(createError(401, 'Invalid auth token'));
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    next();
  }
};

export const isAdminLoggedIn = (req, res, next) => {
  const headers = req.headers;
  if (headers && headers.authorization) {
    const secret = process.env.ADMIN_JWT_SECRET;
    const authorization = headers.authorization;
    jwt.verify(authorization, secret, (err, decoded) => {
      if (err) {
        return next(createError(401, 'Invalid auth token'));
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    return next(createError(401, 'Invalid auth token'));
  }
};

// export default {
//   isLoggedIn,
//   isAuthorised,
//   isAdminLoggedIn,
//   decodeJwt,
// };
