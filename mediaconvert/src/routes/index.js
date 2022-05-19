import express from 'express';
import {
  getJobs,
  createJob
} from './service';

const router = express.Router();

router.get('/', (req, res, next) => {
  res.send({
    status: 200
  });
});

router.post('/job', (req, res) => {
  createJob(req.body);
  res.send({status: 200});
});

router.get('/cron', (req, res) => {
  getJobs();
  res.send({status: 200});
});

module.exports = router;