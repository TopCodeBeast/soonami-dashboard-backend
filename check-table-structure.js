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

async function checkTable() {
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Get all columns with their properties
    const columns = await queryRunner.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_tokens'
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent user_tokens table structure:');
    console.log('=====================================');
    columns.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Check for userId column
    const userIdColumns = columns.filter(c => 
      c.column_name.toLowerCase() === 'userid' || 
      c.column_name === 'userId' ||
      c.column_name === 'user_id'
    );

    if (userIdColumns.length > 0) {
      console.log('\n✅ Found userId column(s):', userIdColumns.map(c => c.column_name));
    } else {
      console.log('\n⚠️ No userId column found');
    }

    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTable();
