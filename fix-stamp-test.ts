/**
 * Script to fix user stamp data for testing 7-stamp reward
 * This directly manages the database to set up test conditions
 * 
 * Run with: npx ts-node fix-stamp-test.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Repository } from 'typeorm';
import { User } from './src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StampsService } from './src/stamps/stamps.service';

async function fixStampTest() {
  console.log('🔧 Fixing Stamp Test Data\n');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const stampsService = app.get(StampsService);

  // User ID from the image
  const testUserId = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb';
  
  try {
    // Step 1: Get current user state
    console.log('\n📋 Step 1: Checking current user state...');
    const user = await userRepository.findOne({ where: { id: testUserId } });
    
    if (!user) {
      console.error('❌ User not found!');
      return;
    }

    console.log('Current State:');
    console.log({
      email: user.email,
      stampsCollected: user.stampsCollected,
      lastStampClaimDate: user.lastStampClaimDate?.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      firstStampClaimDate: user.firstStampClaimDate?.toISOString(),
    });

    // Step 2: Check current eligibility
    console.log('\n📋 Step 2: Checking eligibility...');
    const statusBefore = await stampsService.getStampStatus(testUserId);
    console.log('Eligibility Status:', {
      eligible: statusBefore.eligible,
      message: statusBefore.message,
      stampsCollected: statusBefore.stampsCollected,
      stampsNeeded: statusBefore.stampsNeeded,
    });

    // Step 3: Fix the dates - set to 25 hours ago to ensure eligibility
    console.log('\n🔧 Step 3: Fixing dates...');
    const now = new Date();
    const twentyFiveHoursAgo = new Date(now.getTime() - (25 * 60 * 60 * 1000));
    const sixDaysAgo = new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000));

    user.stampsCollected = 6;
    user.lastStampClaimDate = twentyFiveHoursAgo;
    user.lastLoginAt = twentyFiveHoursAgo;
    user.firstStampClaimDate = sixDaysAgo;

    await userRepository.save(user);
    console.log('✅ Updated user data:');
    console.log({
      stampsCollected: user.stampsCollected,
      lastStampClaimDate: user.lastStampClaimDate.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
      firstStampClaimDate: user.firstStampClaimDate.toISOString(),
    });

    // Step 4: Verify eligibility after fix
    console.log('\n📋 Step 4: Verifying eligibility after fix...');
    const statusAfter = await stampsService.getStampStatus(testUserId);
    console.log('New Eligibility Status:', {
      eligible: statusAfter.eligible,
      message: statusAfter.message,
      stampsCollected: statusAfter.stampsCollected,
      stampsNeeded: statusAfter.stampsNeeded,
    });

    if (statusAfter.eligible) {
      console.log('\n✅ User is now eligible to claim stamp!');
      console.log('\n💡 Next step: Call POST /stamps/claim to get the 7th stamp and reward');
    } else {
      console.log('\n⚠️  User is still not eligible. Reason:', statusAfter.message);
      console.log('\n🔍 Debugging info:');
      
      // Get fresh user data
      const freshUser = await userRepository.findOne({ where: { id: testUserId } });
      if (freshUser) {
        const currentTime = new Date();
        const timeSinceLastLogin = currentTime.getTime() - (freshUser.lastLoginAt?.getTime() || 0);
        const hoursSinceLastLogin = timeSinceLastLogin / (60 * 60 * 1000);
        
        console.log({
          currentTime: currentTime.toISOString(),
          lastLoginAt: freshUser.lastLoginAt?.toISOString(),
          hoursSinceLastLogin: hoursSinceLastLogin.toFixed(2),
          lastStampClaimDate: freshUser.lastStampClaimDate?.toISOString(),
        });
      }
    }

    // Step 5: Try claiming the stamp
    console.log('\n🎯 Step 5: Attempting to claim stamp...');
    try {
      const claimResult = await stampsService.claimStamp(testUserId);
      console.log('\n📊 Claim Result:');
      console.log({
        success: claimResult.success,
        message: claimResult.message,
        stampsCollected: claimResult.stampsCollected,
        stampsNeeded: claimResult.stampsNeeded,
        reward: claimResult.reward || 'No reward (not at 7 stamps yet)',
      });

      if (claimResult.reward) {
        console.log('\n🎉 SUCCESS! Reward was given!');
        console.log('Reward Details:', claimResult.reward);
      }
    } catch (error) {
      console.error('\n❌ Error claiming stamp:', error.message);
      console.error(error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Script completed!');

  } catch (error) {
    console.error('\n❌ Script failed with error:');
    console.error(error);
  } finally {
    await app.close();
  }
}

// Run the script
fixStampTest().catch(console.error);
