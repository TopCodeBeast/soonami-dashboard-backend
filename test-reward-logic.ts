/**
 * Test script to verify 7-stamp reward logic
 * 
 * Usage:
 * 1. Set up a test user with 6 stamps
 * 2. Run this script to claim the 7th stamp
 * 3. Verify reward is given and stamps reset
 * 
 * Run with: npx ts-node test-reward-logic.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { StampsService } from './src/stamps/stamps.service';
import { Repository } from 'typeorm';
import { User } from './src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function testRewardLogic() {
  console.log('🧪 Testing 7-Stamp Reward Logic\n');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const stampsService = app.get(StampsService);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  // Find a test user (or use a specific user ID)
  const testUserId = process.env.TEST_USER_ID || 'your-test-user-id';
  
  console.log(`\n📋 Test User ID: ${testUserId}\n`);

  try {
    // Step 1: Get current stamp status
    console.log('Step 1: Checking current stamp status...');
    const statusBefore = await stampsService.getStampStatus(testUserId);
    console.log('Status BEFORE claim:', {
      stampsCollected: statusBefore.stampsCollected,
      stampsNeeded: statusBefore.stampsNeeded,
      eligible: statusBefore.eligible,
      message: statusBefore.message,
    });

    if (statusBefore.stampsCollected === 7) {
      console.log('\n⚠️  User already has 7 stamps! Setting to 6 for testing...');
      const user = await userRepository.findOne({ where: { id: testUserId } });
      if (user) {
        user.stampsCollected = 6;
        await userRepository.save(user);
        console.log('✅ Set stamps to 6');
      }
    }

    // Step 2: Check if user is eligible
    if (!statusBefore.eligible && statusBefore.stampsCollected < 7) {
      console.log('\n⚠️  User is not eligible to claim stamp.');
      console.log('   Reason:', statusBefore.message);
      console.log('\n💡 To test reward logic, you can:');
      console.log('   1. Wait for cooldown period');
      console.log('   2. Or manually update lastLoginAt in database:');
      console.log(`      UPDATE users SET "lastLoginAt" = NOW() - INTERVAL '25 hours' WHERE id = '${testUserId}';`);
      return;
    }

    // Step 3: Claim stamp (this should trigger reward if at 6 stamps)
    console.log('\nStep 2: Claiming stamp...');
    const claimResult = await stampsService.claimStamp(testUserId);
    
    console.log('\n📊 Claim Result:');
    console.log({
      success: claimResult.success,
      message: claimResult.message,
      stampsCollected: claimResult.stampsCollected,
      stampsNeeded: claimResult.stampsNeeded,
      reward: claimResult.reward || 'No reward (not at 7 stamps yet)',
    });

    // Step 4: Verify reward was given
    if (claimResult.reward) {
      console.log('\n✅ REWARD GIVEN!');
      console.log('Reward Details:', {
        name: claimResult.reward.name,
        type: claimResult.reward.type,
        amount: claimResult.reward.amount,
      });

      // Step 5: Check user's updated state
      console.log('\nStep 3: Verifying user state after reward...');
      const statusAfter = await stampsService.getStampStatus(testUserId);
      console.log('Status AFTER claim:', {
        stampsCollected: statusAfter.stampsCollected,
        stampsNeeded: statusAfter.stampsNeeded,
      });

      if (statusAfter.stampsCollected === 0) {
        console.log('✅ Stamps correctly reset to 0');
      } else {
        console.log('❌ ERROR: Stamps not reset! Expected 0, got', statusAfter.stampsCollected);
      }

      // Step 6: Check database for reward record
      console.log('\nStep 4: Checking database records...');
      const user = await userRepository.findOne({ where: { id: testUserId } });
      if (user) {
        console.log('User gem balance:', user.gem || 0);
        
        // Check stamp_rewards table (would need to inject repository)
        console.log('\n💡 To verify reward in database, run:');
        console.log(`   SELECT * FROM stamp_rewards WHERE user_id = '${testUserId}' ORDER BY "createdAt" DESC LIMIT 1;`);
      }
    } else {
      console.log('\nℹ️  No reward given (user not at 7 stamps yet)');
      console.log(`   Current stamps: ${claimResult.stampsCollected}/7`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
  } finally {
    await app.close();
  }
}

// Run the test
testRewardLogic().catch(console.error);
