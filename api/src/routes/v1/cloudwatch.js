import express from 'express';
import createError from 'http-errors';
import ApiResult from '../../classes/ApiResult';
import db from '../../db';
const router = express.Router();
import regeneratorRuntime from 'regenerator-runtime';

router.post('/jobComplete', async (req, res, next) => {
  try {
    let data = req.body;
    console.log(`[jobComplete] body: ${JSON.stringify(data)}`);
    const job = data.detail.userMetadata;
    const result = await db('posts')
      .update({
        videoStreamUrl: job.Out,
      })
      .where('postId', parseInt(job.PostId));

    console.log(`[jobComplete] query result: ${result}`);
    return res.send(
      new ApiResult().sendStatus({
        status: 200,
      })
    );
  } catch (error) {
    console.log(`[jobComplete] error: ${error.stack}`);
    next(
      createError(401, 'Server is busy at the moment, please try again later.')
    );
  }
});

export default router;
