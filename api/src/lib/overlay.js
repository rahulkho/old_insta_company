import fs from 'fs';
import os from 'os';
import request from 'request';
import uuidv4 from 'uuid/v4';
import AWS from 'aws-sdk';
import { exec } from 'child_process';
import db from '../db';
import buckets from './buckets';
import FileUploader from '../classes/FileUploader';
import { getBucket } from '../lib/utils';
import { startModerationJob } from '../lib/moderation';
const env = process.env.NODE_ENV === 'production' ? 'p' : 'd';

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_ACCESS_KEY_SECRET,
  apiVersions: {
    s3: '2006-03-01',
  },
});

const finalBucket = {
  name: 'US East (Ohio) ',
  city: 'Ohio',
  bucket: 'lellengeohio',
  region: 'us-east-2',
  endpoint: 'https://lellengeohio.s3-accelerate.amazonaws.com',
  edgeDomain: 'd25dztwpdne7d5.cloudfront.net',
};

const downloadFile = async (url, path) => {
  return new Promise(function (resolve, reject) {
    request(url)
      .pipe(fs.createWriteStream(path))
      .on('close', function () {
        console.log(`[downloadFile] downloaded to: ${path}`);
        resolve();
      })
      .on('error', function (error) {
        console.log(`[downloadFile] `, error);
        reject();
      });
  });
};

const dimensions = (info) => {
  const videoStream = info.streams.find((x) => x.codec_type === 'video');
  const {
    tags: { rotate },
    width,
    height,
  } = videoStream;

  if (rotate && parseInt(rotate) > 0) {
    return {
      width: height,
      height: width,
    };
  }
  return { width, height };
};

