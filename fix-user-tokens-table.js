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

    // Check current table structure
    const columns = await queryRunner.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_tokens'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:', columns.map(c => c.column_name));

    // Check if userId column exists
    const hasUserId = columns.some(c => c.column_name === 'userId');
    const hasUsername = columns.some(c => c.column_name === 'username');

    if (hasUserId && !hasUsername) {
      // Table has userId but we need username - drop userId and keep username
      console.log('Removing userId column (not needed)...');
      await queryRunner.query(`ALTER TABLE "user_tokens" DROP COLUMN IF EXISTS "userId" CASCADE`);
    }

    if (hasUserId && hasUsername) {
      // Both exist - drop userId
      console.log('Removing userId column (redundant)...');
      await queryRunner.query(`ALTER TABLE "user_tokens" DROP COLUMN IF EXISTS "userId" CASCADE`);
    }

    // Ensure all required columns exist
    if (!hasUsername) {
      await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN IF NOT EXISTS "username" varchar NOT NULL DEFAULT ''`);
      console.log('✅ Added username column');
    }

    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Table fixed');
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixTable();
