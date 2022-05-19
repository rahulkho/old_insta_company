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
		debug: true
	}
});

module.exports = db;