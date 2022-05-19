import dotenv from 'dotenv';
dotenv.config({
  path: '.env',
});
import knex from 'knex';

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
  .then((result) => {
    console.log('[db] Connected with db', process.env.DB_NAME);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

export default db;
