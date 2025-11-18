/**
 * Script to update database schema
 * Makes password column nullable for email code authentication
 */
const { Client } = require('pg');
require('dotenv').config();

async function updateDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'user_management1',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Users table does not exist. It will be created by TypeORM synchronize.');
      console.log('   Make sure NODE_ENV=development in your .env file');
      await client.end();
      return;
    }

    // Check current password column state
    const columnCheck = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠️  Password column does not exist. It will be created by TypeORM synchronize.');
      await client.end();
      return;
    }

    const currentState = columnCheck.rows[0];
    console.log(`📊 Current password column state: nullable=${currentState.is_nullable}`);

    if (currentState.is_nullable === 'NO') {
      // Update the column to allow NULL
      await client.query(`
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
      `);
      console.log('✅ Password column updated to allow NULL values');
    } else {
      console.log('✅ Password column already allows NULL values');
    }

    // Verify the change
    const verifyCheck = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password';
    `);

    console.log('\n📋 Updated column state:');
    console.log(verifyCheck.rows[0]);

    await client.end();
    console.log('\n✅ Database update completed!');
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    process.exit(1);
  }
}

updateDatabase();