export const watermark = async (videoUrl, post, filepath, uuid) => {
  const {
    postId,
    videoStreamUrl,
    postedBy: { userId, userName, fullName, imageUrl },
  } = post;

  let userFullName = fullName ? fullName : userName;
  let userAvatar;

  if (userFullName.length > 14) {
    userFullName = userFullName.substring(0, 14) + '...';
  }

  let dir = os.tmpdir() + '/' + postId;
  let inputs = dir + '/inputs';
  let assets = process.cwd() + '/assets';

  fs.mkdirSync(dir);
  fs.mkdirSync(inputs);

  if (imageUrl) {
    const avatar1 = `${inputs}/avatar1.png`;
    const avatar2 = `${inputs}/avatar2.png`;
    await downloadFile(imageUrl, avatar1);

    const cmdCropAvatar = `convert ${avatar1} -alpha set \\( +clone -distort DePolar 0 -virtual-pixel HorizontalTile -background None -distort Polar 0 \\) -compose Dst_In -composite -trim +repage -resize 174x174 ${avatar2}`;
    await run(cmdCropAvatar);

    const avatar3 = `${inputs}/avatar3.png`;
    const cmdResizeBaseImage = `convert ${assets}/avatar.png -resize 180x180 -quality 100 ${avatar3}`;
    await run(cmdResizeBaseImage);

    const avatar4 = `${inputs}/avatar4.png`;
    const cmdFinalAvatar = `convert ${avatar3} ${avatar2} -gravity center -composite -matte ${avatar4}`;
    await run(cmdFinalAvatar);

    userAvatar = avatar4;
  } else {
    userAvatar = `${assets}/avatar.png`;
  }

  //const filepath = inputs + '/' + postId + '.mp4';
  //console.log(`[watermark] url: ${videoStreamUrl}`);
  //await downloadFile(videoStreamUrl, filepath);

  const infoJsonPath = inputs + '/' + postId + '.json';
  const cmdVideoInfo = `ffprobe -v quiet -print_format json -show_format -show_streams ${filepath} > ${infoJsonPath}`;
  await run(cmdVideoInfo);
  let info = fs.readFileSync(infoJsonPath);
  const videoDimensions = dimensions(JSON.parse(info));
  console.log(`[watermark] videoDimensions:`, videoDimensions);

  const leftWatermarkHeight = parseInt(videoDimensions.height * 0.2);
  let logoWidth =
    videoDimensions.width > videoDimensions.height
      ? videoDimensions.height / 2
      : videoDimensions.width / 2;

  logoWidth = parseInt(logoWidth);

  const resizedLeftWatermark = `${inputs}/resizedwatermark.png`;
  const cmdResizeLeftWatermark = `convert ${assets}/1414.png -resize ${leftWatermarkHeight}x${leftWatermarkHeight} ${resizedLeftWatermark}`;
  await run(cmdResizeLeftWatermark);

  const video1 = `${inputs}/video1.mp4`;
  const cmdLeftWatermark = `ffmpeg -i ${filepath} -i ${resizedLeftWatermark} -filter_complex "overlay=0:main_h-overlay_h-10" ${video1}`;
  await run(cmdLeftWatermark);

  const cmdImgText = `convert -background transparent -fill white -font ${assets}/Lato-Bold.ttf -pointsize 20 label:"${userFullName}" ${inputs}/label.png`;
  await run(cmdImgText);

  const icon1 = `${inputs}/icon1.png`;
  const cmdIconResize = `convert ${assets}/icon.png -resize 20x20 -quality 100 ${icon1}`;
  await run(cmdIconResize);

  //const cmdMergeImgs = `montage icon.png label.png -geometry +0+0 -background transparent label2.png`
  const cmdMergeImgs = `convert ${icon1} ${inputs}/label.png -size 10x10 xc:transparent +swap -gravity Center -background transparent +append ${inputs}/label2.png`;
  await run(cmdMergeImgs);

  let video2 = `${inputs}/video2.mp4`;

  const cmdRightWatermark = `ffmpeg -i ${video1} -i ${inputs}/label2.png -filter_complex "overlay=main_w-overlay_w-30:main_h-overlay_h-20" ${video2}`;

  await run(cmdRightWatermark);

  const cmdMainSnapshots = `ffmpeg -i ${video2} -vf fps=25 ${dir}/1-%04d.png`;
  await run(cmdMainSnapshots);

  const mainAudioM4A = `${inputs}/mainaudio.m4a`;
  const mainAudioWav = `${inputs}/mainaudio.wav`;
  const cmdExtractAudio = `ffmpeg -i ${filepath} -vn -c:a copy ${mainAudioM4A}`;
  await run(cmdExtractAudio);

  const cmdConvertAudio = `ffmpeg -i ${mainAudioM4A} ${mainAudioWav}`;
  await run(cmdConvertAudio);

  const silentAudio = `${inputs}/silence.aac`;
  const silentAudioWav = `${inputs}/silence.wav`;
  const cmdSilence = `ffmpeg -ar 44100 -t 60 -f s16le -acodec pcm_s16le -ac 2 -i /dev/zero -acodec aac -aq 4 ${silentAudio}`;
  await run(cmdSilence);
  await run(`ffmpeg -i ${silentAudio} ${silentAudioWav}`);

  const mergedAudio = `${inputs}/mergedAudio.wav`;
  const cmdMergedAudio = `ffmpeg -i ${mainAudioWav} -i ${silentAudioWav} -filter_complex '[0:0][1:0]concat=n=2:v=0:a=1[out]' -map '[out]' ${mergedAudio}`;
  await run(cmdMergedAudio);

  const snap1 = `${inputs}/snap1.jpg`;
  const snap2 = `${inputs}/snap2.jpg`;
  const file2 = `${inputs}/file2.mp4`;
  //const cmdWatermarkImg = `ffmpeg -ss 00:00:01 -i ${filepath} -vframes 1 -q:v 2 ${snap1}`;
  const cmdWatermarkImg = `ffmpeg -sseof -1 -i  ${filepath} -update 1 -q:v 1 ${snap1}`;
  const fillColorInWatermarkImg = `convert ${snap1} -fill black -colorize 80 ${snap2}`;
  await run(cmdWatermarkImg);
  await run(fillColorInWatermarkImg);

  const snap3 = `${inputs}/snap3.jpg`;
  const cmdOverlayLogo = `convert ${snap2} \\( ${assets}/E.png -resize ${logoWidth}x${logoWidth} \\) -gravity center -geometry +0-200 -composite ${snap3}`;
  await run(cmdOverlayLogo);

  const snap4 = `${inputs}/snap4.jpg`;
  const cmdOverlayAvatar = `convert ${snap3} \\( ${userAvatar} -resize 120x120 \\) -gravity center -geometry +0-50 -composite ${snap4}`;
  await run(cmdOverlayAvatar);

  const snap5 = `${inputs}/snap5.jpg`;
  const cmdOverlayText = `convert ${snap4} -pointsize 20 -font ${assets}/Lato-Bold.ttf -fill white -antialias -gravity center -draw "text 0,50 '@${userName}' \ text 0,100 '#LellengeAccepted' \ text 0,130 'Download Lellenge app now'" ${snap5}`;
  await run(cmdOverlayText);

  const snap6 = `${inputs}/snap6.jpg`;
  const cmdOverlayApple = `convert ${snap5} \\( ${assets}/apple.png -resize 120x120 \\) -gravity center -geometry -65+180 -composite ${snap6}`;
  await run(cmdOverlayApple);

  const snap7 = `${inputs}/snap7.jpg`;
  const cmdOverlayGPlay = `convert ${snap6} \\( ${assets}/gplay.png -resize 120x120 \\) -gravity center -geometry +65+180 -composite ${snap7}`;
  await run(cmdOverlayGPlay);

  const cmdWatermarkVid = `ffmpeg -loop 1 -i ${snap7} -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -t 2 -c:v libx264 -y ${file2}`;
  await run(cmdWatermarkVid);

  const cmdWatermarkSnapshots = `ffmpeg -i ${file2} -vf fps=25 ${dir}/2-%04d.png`;
  await run(cmdWatermarkSnapshots);

  const output1 = `${inputs}/output1.mp4`;
  const cmdImageToVideo = `ffmpeg -framerate 25 -pattern_type glob -i '${dir}/*.png' -c:v libx264 -pix_fmt yuv420p ${output1}`;
  await run(cmdImageToVideo);

  const output2 = `${dir}/output2.mp4`;
  const cmdOutputWithAudio = `ffmpeg -i ${output1} -i ${mergedAudio} -c:v copy -map 0:v:0 -map 1:a:0 -shortest ${output2}`;
  await run(cmdOutputWithAudio);

  console.log('OUTPUT:', output2);
  await uploadToBucket(userId, postId, output2, uuid);

  fs.unlinkSync(filepath);
  await run(`rm -rf ${dir}`);
};

