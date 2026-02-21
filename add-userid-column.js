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

async function addUserIdColumn() {
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Check if userId column exists
    const columns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_tokens' AND column_name = 'userId'
    `);

    if (columns.length === 0) {
      console.log('Adding userId column to user_tokens table...');
      await queryRunner.query(`
        ALTER TABLE "user_tokens" 
        ADD COLUMN "userId" varchar NOT NULL DEFAULT ''
      `);
      
      // Create index on userId
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_user_tokens_userId" 
        ON "user_tokens" ("userId")
      `);
      
      console.log('✅ Added userId column and index');
    } else {
      console.log('✅ userId column already exists');
    }

    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addUserIdColumn();
