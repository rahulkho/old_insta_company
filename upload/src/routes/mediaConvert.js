import AWS from 'aws-sdk';
import db from '../db';
import regeneratorRuntime from 'regenerator-runtime';

const TEMPLATE_PORTRAIT = 'Custom_Portrait_1';
const TEMPLATE_LANDSCAPE = 'Custom_Landscape_1';
const ROLE = process.env.MEDIACONVERT_ROLE;
const ENDPOINT = process.env.MEDIACONVERT_ENDPOINT;

const mediaconvert = new AWS.MediaConvert({
  apiVersion: '2017-08-29',
  region: 'us-west-1',
  endpoint: process.env.MEDIACONVERT_ENDPOINT,
  accessKeyId: process.env.MEDIACONVERT_ACCESS_KEY,
  secretAccessKey: process.env.MEDIACONVERT_KEY_SECRET
});

const start = (fileName, isLandcape) => {
  try {
    console.log(`[start] fileName: ${fileName}, isLandcape: ${isLandcape}`);

    const params = {
      Role: process.env.MEDIACONVERT_ROLE,
      JobTemplate: isLandcape ? TEMPLATE_LANDSCAPE : TEMPLATE_PORTRAIT,
      BillingTagsSource: 'JOB_TEMPLATE',
      AccelerationSettings: {
        Mode: 'DISABLED'
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
          FileInput: 's3://insta-assets/' + fileName,
          VideoSelector: {
            Rotate: 'AUTO'
          }
        }],
        OutputGroups: [{
          OutputGroupSettings: {
            HlsGroupSettings: {
              Destination: 's3://invideos/'
            },
            Type: 'HLS_GROUP_SETTINGS'
          }
        }]
      }
    };

    console.log(`[start] params: ${JSON.stringify(params)}`);
    mediaconvert.createJob(params, async function (err, data) {
      if (err) {
        console.log(err, err.stack);
        return;
      }
      console.log(`[start] result: ${JSON.stringify(data)}`);
      let job = data.Job;
      const row = {
        postId,
        awsJobId: job.Id,
        status: job.Status,
        createdTs: new Date(job.CreatedAt)
      };
      await db('mediaconvert_jobs').insert(row);
    });
  } catch (error) {
    console.log(`[start] error: ${error.stack}`);
  }

}

const createJob = async (post) => {
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
    const fileName = post.videoUrl.split('cloudfront.net/').pop();
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
    mediaconvert.createJob(params, async function (err, data) {
      if (err) {
        console.log(err, err.stack);
        return;
      }
      console.log(`[createJob] result: ${JSON.stringify(data)}`);
      let job = data.Job;
      const row = {
        postId: post.postId,
        awsJobId: job.Id,
        status: job.Status,
        createdTs: new Date(job.CreatedAt)
      };
      await db('mediaconvert_jobs').insert(row);
    });
  } catch (error) {
    console.log(`[createJob] error: ${error.stack}`);
  }
}

// const params = {
//   MaxResults: 20,
//   Order: 'DESCENDING',
//   Status: 'COMPLETE'
// };

// console.log(`[getJobs] params: ${JSON.stringify(params)}`);
// mediaconvert.listJobs(params, function (err, data) {
//   if (err) console.log(err, err.stack);
//   else console.log(JSON.stringify(data));
//   const jobs = data.Jobs.map((job) => {
//     return job.Job.UserMetadata;
//   });

//   for (const job of jobs) {
//     await db('posts')
//       .update({
//         videStreamUrl: job.Out
//       })
//       .where({
//         postId: parseInt(job.PostId)
//       })
//       .andWhere('videoStreamUrl', 'is', 'null');
//   }
// });


const iterateJobs = async (job) => {
  
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
        console.log(`[iterateJobs] updating post: ${data.Job.UserMetadata.PostId}, jobId: ${data.Job.Id}, status: ${data.Job.Status}`);
        if (data.Job && data.Job.Status === 'COMPLETE') {
          await db('mediaconvert_jobs')
            .update({
              status: data.Job.Status
            }).where({
              jobId: job.jobId
            });

          await db('posts')
            .update({
              videoStreamUrl: data.Job.UserMetadata.Out
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

const getJobs = async () => {
  try {
    console.log(`[getJobs] starting`);
    const jobs = await db('mediaconvert_jobs').where('status', 'SUBMITTED').orderBy('jobId', 'asc');
    console.log(`[getJobs] found ${jobs.length} jobs`);
    for (const job of jobs) await iterateJobs(job);
  } catch (error) {
    console.log(`[convertSingle] error: ${error.stack}`);
  }
}

export default {
  start,
  getJobs,
  createJob
}