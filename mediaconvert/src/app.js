import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import HTTPError from 'http-errors';
import logger from 'morgan';

import indexRouter from './routes/index';

const app = express();
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());

// Allow all
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  next();
});

// Setup routes
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(HTTPError(404, 'Requested resource does not exist'));
});

// error handler
app.use(function (err, req, res, next) {
  console.log(`[error] ${err.stack}`);
  res
    .status(err.status || 500)
    .send(err.message);
});

process.on('uncaughtException', (err) => {
  console.log(err.stack);
  process.exit(0);
});
module.exports = app;