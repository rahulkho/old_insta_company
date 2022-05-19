import fs, { write } from 'fs';
import os from 'os';
import _ from 'underscore';
import createError from 'http-errors';
import formidable from 'formidable';
import express from 'express';
import request from 'request';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

import db from '../db';
import ApiResponse from '../classes/ApiResponse';
import FileUploader from '../classes/FileUploader';
import middleWares from '../middlewares';
import regeneratorRuntime from 'regenerator-runtime';
import awsMediaConvert from './mediaConvert';

const isLoggedIn = middleWares.isLoggedIn;
const router = express.Router();

const S3_URL_PREFIX = 'https://s3-us-west-1.amazonaws.com/instausercontent';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
const fileUploader = new FileUploader();

const hasResult = rows => {
  return rows && rows.length >= 1;
};

const generateAndUploadThumbnail = async (postId, videoPath, done) => {
  console.log(
    `[generateAndUploadThumbnail] postId: ${postId}, videoPath: ${videoPath}`
  );
  const source = videoPath;
  const fileName =
    videoPath
      .split('/')
      .pop()
      .split('.')[0] + '.png';
  const filePath = `${os.tmpdir()}/${fileName}`;
  console.log(`[generateAndUploadThumbnail] filePath: ${filePath}`);

  ffmpeg.ffprobe(videoPath, function(err, metadata) {
    if (err) {
      console.error(err);
    } else {
      //console.log(metadata);
      let stream = _.find(metadata.streams, obj => {
        return obj.codec_type === 'video';
      });
      let width = stream.width;
      let height = stream.height;
      // let isLandscape = height < width;
      console.log(`[postVideo][end] video resolution: ${width}x${height}`);
      let thumbWidth = 320;
      let thumbHeight = Math.round(height / (width / thumbWidth));
      console.log(
        `[postVideo][end] thumb resolution: ${thumbWidth}x${thumbHeight}`
      );
      ffmpeg(source)
        .on('filenames', function(filenames) {
          console.log(
            '[generateAndUploadThumbnail] generating thumbnail ' +
              filenames.join(', ')
          );
        })
        .on('end', function() {
          console.log('[generateAndUploadThumbnail] thumbnail taken');
          const args = {
            fileName: `img_${fileName}`,
            file: fs.readFileSync(filePath),
            contentType: 'image/png'
          };

          fileUploader.uploadFile(args, async (err, result) => {
            if (err) {
              console.log('error: ', err);
            }
            console.log('[generateAndUploadThumbnail] upload: ', result);
            done(args.fileName);
          });
        })
        .on('error', function(err) {
          console.error(err);
        })
        .screenshots({
          timestamps: [0],
          count: 1,
          filename: fileName,
          folder: os.tmpdir(),
          size: `${thumbWidth}x${thumbHeight}`
        });
    }
  });
};

