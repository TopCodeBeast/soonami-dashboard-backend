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

async function checkTokens() {
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const now = new Date();
    console.log(`\n⏰ Current time: ${now.toISOString()}`);

    // Get recent tokens with detailed info
    const recentTokens = await dataSource.query(`
      SELECT 
        id,
        "userId",
        username,
        "isActive",
        "createdAt",
        "lastActivityAt",
        "expiresAt",
        EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 60 as minutes_since_creation,
        EXTRACT(EPOCH FROM ("expiresAt" - NOW())) / 60 as minutes_until_expiration,
        EXTRACT(EPOCH FROM (NOW() - "lastActivityAt")) / 60 as minutes_since_activity
      FROM user_tokens
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    console.log('\n📋 Recent tokens:');
    recentTokens.forEach((token, idx) => {
      const expiresAt = new Date(token.expiresAt);
      const lastActivity = new Date(token.lastActivityAt);
      const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (60 * 1000);
      const minutesUntilExpiration = (expiresAt.getTime() - now.getTime()) / (60 * 1000);
      const shouldBeActive = expiresAt > now && minutesSinceActivity < 5;
      
      console.log(`\nToken ${idx + 1}:`);
      console.log(`  ID: ${token.id}`);
      console.log(`  Username: ${token.username}`);
      console.log(`  isActive: ${token.isActive}`);
      console.log(`  Created: ${token.createdAt}`);
      console.log(`  Expires: ${token.expiresAt} (${minutesUntilExpiration.toFixed(2)} min from now)`);
      console.log(`  Last Activity: ${token.lastActivityAt} (${minutesSinceActivity.toFixed(2)} min ago)`);
      console.log(`  Should be active: ${shouldBeActive ? 'YES ✅' : 'NO ❌'}`);
      console.log(`  - expiresAt > now: ${expiresAt > now ? 'YES' : 'NO'}`);
      console.log(`  - activity < 5min: ${minutesSinceActivity < 5 ? 'YES' : 'NO'}`);
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTokens();
