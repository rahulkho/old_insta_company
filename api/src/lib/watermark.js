import createError from 'http-errors';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpegProbe from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';
import https from 'https';
import os from 'os';
import fs from 'fs';

const ffmpegPath = ffmpegInstaller.path;
const ffprobePath = ffmpegProbe.path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

import db from '../db';
import { createReadStream } from 'fs';
import config from '../config';
import buckets from './buckets';
import FileUploader from '../classes/FileUploader';

const getBucket = (videoUrl) => {
  const url = new URL(videoUrl);
  for (let i in buckets) {
    let bucketData = buckets[i];

    if (videoUrl.includes(bucketData.bucket)) {
      return buckets[i];
    }
  }
  return buckets[0];
};

const uploadFile = (args) => {
  return new Promise((resolve, reject) => {
    new FileUploader().uploadFile(args, function (err, result) {
      if (err) {
        return resolve(err);
      }
      resolve(result);
    });
  });
};

const downloadFile = (filename, source) => {
  return new Promise((resolve, reject) => {
    const filepath = os.tmpdir() + '/' + filename;
    var file = fs.createWriteStream(filepath);
    https
      .get(source, function (response) {
        response.pipe(file);
        file.on('finish', function () {
          file.close(() => {
            const contentType = response.headers['content-type'];
            resolve({ filepath, contentType });
          });
        });
      })
      .on('error', function (err) {
        // Handle errors
        fs.unlink(dest);
        reject(err);
      });
  });
};

const applyWatermark = (postId, username, filename, filepath) => {
  const output = os.tmpdir() + '/post_' + postId + '_watermarked_' + filename;
  const fontpath = process.cwd() + '/assets/Lato-Bold.ttf';

  //const textpos = `x=20:y=H-th-20`;
  const textpos = `x=W-tw-40:y=H-th-40`;
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(filepath)
      .addInput(process.cwd() + '/assets/logo_resized.gif')
      //.videoCodec('libx264')

      .complexFilter([
        //W-w-40:H-h-60
        `overlay=20:main_h-overlay_h-40,drawtext=fontfile=${fontpath}:text=${username}:fontcolor=white:fontsize=22:${textpos}`,
      ])
      .on('progress', function (progress) {
        console.log(
          '[applyWatermark] Processing: ' +
            parseFloat(progress.percent).toFixed(2) +
            '% done'
        );
      })
      .on('end', function (stdout, stderr) {
        //console.log('[applyWatermark] stdout:', stdout);
        //console.log('[applyWatermark] stderr:', stderr);
        return resolve(output);
      })
      .on('error', function (err, stdout, stderr) {
        console.log('[applyWatermark] Cannot process video: ' + err.stack);
        return reject(err);
      })
      .output(output)
      .run();
  });
};

export const download = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = (
      await db('posts')
        .select(['postId', 'videoStreamUrl', 'videoUrl', 'users.userName'])
        .join('users', 'users.userId', 'posts.userId')
        .where({ postId })
        .andWhere('posts.status', config.postStatus.published)
    ).pop();

    if (!post) {
      return next(createError(404, 'Post not found'));
    }

    if (post.videoUrl) {
      console.log(`[download] video not prepared yet`);
      return next(createError(500));
    }

    const filename = post.videoUrl.split('/').pop();
    const { filepath } = await downloadFile(filename, post.videoUrl);
    return res.download(filepath);
  } catch (error) {
    console.log(`[download] ${error.stack}`);
    return next(createError(500));
  }
};

export const applyWatermarkAndUpload = async (postId, videoUrl) => {
  try {
    const s3Bucket = getBucket(videoUrl);
    //console.log('[applyWatermarkAndUpload] bucket:', s3Bucket);
    const sourceFileUrl = videoUrl;
    const filename = sourceFileUrl.split('/').pop();
    console.log('[applyWatermarkAndUpload] sourceFileUrl:', sourceFileUrl);
    const { filepath: downloaded, contentType } = await downloadFile(
      filename,
      sourceFileUrl
    );

    console.log('[applyWatermarkAndUpload] downloaded:', downloaded);
    console.log('[applyWatermarkAndUpload] contentType:', contentType);

    const user = (
      await db('users')
        .join('posts', 'posts.userId', 'users.userId')
        .where('posts.postId', postId)
    ).pop();

    const watermarked = await applyWatermark(
      postId,
      user.userName ? '@' + user.userName : '',
      filename,
      downloaded
    );
    console.log('[applyWatermarkAndUpload] watermarked:', watermarked);

    const file = fs.readFileSync(watermarked);
    const newFileName = `posts/${user.userId}${postId}${parseInt(
      Date.now() / 1000
    )}.${contentType.split('/').pop()}`;

    console.log('[applyWatermarkAndUpload] contentType:', contentType);
    const args = {
      bucket: s3Bucket.bucket,
      fileName: newFileName,
      file,
      contentType,
    };

    const uploadResult = await uploadFile(args);
    console.log('[applyWatermarkAndUpload] uploadResult:', uploadResult);

    const newVideoUrl = 'https://' + s3Bucket.edgeDomain + '/' + newFileName;
    console.log('[applyWatermarkAndUpload] stream url:', newVideoUrl);
    await db('posts').update('videoUrl', newVideoUrl).where({ postId });
  } catch (error) {
    console.log(`[applyWatermarkAndUpload] ${error.stack}`);
  }
};
