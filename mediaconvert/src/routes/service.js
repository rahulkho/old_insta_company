import AWS from 'aws-sdk';
// import db from '../db';
import handler from './handler';

const TEMPLATE_PORTRAIT = 'Custom_Portrait_1';
const TEMPLATE_LANDSCAPE = 'Custom_Landscape_1';
const ROLE = process.env.MEDIACONVERT_ROLE;
const ENDPOINT = process.env.MEDIACONVERT_ENDPOINT;
const S3_URL_PREFIX = 'https://s3-us-west-1.amazonaws.com/instausercontent';

const mediaconvert = new AWS.MediaConvert({
  apiVersion: '2017-08-29',
  region: 'us-west-1',
  endpoint: process.env.MEDIACONVERT_ENDPOINT,
  accessKeyId: process.env.MEDIACONVERT_ACCESS_KEY,
  secretAccessKey: process.env.MEDIACONVERT_KEY_SECRET
});


export const init = async () => {
  try {
    // const pingstat =  await db('posts').limit(1);
    // if(pingstat){
    //   console.log(`[init] success`);
    // }
  } catch (error) {
    console.log(`[init] error: ${error.stack}`);
  }
}

export const createJob = async (post) => {
  try {
    console.log(`[createJob] post: ${JSON.stringify(post)}`);
    // let post;
    // const rows = await db('posts')
    //   .select(['videoUrl', 'isLandscape'])
    //   .where({
    //     postId
    //   });

    // if (rows && rows.length) {
    //   post = rows.pop();
    // }
    // https://s3-us-west-1.amazonaws.com/insta-assets/posts/vid/1d7u4gfl5.mp4
    const fileName = post.videoUrl.split('instausercontent/').pop();
    const output = fileName.split('.')[0];
    const params = {
      Role: ROLE,
      JobTemplate: post.isLandcape ? TEMPLATE_LANDSCAPE : TEMPLATE_PORTRAIT,
      BillingTagsSource: 'JOB_TEMPLATE',
      AccelerationSettings: {
        Mode: 'DISABLED'
      },
      UserMetadata: {
        In: post.videoUrl,
        Out: `${process.env.CLOUDFRONT_URL}/${output}.m3u8`,
        PostId: post.postId.toString()
      },
      Settings: {
        Inputs: [{
          AudioSelectors: {
            'Audio Selector 1': {
              Offset: 0,
              DefaultSelection: 'DEFAULT',
              ProgramSelection: 1
            }
          },
          FileInput: 's3://instausercontent/' + fileName,
          VideoSelector: {
            Rotate: 'AUTO'
          }
        }],
        OutputGroups: [{
          OutputGroupSettings: {
            HlsGroupSettings: {
              Destination: 's3://instausercontent/'
            },
            Type: 'HLS_GROUP_SETTINGS'
          }
        }]
      }
    };

    console.log(`[createJob] params: ${JSON.stringify(params)}`);
    mediaconvert.createJob(params, function (err, data) {
      if (err) console.log(err, err.stack);
      console.log(`[createJob] result: ${JSON.stringify(data)}`);
      //handler.saveJob(postId, data.Job);
    });
  } catch (error) {
    console.log(`[createJob] error: ${error.stack}`);
  }
}

const iterateJobs = async (job) => {
  console.log(`[iterateJobs] jobId: ${job.awsJobId}`);
  return new Promise((resolve, reject) => {
    console.log(`[iterateJobs] jobId: ${job.awsJobId}`);
    try {
      const params = {
        Id: job.awsJobId
      };
      mediaconvert.getJob(params, async (err, data) => {
        if (err) {
          console.log(`[iterateJobs] err: ${err.stack}`);
          return reject(err);
        }
        // console.log(`[iterateJobs] result: ${JSON.stringify(data)}`);
        if (data.Job && data.Job.Status === 'COMPLETE') {
          const outputFile = `${process.env.CLOUDFRONT_URL}/${data.Job.UserMetadata.Out}`;

          await db('mediaconvert_jobs')
            .update({
              status: data.Job.Status
            }).where({
              jobId: job.jobId
            });

          await db('posts')
            .update({
              videoStreamUrl: outputFile
            }).where({
              postId: job.postId
            });
          resolve();
        }
        resolve(data);
      });
    } catch (error) {
      console.log(`[iterateJobs] error: ${error.stack}`);
      reject(error);
    }
  });
}

const updateVideoUrls = (json) => {
  request.post(
    process.env.UPLOAD_SERVICE + '/jobs', {
      json: json
    },
    function (error, response, body) {
      if (error) {
        console.log('[updateVideoUrls] error: ', error.stack);
      }
      if (!error && response.statusCode == 200) {
        console.log('[updateVideoUrls] response: ', body);
      }
    }
  );
}

export const getJobs = async () => {
  try {
    // console.log(`[getJobs] starting`);
    // const jobs = await db('mediaconvert_jobs').where('status', 'SUBMITTED').orderBy('jobId', 'asc');
    const params = {
      MaxResults: 20,
      Order: 'DESCENDING',
      Status: 'COMPLETE'
    };

    console.log(`[getJobs] params: ${JSON.stringify(params)}`);
    mediaconvert.listJobs(params, function(err, data) {
      if (err) console.log(err, err.stack);
      else     console.log(JSON.stringify(data));   
      const jobs = data.Jobs.map((job) => {
        return job.Job.UserMetadata;
      });

    });
    // console.log(`[getJobs] found ${jobs.length} jobs`);
    // for (const job of jobs) await iterateJobs(job);
  } catch (error) {
    console.log(`[convertSingle] error: ${error.stack}`);
  }
}