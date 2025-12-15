/**
 * Quick setup script to prepare user for 7-stamp reward test
 * Sets user to 6 stamps and makes them eligible to claim the 7th
 * 
 * Run with: npx ts-node setup-6-stamps.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Repository } from 'typeorm';
import { User } from './src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function setup6Stamps() {
  console.log('🔧 Setting up user for 7-stamp reward test...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  // User ID from your database
  const testUserId = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb';
  
  try {
    const user = await userRepository.findOne({ where: { id: testUserId } });
    
    if (!user) {
      console.error('❌ User not found!');
      return;
    }

    console.log('📋 Current state:');
    console.log({
      email: user.email,
      stampsCollected: user.stampsCollected,
      gem: user.gem,
    });

    // Set to 6 stamps and make eligible (yesterday in GMT+8)
    // Logic: If lastStampClaimDate is yesterday (GMT+8), user can claim today
    const now = new Date();
    const yesterdayGMT8 = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Yesterday
    const sixDaysAgo = new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000));

    user.stampsCollected = 6;
    user.lastStampClaimDate = yesterdayGMT8; // Set to yesterday so today is a different day
    user.lastLoginAt = yesterdayGMT8; // Keep for reference, but not used for eligibility
    user.firstStampClaimDate = sixDaysAgo;

    await userRepository.save(user);

    console.log('\n✅ User setup complete!');
    console.log({
      stampsCollected: user.stampsCollected,
      lastStampClaimDate: user.lastStampClaimDate.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
    });

    console.log('\n🎯 Ready to test!');
    console.log('   - User has 6 stamps');
    console.log('   - Last stamp claimed: yesterday (GMT+8)');
    console.log('   - Eligible to claim 7th stamp (different day in GMT+8)');
    console.log('   - Next claim will trigger reward');
    console.log('\n💡 Call POST /stamps/claim to get the 7th stamp and see the reward!');
    console.log('\n📝 Note: Stamp system resets at midnight GMT+8 (00:00).');
    console.log('   If you claim at 23:00 GMT+8, you can claim again at 01:00 GMT+8 (next day).');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
  } finally {
    await app.close();
  }
}

setup6Stamps().catch(console.error);
