import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { GemTransactionsService } from '../users/gem-transactions.service';
import { UserItemsService } from '../users/user-items.service';
import { UserItemType } from '../users/entities/user-item.entity';
import { StampReward, RewardType } from './entities/stamp-reward.entity';
import { RoleHierarchy } from '../users/utils/role-hierarchy';

export { RewardType };

@Injectable()
export class StampsService {
  // Reward pool configuration
  private readonly REWARD_POOL: Array<{ type: RewardType; amount: number }> = [
    { type: RewardType.GEMS, amount: 5 },
    { type: RewardType.BACKFLIP, amount: 1 },
    { type: RewardType.CHOICE_PRIORITY, amount: 1 },
    { type: RewardType.REKALL_TOKEN_AIRDROP, amount: 1 },
  ];

  private readonly MAX_STAMPS = 7;
  private readonly GMT_PLUS_8_OFFSET = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  private readonly HOURS_24 = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StampReward)
    private readonly stampRewardRepository: Repository<StampReward>,
    private readonly gemTransactionsService: GemTransactionsService,
    private readonly userItemsService: UserItemsService,
  ) {}

  /**
   * Get the date string (YYYY-MM-DD) in GMT+8 for a given date
   */
  private getDateStringGMT8(date: Date): string {
    // Convert date to GMT+8
    const gmt8Time = new Date(date.getTime() + (date.getTimezoneOffset() * 60 * 1000) + this.GMT_PLUS_8_OFFSET);
    const year = gmt8Time.getUTCFullYear();
    const month = String(gmt8Time.getUTCMonth() + 1).padStart(2, '0');
    const day = String(gmt8Time.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get midnight GMT+8 for a given date
   */
  private getMidnightGMT8(date: Date): Date {
    const gmt8Time = new Date(date.getTime() + (date.getTimezoneOffset() * 60 * 1000) + this.GMT_PLUS_8_OFFSET);
    const year = gmt8Time.getUTCFullYear();
    const month = gmt8Time.getUTCMonth();
    const day = gmt8Time.getUTCDate();
    
    // Create midnight GMT+8 for that date
    const midnightGMT8 = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    // Convert back to UTC (subtract GMT+8 offset)
    return new Date(midnightGMT8.getTime() - this.GMT_PLUS_8_OFFSET);
  }

  /**
   * Check if a date is before midnight GMT+8 of that day
   */
  private isBeforeMidnightGMT8(date: Date): boolean {
    const midnight = this.getMidnightGMT8(date);
    return date.getTime() < midnight.getTime() + (24 * 60 * 60 * 1000);
  }

  /**
   * Check if user can collect a stamp
   * User gets 1 stamp per day before midnight GMT+8
   * If user doesn't login before midnight GMT+8, stamps reset to 0
   * After 24 hours since last login, user can get another stamp
   */
  async claimStamp(userId: string): Promise<{
    success: boolean;
    message: string;
    stampsCollected: number;
    stampsNeeded: number;
    reward?: {
      name: string;
      type: string;
      amount: number;
    };
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentTime = new Date();
    const currentDateGMT8 = this.getDateStringGMT8(currentTime);

    // DEBUG LOGGING
    console.log('🔍 [STAMP DEBUG] Claim Stamp Check:', {
      userId,
      currentStamps: user.stampsCollected,
      currentTime: currentTime.toISOString(),
      currentDateGMT8,
      lastStampClaimDate: user.lastStampClaimDate?.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      firstStampClaimDate: user.firstStampClaimDate?.toISOString(),
    });

    // Check if current login is before midnight GMT+8 of the NEXT day
    // If user logs in after midnight GMT+8, they missed the previous day and stamps should reset
    const currentMidnightGMT8 = this.getMidnightGMT8(currentTime);
    const nextMidnightGMT8 = new Date(currentMidnightGMT8.getTime() + (24 * 60 * 60 * 1000));
    
    console.log('🔍 [STAMP DEBUG] Midnight Check:', {
      currentTime: currentTime.toISOString(),
      currentMidnightGMT8: currentMidnightGMT8.toISOString(),
      nextMidnightGMT8: nextMidnightGMT8.toISOString(),
      isAfterNextMidnight: currentTime.getTime() >= nextMidnightGMT8.getTime(),
    });
    
    // Only reset if user logged in AFTER midnight GMT+8 of the NEXT day
    // This means they completely missed a day (logged in on day N+1 after midnight)
    // For example: If it's 3am GMT+8 on Jan 2, they're still within Jan 2, so don't reset
    // But if they logged in at 1am GMT+8 on Jan 3 (after missing Jan 2), reset stamps
    if (currentTime.getTime() >= nextMidnightGMT8.getTime()) {
      // User logged in after midnight GMT+8 of the next day - they missed a day, reset stamps
      console.log('⚠️ [STAMP DEBUG] After next midnight GMT+8 - resetting stamps');
      user.stampsCollected = 0;
      user.lastStampClaimDate = null;
      user.firstStampClaimDate = null;
      await this.userRepository.save(user);
      
      return {
        success: false,
        message: 'You logged in after midnight GMT+8. Stamps have been reset.',
        stampsCollected: 0,
        stampsNeeded: this.MAX_STAMPS,
      };
    }

    // Check if user already collected stamp today (same day in GMT+8)
    // Logic: If it's a different day in GMT+8, user can claim (even if less than 24 hours)
    // Example: Claim at 23:00 GMT+8, can claim again at 01:00 GMT+8 (next day)
    if (user.lastStampClaimDate) {
      const lastStampDateGMT8 = this.getDateStringGMT8(user.lastStampClaimDate);
      
      console.log('🔍 [STAMP DEBUG] Date Comparison (GMT+8):', {
        lastStampDateGMT8,
        currentDateGMT8,
        isSameDay: lastStampDateGMT8 === currentDateGMT8,
      });
      
      if (lastStampDateGMT8 === currentDateGMT8) {
        // Already collected today (same day in GMT+8) - only one stamp per day
        console.log('⚠️ [STAMP DEBUG] Already collected today (GMT+8)');
        return {
          success: false,
          message: 'You have already collected your stamp today',
          stampsCollected: user.stampsCollected || 0,
          stampsNeeded: this.MAX_STAMPS - (user.stampsCollected || 0),
        };
      }
      
      // Different day in GMT+8 - user can claim (no 24-hour cooldown needed)
      console.log('✅ [STAMP DEBUG] Different day in GMT+8 - eligible to claim');
    }

    // User can collect stamp - increment count
    const newStampCount = (user.stampsCollected || 0) + 1;
    console.log('✅ [STAMP DEBUG] User eligible - incrementing stamps:', {
      oldCount: user.stampsCollected,
      newCount: newStampCount,
      willTriggerReward: newStampCount >= this.MAX_STAMPS,
    });
    
    user.stampsCollected = newStampCount;
    
    if (!user.firstStampClaimDate) {
      user.firstStampClaimDate = currentTime;
    }
    user.lastStampClaimDate = currentTime;
    
    await this.userRepository.save(user);

    let rewardGiven: { name: string; type: string; amount: number } | undefined;

    // Check if user reached 7 stamps
    if (newStampCount >= this.MAX_STAMPS) {
      console.log('🎁 [STAMP DEBUG] REWARD TRIGGERED! User reached 7 stamps');
      // Give random reward
      const reward = this.selectRandomReward();
      console.log('🎁 [STAMP DEBUG] Selected reward:', reward);
      rewardGiven = await this.awardReward(userId, reward.type, reward.amount);
      console.log('✅ [STAMP DEBUG] Reward awarded:', rewardGiven);

      // Reset stamps after awarding reward
      user.stampsCollected = 0;
      user.lastStampClaimDate = null;
      user.firstStampClaimDate = null;
      await this.userRepository.save(user);
      console.log('🔄 [STAMP DEBUG] Stamps reset to 0');

      return {
        success: true,
        message: `Congratulations! You collected 7 stamps and received ${rewardGiven.amount} ${rewardGiven.name}!`,
        stampsCollected: 0,
        stampsNeeded: this.MAX_STAMPS,
        reward: rewardGiven,
      };
    }

    return {
      success: true,
      message: `Stamp collected! You now have ${newStampCount} stamp${newStampCount !== 1 ? 's' : ''}. ${this.MAX_STAMPS - newStampCount} more needed for a reward.`,
      stampsCollected: newStampCount,
      stampsNeeded: this.MAX_STAMPS - newStampCount,
    };
  }

  /**
   * Get current stamp status for user
   */
  async getStampStatus(userId: string): Promise<{
    stampsCollected: number;
    stampsNeeded: number;
    message: string;
    eligible: boolean;
    minutesUntilNext?: number;
    secondsUntilNext?: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stampsCollected = user.stampsCollected || 0;
    const stampsNeeded = this.MAX_STAMPS - stampsCollected;

    // Check if user can collect today (based on GMT+8 day, not 24-hour cooldown)
    let eligible = false;
    let message = '';
    let minutesUntilNext: number | undefined;
    let secondsUntilNext: number | undefined;

    const currentTime = new Date();
    const currentDateGMT8 = this.getDateStringGMT8(currentTime);
    const currentMidnightGMT8 = this.getMidnightGMT8(currentTime);
    const currentDayEnd = new Date(currentMidnightGMT8.getTime() + (24 * 60 * 60 * 1000));

    // Check if current time is after midnight GMT+8
    if (currentTime.getTime() >= currentDayEnd.getTime()) {
      eligible = false;
      message = 'You logged in after midnight GMT+8. Stamps will be reset on next login.';
    } else if (!user.lastStampClaimDate) {
      // First stamp
      eligible = true;
      message = 'You can collect your first stamp!';
    } else {
      const lastStampDateGMT8 = this.getDateStringGMT8(user.lastStampClaimDate);
      
      if (lastStampDateGMT8 === currentDateGMT8) {
        // Already collected today (same day in GMT+8)
        eligible = false;
        
        // Calculate time until next day (midnight GMT+8)
        const nextMidnightGMT8 = new Date(currentMidnightGMT8.getTime() + (24 * 60 * 60 * 1000));
        const timeUntilNextDay = nextMidnightGMT8.getTime() - currentTime.getTime();
        minutesUntilNext = Math.ceil(timeUntilNextDay / (60 * 1000));
        secondsUntilNext = Math.ceil(timeUntilNextDay / 1000);
        const hoursUntilMidnight = Math.ceil(timeUntilNextDay / (60 * 60 * 1000));
        
        message = `You have already collected your stamp today. Come back after midnight GMT+8 (in ${hoursUntilMidnight} hour${hoursUntilMidnight !== 1 ? 's' : ''})!`;
      } else {
        // Different day in GMT+8 - eligible to claim (no 24-hour cooldown)
        eligible = true;
        message = 'You can collect your stamp today!';
      }
    }

    return {
      stampsCollected,
      stampsNeeded,
      message,
      eligible,
      minutesUntilNext,
      secondsUntilNext,
    };
  }

  /**
   * Select a random reward from the pool
   */
  private selectRandomReward(): { type: RewardType; amount: number } {
    const randomIndex = Math.floor(Math.random() * this.REWARD_POOL.length);
    return this.REWARD_POOL[randomIndex];
  }

  /**
   * Award reward to user and store in stamp_rewards table
   */
  private async awardReward(
    userId: string,
    rewardType: RewardType,
    amount: number,
  ): Promise<{ name: string; type: string; amount: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let rewardName = '';

    // Apply reward based on type
    switch (rewardType) {
      case RewardType.GEMS:
        user.gem = (user.gem || 0) + amount;
        await this.userRepository.save(user);
        // Record gem transaction
        await this.gemTransactionsService.recordTransaction(
          user,
          amount,
          'Daily stamp reward (7 stamps)',
          JSON.stringify({ source: 'stamp_reward', stampCount: this.MAX_STAMPS }),
        );
        rewardName = 'Gems';
        break;
      case RewardType.BACKFLIP:
        await this.userItemsService.addItem(
          userId,
          UserItemType.BACKFLIP,
          amount,
          'Rewarded from stamp collection (7 stamps)',
        );
        rewardName = 'Backflip';
        break;
      case RewardType.CHOICE_PRIORITY:
        await this.userItemsService.addItem(
          userId,
          UserItemType.CHOICE_PRIORITY,
          amount,
          'Rewarded from stamp collection (7 stamps)',
        );
        rewardName = 'Choice Priority';
        break;
      case RewardType.REKALL_TOKEN_AIRDROP:
        await this.userItemsService.addItem(
          userId,
          UserItemType.REKALL_TOKEN_AIRDROP,
          amount,
          'Rewarded from stamp collection (7 stamps)',
        );
        rewardName = 'Rekall Token Airdrop';
        break;
    }

    // Store reward in stamp_rewards table
    const stampReward = this.stampRewardRepository.create({
      userId,
      rewardType,
      amount,
    });
    await this.stampRewardRepository.save(stampReward);

    return {
      name: rewardName,
      type: rewardType as string,
      amount,
    };
  }

  /**
   * Get reward history for user
   */
  async getRewardHistory(userId: string): Promise<Array<{
    id: string;
    rewardType: RewardType;
    amount: number;
    createdAt: Date;
    rewardName: string;
  }>> {
    const rewards = await this.stampRewardRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return rewards.map(reward => {
      let rewardName = '';
      switch (reward.rewardType) {
        case RewardType.GEMS:
          rewardName = 'Gems';
          break;
        case RewardType.BACKFLIP:
          rewardName = 'Backflip';
          break;
        case RewardType.CHOICE_PRIORITY:
          rewardName = 'Choice Priority';
          break;
        case RewardType.REKALL_TOKEN_AIRDROP:
          rewardName = 'Rekall Token Airdrop';
          break;
      }

      return {
        id: reward.id,
        rewardType: reward.rewardType,
        amount: reward.amount,
        createdAt: reward.createdAt,
        rewardName,
      };
    });
  }

  /**
   * Setup user stamps to 6 for testing (Admin/Manager only)
   * Sets user to 6 stamps and makes them eligible to claim the 7th
   */
  async setupStampsTo6(targetUserId: string, currentUserRole: UserRole): Promise<{
    success: boolean;
    message: string;
    stampsCollected: number;
  }> {
    // Check if current user is admin or manager
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only admins and managers can set stamps for testing');
    }

    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const yesterdayGMT8 = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Yesterday
    const sixDaysAgo = new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000));

    // Set to 6 stamps and make eligible (yesterday in GMT+8)
    // Logic: If lastStampClaimDate is yesterday (GMT+8), user can claim today
    user.stampsCollected = 6;
    user.lastStampClaimDate = yesterdayGMT8; // Set to yesterday so today is a different day
    user.lastLoginAt = yesterdayGMT8; // Keep for reference
    user.firstStampClaimDate = sixDaysAgo;

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'User stamps set to 6. User is now eligible to claim the 7th stamp.',
      stampsCollected: user.stampsCollected,
    };
  }
}