function run(command) {
  console.log(
    `--------------------------------------------------------------------------------`
  );
  console.log(`RUNNING: ${command}`);
  console.log(
    `--------------------------------------------------------------------------------`
  );
  return new Promise(function (resolve, reject) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`stderr: ${error}`);
        reject();
        return;
      }
      // console.log(`stderr: ${stderr}`);
      //console.log(`stdout: ${stdout}`);
      resolve();
    });
  });
}

// const getBucket = (videoUrl) => {
//   const url = new URL(videoUrl);
//   for (let i in buckets) {
//     let bucketData = buckets[i];

//     if (videoUrl.includes(bucketData.bucket)) {
//       return buckets[i];
//     }
//   }
//   return buckets[0];
// };

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

export const uploadToBucket = async (userId, postId, filepath, uuid) => {
  try {
    const fileName = `${env}/${userId}/${postId}-w-${uuid}.mp4`;
    //const finalFileURL = `https://${finalBucket.edgeDomain}/${fileName}`;
    const finalFileURL = `https://lellenge.b-cdn.net/${fileName}`;

    fs.createReadStream(filepath).pipe(
      request.put({
        url: 'https://storage.bunnycdn.com/lellenge/' + fileName,
        headers: { AccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY },
      })
    );

    // const file = fs.readFileSync(filepath);
    // const params = {
    //   bucket: finalBucket.bucket,
    //   fileName: fileName,
    //   file,
    //   contentType: 'video/mp4',
    // };

    // const uploadResult = await uploadFile(params);
    // console.log('[uploadToBucket] uploadResult:', uploadResult);
    await db('posts').update('videoUrl', finalFileURL).where({ postId });

    //await startModerationJob(postId);
  } catch (error) {
    console.log(`[uploadToBucket] ${error.stack}`);
  }
};

