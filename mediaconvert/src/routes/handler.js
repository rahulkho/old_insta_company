import db from '../db';

const saveJob = async (postId, job) => {
  console.log(`[saveJob] jobId: ${job.Id}`);

  const row = {
    postId,
    awsJobId: job.Id,
    status: job.Status,
    createdTs: new Date(job.CreatedAt)
  };

  await db('mediaconvert_jobs').insert(row);
}

export default{
  saveJob
}