const submitMediaconvertJob = json => {
  request.post(
    process.env.MEDIACONVERT_LAMBDA + '/job',
    {
      json: {
        ...json
      }
    },
    function(error, response, body) {
      if (error) {
        console.log('[submitMediaconvertJob] error: ', error.stack);
      }
      if (!error && response.statusCode == 200) {
        console.log('[submitMediaconvertJob] response: ', body);
      }
    }
  );
};
const postVideo = async (req, res, next) => {
  console.log(`[postVideo]`);
  const form = new formidable.IncomingForm(),
    files = [],
    fields = {};

  form.maxFileSize = 1024 * 1024 * 1024;

  form.uploadDir = os.tmpdir();
  form
    .on('field', function(field, value) {
      console.log(`[postVideo][field] ${field}: ${value}`);
      fields[field] = value;
    })
    .on('fileBegin', function(name, file) {
      console.log(`[postVideo][fileBegin]`);
      const extension = file.name.split('.').pop();
      const fileName = `${Date.now().toString(32)}.${extension}`;
      file.path = `${form.uploadDir}/${fileName}`;
      file.name = fileName;

      console.log(`[postVideo][fileBegin] ${fileName}`);
      console.log(`[postVideo][fileBegin] path: ${file.path}`);
    })
    .on('file', function(field, file) {
      console.log(`[postVideo][file] ${JSON.stringify(file)}`);
      files.push(file);
    })
    .on('end', async function() {
      try {
        const postExists = await db('posts').where('postId', fields.postId);

        if (!hasResult(postExists)) {
          return next(createError(401, 'Invalid arguments'));
        }

        const video = files[0];
        let fileName = `vid_${video.name}`;
        const videoFileName = fileName;

        const args = {
          fileName: fileName,
          file: fs.readFileSync(video.path),
          contentType: video.type
        };

        const uploadStartTime = Date.now();
        console.log(`[postVideo][end] upload started at : ${uploadStartTime}`);
        fileUploader.uploadFile(args, async (err, result) => {
          const uploadEndTime = Date.now();
          console.log(`[postVideo][end] upload ended at : ${uploadEndTime}`);
          console.log(
            `[postVideo][end] upload end: ${uploadEndTime - uploadStartTime} ms`
          );
          if (err) {
            console.log('error: ', err);
            return next(createError(502, 'Error while uploading'));
          }
          console.log(`[postVideo][end] upload: ${JSON.stringify(result)}`);
          try {
            generateAndUploadThumbnail(
              fields.postId,
              video.path,
              async function(image) {
                console.log(`[postVideo][end] image: ${image}`);

                const videoUrl = `${CLOUDFRONT_URL}/${args.fileName}`;
                const imageUrl = `${CLOUDFRONT_URL}/${image}`;
                const rows = await db('posts')
                  .update(
                    {
                      videoUrl,
                      imageUrl
                    },
                    ['videoUrl', 'imageUrl', 'postId', 'isLandscape']
                  )
                  .where('postId', fields.postId);
                const updated = rows.pop();

                // console.log(`[postVideo][end] calling awsMediaConvert`);
                // awsMediaConvert.createJob(updated);

                if (updated) {
                  return res.send(
                    new ApiResponse('Post video updated', updated).response
                  );
                } else {
                  return next(createError(502, 'Unknown error'));
                }
              }
            );
          } catch (error) {
            console.log(error.stack);
            return next(createError(502, 'Unknown error'));
          }
        });
      } catch (error) {
        console.log(`[deletePost] error: ${error.stack}`);
        return next(createError(502, 'Unknown error'));
      }
    });
  form.parse(req);
};

const fbImage = async (req, res, next) => {
  try {
    const body = req.body;
    const path = body.url;
    console.log(`[fbImage] body: ${JSON.stringify(body)}`);

    const tempDir = os.tmpdir();
    const name = `${Date.now().toString(32)}.jpeg`;
    const _path = `${tempDir}/${name}`;
    console.log(`[download] _path: ${_path}`);
    let writeStream = fs.createWriteStream(_path);
    request
      .get(path)
      .on('response', function(response) {
        console.log(response.statusCode); // 200
        console.log(response.headers['content-type']); // 'image/png'
      })
      .pipe(writeStream);

    writeStream.on('finish', function() {
      console.log('Downloaded ' + _path);
      return uploadToS3(name, _path);
    });
  } catch (error) {
    console.log(`[fbImage] err: ${error.stack}`);
    return res.status(500).end();
  }

  function uploadToS3(name, filePath) {
    console.log(`[uploadToS3] uploading file: ${name}`);
    console.log(`[uploadToS3] reading from path: ${filePath}`);
    name = `usr_${name}`;
    const args = {
      fileName: name,
      file: fs.readFileSync(filePath),
      contentType: 'image/jpeg'
    };
    // console.log(`[uploadToS3] args: `, args);
    fileUploader.uploadFile(args, (err, result) => {
      if (err) {
        console.log(`[uploadToS3] err: ${error.stack}`);
        return res.status(500).end();
      }
      console.log(`[uploadToS3] result: ${JSON.stringify(result)}`);
      res.send({
        status: 1,
        url: name
      });
    });
  }
};

router.post('/postVideo', isLoggedIn, postVideo);
router.post('/fbImage', fbImage);

router.get('/cron', function(req, res, next) {
  awsMediaConvert.getJobs();
  res.send({ status: 200 });
});

router.get('/', function(req, res, next) {
  res.send({
    status: 200,
    payload: {
      message: 'API is working'
    }
  });
});

module.exports = router;
