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

async function removeUserIdColumn() {
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

    if (columns.length > 0) {
      console.log('Removing userId column...');
      // Drop the column
      await queryRunner.query(`ALTER TABLE "user_tokens" DROP COLUMN "userId" CASCADE`);
      console.log('✅ Removed userId column');
    } else {
      console.log('✅ userId column does not exist');
    }

    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('Column already removed or never existed');
    }
    process.exit(1);
  }
}

removeUserIdColumn();
