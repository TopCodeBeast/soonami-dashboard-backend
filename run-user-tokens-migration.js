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

async function runMigration() {
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Check if table exists
    const tableExists = await queryRunner.hasTable('user_tokens');
    
    if (!tableExists) {
      console.log('Creating user_tokens table...');
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

      await queryRunner.query(`CREATE INDEX "IDX_user_tokens_username" ON "user_tokens" ("username");`);
      await queryRunner.query(`CREATE INDEX "IDX_user_tokens_token" ON "user_tokens" ("token");`);
      await queryRunner.query(`CREATE INDEX "IDX_user_tokens_isActive" ON "user_tokens" ("isActive");`);

      console.log('✅ Created user_tokens table');
    } else {
      console.log('Table exists, checking columns...');
      const result = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_tokens'
      `);
      const columns = result.map(r => r.column_name);
      
      if (!columns.includes('username')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "username" varchar NOT NULL DEFAULT ''`);
        console.log('✅ Added username column');
      }
      if (!columns.includes('token')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "token" varchar NOT NULL UNIQUE DEFAULT ''`);
        console.log('✅ Added token column');
      }
      if (!columns.includes('createdAt')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Added createdAt column');
      }
      if (!columns.includes('lastActivityAt')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "lastActivityAt" timestamp DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Added lastActivityAt column');
      }
      if (!columns.includes('expiresAt')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "expiresAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Added expiresAt column');
      }
      if (!columns.includes('isActive')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "isActive" boolean DEFAULT true`);
        console.log('✅ Added isActive column');
      }

      // Create indexes if they don't exist
      try {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_tokens_username" ON "user_tokens" ("username");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_tokens_token" ON "user_tokens" ("token");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_tokens_isActive" ON "user_tokens" ("isActive");`);
      } catch (e) {
        console.log('Indexes might already exist');
      }

      console.log('✅ Updated user_tokens table');
    }

    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Migration completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
