import dotenv from 'dotenv';
dotenv.config({
  path: '.env',
});
import knex from 'knex';
import { getTransaction } from '../lib/utils';

const db = knex({
  client: 'postgres',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8',
    debug: true,
    pool: {
      min: 1,
      max: 20,
      propagateCreateError: false,
    },
  },
});

db.raw('select 1+1 as result')
  .then(async (result) => {
    console.log('[db] Connected with db:', process.env.DB_NAME);
    await start();
    process.exit(1);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

/*

DELETE
.......


hashtags
keywords
moderation_jobs
notifications
password_reset_requests
post_blessings
post_comments
post_favourites
post_likes
post_views
posts
reported_posts
reported_users
skipped_categories
user_blocks
user_feedbacks
user_follows
user_location_info
user_locations

CONDITIONAL DELETE
..................

users
user_sounds
user_countries
sounds
sound_categories
categories

*/
async function start() {
  const trx = await getTransaction(db);
  try {
    const hashtags = await db('hashtags').transacting(trx).del();
    console.log('hashtags:', hashtags);

    const keywords = await db('keywords').transacting(trx).del();
    console.log('keywords:', keywords);

    const moderation_jobs = await db('moderation_jobs').transacting(trx).del();
    console.log('moderation_jobs:', moderation_jobs);

    const notifications = await db('notifications').transacting(trx).del();
    console.log('notifications:', notifications);

    const password_reset_requests = await db('password_reset_requests')
      .transacting(trx)
      .del();
    console.log('password_reset_requests:', password_reset_requests);

    const comment_likes = await db('comment_likes').transacting(trx).del();
    console.log('comment_likes:', comment_likes);

    const post_blessings = await db('post_blessings').transacting(trx).del();
    console.log('post_blessings:', post_blessings);

    const post_comments = await db('post_comments').transacting(trx).del();
    console.log('post_comments:', post_comments);

    const post_favourites = await db('post_favourites').transacting(trx).del();
    console.log('post_favourites:', post_favourites);

    const post_likes = await db('post_likes').transacting(trx).del();
    console.log('post_likes:', post_likes);

    const post_views = await db('post_views').transacting(trx).del();
    console.log('post_views:', post_views);

    const reported_posts = await db('reported_posts').transacting(trx).del();
    console.log('reported_posts:', reported_posts);

    const posts = await db('posts').transacting(trx).del();
    console.log('posts:', posts);

    const reported_users = await db('reported_users').transacting(trx).del();
    console.log('reported_users:', reported_users);

    const skipped_categories = await db('skipped_categories')
      .transacting(trx)
      .del();
    console.log('skipped_categories:', skipped_categories);

    const user_blocks = await db('user_blocks').transacting(trx).del();
    console.log('user_blocks:', user_blocks);

    const user_feedbacks = await db('user_feedbacks').transacting(trx).del();
    console.log('user_feedbacks:', user_feedbacks);

    const user_follows = await db('user_follows').transacting(trx).del();
    console.log('user_follows:', user_follows);

    const user_location_info = await db('user_location_info')
      .transacting(trx)
      .del();
    console.log('user_location_info:', user_location_info);

    const user_locations = await db('user_locations').transacting(trx).del();
    console.log('user_locations:', user_locations);

    const categories = await db('categories')
      .transacting(trx)
      .where({ isDeleted: true })
      .del();
    console.log('categories:', categories);

    const sound_categories = await db('sound_categories')
      .transacting(trx)
      .where({ isDeleted: true })
      .del();
    console.log('sound_categories:', sound_categories);

    const sounds = await db('sounds')
      .transacting(trx)
      .where({ isDeleted: true })
      .orWhereIn(
        'userId',
        db('users')
          .select('userId')
          .where('isDeleted', true)
          .orWhere('soundSponsored', false)
      )
      .del();
    console.log('sounds:', sounds);

    const user_countries = await db('user_countries')
      .transacting(trx)
      .whereIn(
        'userId',
        db('users')
          .select('userId')
          .where('isDeleted', true)
          .orWhere('soundSponsored', false)
      )
      .del();
    console.log('user_countries:', user_countries);

    const user_sounds = await db('user_sounds')
      .transacting(trx)
      .whereIn(
        'userId',
        db('users')
          .select('userId')
          .where('isDeleted', true)
          .orWhere('soundSponsored', false)
      )
      .orWhereIn('soundId', db('sounds').select('id').where('isDeleted', true))
      .del();
    console.log('user_sounds:', user_sounds);

    const users = await db('users')
      .transacting(trx)
      .where({ isDeleted: true })
      .orWhere('soundSponsored', false)
      .del();
    console.log('users:', users);

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    console.log(error);
  }
}
