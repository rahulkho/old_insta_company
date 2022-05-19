import os from 'os';
import fs, { write } from 'fs';
import request from 'request';
import createError from 'http-errors';

import FileUploader from '../classes/FileUploader';

const fileUploader = new FileUploader();
// https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=102002084292309&height=200&width=200&ext=1553850402&hash=AeRk5d1rcM6XqGp7
export const download = (path, done) => {
  const tempDir = os.tmpdir();
  const name = `${Date.now().toString(32)}.png`;

  const _path = `${tempDir}/${name}`;
  console.log(`[download] _path: ${_path}`);
  let writeStream = fs.createWriteStream(_path);
  writeStream.on('finish', function () {
    return uploadToS3(name, _path);
  });
  request
    .get(path)
    .on('response', function (response) {
      console.log(response.statusCode);
      console.log(response.headers['content-type']);
    })
    .pipe(writeStream);

  function uploadToS3(name, path) {
    console.log(`[download] uploading to s3`);
    name = `usr_${name}`;
    const args = {
      fileName: name,
      file: fs.readFileSync(path),
      contentType: 'image/png',
    };
    fileUploader.uploadFile(args, (err, result) => {
      return done(err, name);
    });
  }
};
