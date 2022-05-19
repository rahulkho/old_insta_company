import jwt from 'jsonwebtoken';
import createError from 'http-errors';

const isLoggedIn = (req, res, next) => {
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
    return next(createError(401, 'Invalid auth token'));
  }
}



module.exports = {
  isLoggedIn
}