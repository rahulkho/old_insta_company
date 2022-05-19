import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';

const indexRouter = require('./routes/index');
const uploadRouter = require('./routes/upload');

const app = express();
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  req.headers['if-none-match'] = 'no-match-for-this';
  next();
});

app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [app] ${req.method} ${req.url}`);
  next();
});

app.use('/', indexRouter);
app.use('/upload', uploadRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, 'Requested resource does not exist'));
});

// error handler
app.use(function (err, req, res, next) {
  res.status(200);
  // res.send({
  //   status: err.status || 500,
  //   message: err.message
  // });
  res.send({
    settings: {
      status: 0,
      message: err.message
    }
  })
});

module.exports = app;