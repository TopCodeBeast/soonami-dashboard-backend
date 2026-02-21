const { DataSource } = require('typeorm');
require('dotenv').config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'user_management',
});

async function fixTable() {
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Drop and recreate the table to match our entity exactly
    console.log('Dropping existing user_tokens table...');
    await queryRunner.query(`DROP TABLE IF EXISTS "user_tokens" CASCADE`);
    
    console.log('Creating user_tokens table with correct structure...');
    await queryRunner.query(`
      CREATE TABLE "user_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "username" varchar NOT NULL,
        "token" varchar NOT NULL UNIQUE,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "lastActivityAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" timestamp NOT NULL,
        "isActive" boolean DEFAULT true
      );
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_user_tokens_username" ON "user_tokens" ("username");`);
    await queryRunner.query(`CREATE INDEX "IDX_user_tokens_token" ON "user_tokens" ("token");`);
    await queryRunner.query(`CREATE INDEX "IDX_user_tokens_isActive" ON "user_tokens" ("isActive");`);

    console.log('✅ Table recreated successfully');

    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixTable();
