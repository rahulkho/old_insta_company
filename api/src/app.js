import createError from 'http-errors';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import uuidv4 from 'uuid/v4';
import requestIp from 'request-ip';
import indexRouter from './routes/index';
import generalRouter from './routes/v1/general';
import usersRouter from './routes/v1/users';
import adminRouter from './routes/v1/admin';
import postsRouter from './routes/v1/posts';
import commentsRouter from './routes/v1/comments';
import publicRouter from './routes/v1/public';
import v2PublicRouter from './routes/v2/public';
import soundsRouter from './routes/v1/sounds';
import modRouter from './routes/v1/moderation';

const app = express();

app.set('trust proxy', true);
app.use(helmet());
console.log('NODE_ENV:', process.env.NODE_ENV);

app.use(function (req, res, next) {
  const allowedOrigins = ['https://liveadmin.lellenge.com'];
  if (process.env.NODE_ENV === 'production') {
    var origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'X-Requested-With,Content-Type,Accept,Authorization'
  );
  req.headers['if-none-match'] = 'no-match-for-this';
  next();
});

app.use(requestIp.mw());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use((req, res, next) => {
  res.setHeader('request_id', uuidv4());
  next();
});

app.set('views', path.join(process.cwd(), 'src', 'views'));
app.set('view engine', 'pug');
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [app] ${req.method} ${req.url}`);
  next();
});

app.use('/', indexRouter);
app.use('/v1/general', generalRouter);
app.use('/v1/user', usersRouter);
app.use('/v1/admin', adminRouter);
app.use('/v1/posts', postsRouter);
app.use('/v1/comments', commentsRouter);
app.use('/v1/public', publicRouter);
app.use('/v2/public', v2PublicRouter);
app.use('/v1/sounds', soundsRouter);
app.use('/v1/moderation', modRouter);
app.use('/temp', adminRouter);

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
      message: err.message,
    },
  });
});

export default app;
