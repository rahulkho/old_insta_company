import AWS from 'aws-sdk';
import db from '../db';
import config from '../config';
import buckets from '../lib/buckets';
import { getBucket } from '../lib/utils';

const AWS_REKOGNITION_USER_ACCESS_KEY =
  process.env.AWS_REKOGNITION_USER_ACCESS_KEY;
const AWS_REKOGNITION_USER_SECRET_ACCESS_KEY =
  process.env.AWS_REKOGNITION_USER_SECRET_ACCESS_KEY;

const unsafeModLabels = [
  'Explicit Nudity',
  'Nudity',
  'Graphic Male Nudity',
  'Graphic Female Nudity',
  'Sexual Activity',
  'Illustrated Nudity Or Sexual Activity',
  'Adult Toys',
  'Partial Nudity',
  'Graphic Violence Or Gore',
  'Physical Violence',
  'Violence',
];
export const snsTopicHandler = async (req, res) => {
  try {
    const AWSLocal = Object.assign({}, AWS);

    AWSLocal.config.update({ region: 'ap-southeast-1' });
    new AWSLocal.SNS({
      apiVersion: '2010-03-31',
      accessKeyId: AWS_REKOGNITION_USER_ACCESS_KEY,
      secretAccessKey: AWS_REKOGNITION_USER_SECRET_ACCESS_KEY,
    })
      .listTopics({})
      .promise()
      .then(function (data) {
        console.log(data.Topics);
      })
      .catch(function (err) {
        console.error(err, err.stack);
      });
  } catch (error) {}
};

export const startRequestHandler = async (req, res) => {
  try {
    const { postId } = req.body;
    await startModerationJob(postId);
    res.send({ status: 1 });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: 0 });
  }
};

export const startModerationJob = async (postId) => {
  const post = (
    await db('posts').select(['videoStreamUrl']).where({ postId })
  ).pop();

  const { videoStreamUrl } = post;
  const bucket = getBucket(videoStreamUrl);
  const { bucket: bucketName, region } = bucket;

  const objectName = videoStreamUrl.split('cloudfront.net/').pop();
  var params = {
    Video: {
      S3Object: {
        Bucket: bucketName,
        Name: objectName,
      },
    },
    NotificationChannel: {
      RoleArn: 'arn:aws:iam::999487124859:role/aws_rekognition_sns',
      //SNSTopicArn: 'arn:aws:sns:ap-south-1:999487124859:aws_rekognition',
      SNSTopicArn: 'arn:aws:sns:us-east-2:999487124859:aws_rekognition',
    },
  };

  startJob(params, region, postId);
};

const startJob = (params, region, postId) => {
  try {
    const rekognition = new AWS.Rekognition({
      apiVersion: '2016-06-27',
      region: region,
      accessKeyId: AWS_REKOGNITION_USER_ACCESS_KEY,
      secretAccessKey: AWS_REKOGNITION_USER_SECRET_ACCESS_KEY,
    });

    rekognition.startContentModeration(params, async function (err, data) {
      if (err) console.log(err, err.stack);
      // an error occurred
      else {
        const { JobId: jobId } = data;
        await db('moderation_jobs').insert({ postId, region, jobId });
      }
    });
  } catch (error) {
    console.log('[startJob] ', error.stack);
  }
};

const checkJobStatus = async (job) => {
  const { id, region, jobId } = job;
  var params = {
    JobId: jobId,
  };
  //console.log('checking status:', id);
  return new Promise(function (resolve, reject) {
    const rekognition = new AWS.Rekognition({
      apiVersion: '2016-06-27',
      region: region,
      accessKeyId: AWS_REKOGNITION_USER_ACCESS_KEY,
      secretAccessKey: AWS_REKOGNITION_USER_SECRET_ACCESS_KEY,
    });

    rekognition.getContentModeration(params, async function (err, modResponse) {
      if (err) {
        console.log(err.stack);
        resolve(err);
        return;
      }

      const { JobStatus } = modResponse;
      if (JobStatus === 'SUCCEEDED') {
        await db('moderation_jobs')
          .update({ result: modResponse, updated: 'now()' })
          .where({ id })
          .returning('*');

        await inspectModResult(job, modResponse);
      }
      resolve();
    });
  });
};

const inspectModResult = async (job, modResponse) => {
  try {
    const { ModerationLabels } = modResponse;
    const detectedUnsafeLabels = ModerationLabels.filter((x) => {
      return (
        unsafeModLabels.includes(x.ModerationLabel.Name) &&
        x.ModerationLabel.Confidence > 40
      );
    });

    if (detectedUnsafeLabels.length > 0) {
      const { postId } = job;
      console.log(`[inspectModResult] unsafe content in post: ${postId}`);

      updateVideoPermissions(postId);
    }
  } catch (error) {
    console.log(error);
  }
};

const updateVideoPermissions = async (postId) => {
  const post = (await db('posts').where({ postId })).pop();
  const { videoStreamUrl, videoUrl } = post;
  const bucket = getBucket(videoStreamUrl);
  const { bucket: bucketName, region } = bucket;
  const objectName = videoStreamUrl.split('cloudfront.net/').pop();

  const S3 = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_ACCESS_KEY_SECRET,
    apiVersions: {
      s3: '2006-03-01',
    },
  });

  if (videoUrl) {
    const objectName = videoUrl.split('cloudfront.net/').pop();
    const params = {
      Bucket: bucketName,
      Key: objectName,
    };
    //console.log(`[updateVideoPermissions] params:`, params);
    S3.deleteObject(params, function (err, data) {
      if (err) console.log(err.stack);
    });
  }

  const params = {
    Bucket: bucketName,
    Key: objectName,
  };
  //console.log(`[updateVideoPermissions] params:`, params);
  S3.deleteObject(params, function (err, data) {
    if (err) console.log(err.stack);
  });

  await db('posts')
    .update({
      status: config.postStatus.unpublished,
      videoUrl: null,
      imageUrl: null,
      videoStreamUrl: null,
    })
    .where({ postId })
    .returning('*');
};

export const startJobStatusCheck = async (req, res) => {
  try {
    const jobs = await db('moderation_jobs').whereNull('result').orderBy('id');
    for (let job of jobs) {
      await checkJobStatus(job);
    }
    res.send({ status: 1 });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: 0 });
  }
};