export const getFinalVideoURL = async (data) => {
  const { videoStreamUrl, postId, userId, imageUrl } = data;

  const imgType = imageUrl.split('.').pop();
  const filepath = `${os.tmpdir()}/${userId}-${postId}.mp4`;
  const imgfilepath = `${os.tmpdir()}/${userId}-${postId}.${imgType}`;

  console.log('[getFinalVideoURL] filepath:', filepath);
  await downloadFile(videoStreamUrl, filepath);
  await downloadFile(imageUrl, imgfilepath);
  const uuid = uuidv4();
  const finalFileName = `${env}/${userId}/${postId}-${uuid}.mp4`;
  const finalImgName = `${env}/${userId}/${postId}-${uuid}.${imgType}`;

  // const finalFileURL = `https://${finalBucket.edgeDomain}/${finalFileName}`;
  // const finalImgURL = `https://${finalBucket.edgeDomain}/${finalImgName}`;

  const finalFileURL = `https://lellenge.b-cdn.net/${finalFileName}`;
  const finalImgURL = `https://lellenge.b-cdn.net/${finalImgName}`;

  //console.log('[getFinalVideoURL] finalFileURL:', finalFileURL);

  // const file = fs.readFileSync(filepath);
  // const params = {
  //   bucket: finalBucket.bucket,
  //   fileName: finalFileName,
  //   file,
  //   contentType: 'video/mp4',
  // };

  // const uploadResult = await uploadFile(params);
  // console.log('[getFinalVideoURL] uploadResult:', uploadResult);

  // const imgfile = fs.readFileSync(imgfilepath);
  // const imgParams = {
  //   bucket: finalBucket.bucket,
  //   fileName: finalImgName,
  //   file: imgfile,
  //   contentType: `image/${imgType}`,
  // };
  // const imguploadResult = await uploadFile(imgParams);

  fs.createReadStream(imgfilepath).pipe(
    request.put({
      url: 'https://storage.bunnycdn.com/lellenge/' + finalImgName,
      headers: { AccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY },
    })
  );

  fs.createReadStream(filepath).pipe(
    request.put({
      url: 'https://storage.bunnycdn.com/lellenge/' + finalFileName,
      headers: { AccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY },
    })
  );

  //console.log('[getFinalVideoURL] uploadResult:', imguploadResult);

  await db('posts')
    .update({ videoStreamUrl: finalFileURL, imageUrl: finalImgURL })
    .where({ postId });

  return { filepath, uuid };
};

export const deleteOldMedia = (media) => {
  const { imageUrl, videoUrl } = media;

  const s3Bucket = getBucket(imageUrl);
  const imageName = imageUrl.split('amazonaws.com/').pop();
  const videoName = videoUrl.split('amazonaws.com/').pop();

  var params = {
    Bucket: s3Bucket.bucket,
    Delete: {
      Objects: [
        {
          Key: imageName,
        },
        {
          Key: videoName,
        },
      ],
      Quiet: true,
    },
  };
  s3.deleteObjects(params, function (err, data) {
    if (err) {
      console.log(`[deleteOldMedia] ${err.stack}`);
    } else console.log(`[deleteOldMedia] ${JSON.stringify(data)}`);
  });
};
