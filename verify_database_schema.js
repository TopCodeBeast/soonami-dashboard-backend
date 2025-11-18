/**
 * Script to verify database schema matches the entity definitions
 */
const { Client } = require('pg');
require('dotenv').config();

async function verifySchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'user_management1',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database:', process.env.DB_NAME || 'user_management1');
    console.log('\n' + '='.repeat(60));
    console.log('DATABASE SCHEMA VERIFICATION');
    console.log('='.repeat(60) + '\n');

    // Check users table structure
    const usersTable = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    if (usersTable.rows.length === 0) {
      console.log('⚠️  Users table does not exist!');
      console.log('   Make sure NODE_ENV=development in your .env file');
      console.log('   TypeORM synchronize will create it automatically');
      await client.end();
      return;
    }

    console.log('📋 Users Table Structure:');
    console.log('-'.repeat(60));
    usersTable.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });

    // Check specific columns
    console.log('\n🔍 Key Column Checks:');
    console.log('-'.repeat(60));
    
    const passwordCol = usersTable.rows.find(col => col.column_name === 'password');
    if (passwordCol) {
      const status = passwordCol.is_nullable === 'YES' ? '✅' : '❌';
      console.log(`${status} Password column: ${passwordCol.is_nullable === 'YES' ? 'NULLABLE (correct)' : 'NOT NULL (needs update)'}`);
    } else {
      console.log('⚠️  Password column not found');
    }

    const emailCol = usersTable.rows.find(col => col.column_name === 'email');
    if (emailCol) {
      console.log(`✅ Email column: ${emailCol.data_type}`);
    }

    const nameCol = usersTable.rows.find(col => col.column_name === 'name');
    if (nameCol) {
      const status = nameCol.is_nullable === 'YES' ? '✅' : '⚠️';
      console.log(`${status} Name column: ${nameCol.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    }

    const roleCol = usersTable.rows.find(col => col.column_name === 'role');
    if (roleCol) {
      console.log(`✅ Role column: ${roleCol.data_type}`);
    }

    // Check for required columns
    const requiredColumns = ['id', 'email', 'password', 'name', 'role', 'gem', 'isActive', 'createdAt', 'updatedAt'];
    const existingColumns = usersTable.rows.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
      console.log('   These will be created by TypeORM synchronize');
    } else {
      console.log('\n✅ All required columns exist');
    }

    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users';
    `);

    if (indexes.rows.length > 0) {
      console.log('\n📑 Indexes:');
      console.log('-'.repeat(60));
      indexes.rows.forEach(idx => {
        console.log(`  ${idx.indexname}`);
      });
    }

    await client.end();
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to database. Check:');
      console.error('   - Database server is running');
      console.error('   - DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD in .env');
      console.error('   - Database exists: ' + (process.env.DB_NAME || 'user_management1'));
    }
    process.exit(1);
  }
}

verifySchema();

