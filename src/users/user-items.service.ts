import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserItem, UserItemType } from './entities/user-item.entity';
import { StampReward, RewardType } from '../stamps/entities/stamp-reward.entity';

@Injectable()
export class UserItemsService {
  constructor(
    @InjectRepository(UserItem)
    private readonly userItemRepository: Repository<UserItem>,
    @InjectRepository(StampReward)
    private readonly stampRewardRepository: Repository<StampReward>,
  ) {}

  async addItem(
    userId: string,
    itemType: UserItemType,
    amount: number,
    description?: string,
  ): Promise<UserItem> {
    let userItem = await this.userItemRepository.findOne({
      where: { userId, itemType },
    });

    if (userItem) {
      userItem.amount += amount;
      if (description) userItem.description = description;
      
      // If amount reaches 0 or below, delete the item
      if (userItem.amount <= 0) {
        await this.userItemRepository.remove(userItem);
        // Return a new item with 0 amount for consistency
        return this.userItemRepository.create({
          userId,
          itemType,
          amount: 0,
          description,
        });
      }
    } else {
      // If trying to subtract from non-existent item, return null or create with 0
      if (amount < 0) {
        return this.userItemRepository.create({
          userId,
          itemType,
          amount: 0,
          description,
        });
      }
      userItem = this.userItemRepository.create({
        userId,
        itemType,
        amount,
        description,
      });
    }
    return this.userItemRepository.save(userItem);
  }

  async getUserItems(userId: string): Promise<UserItem[]> {
    // Read from user_items table (primary source of truth for user-owned items)
    const userItems = await this.userItemRepository.find({ 
      where: { userId },
    });
    
    console.log(`🔍 [USER_ITEMS] Found ${userItems.length} items in user_items table for user ${userId}`);
    
    // Filter out items with amount <= 0 and log details
    const validItems = userItems.filter(item => item.amount > 0);
    console.log(`🔍 [USER_ITEMS] Valid items (amount > 0): ${validItems.length}`);
    console.log(`🔍 [USER_ITEMS] Items details:`, validItems.map(i => ({ 
      id: i.id, 
      itemType: i.itemType, 
      amount: i.amount,
      description: i.description 
    })));
    
    // Also check stamp_rewards table as a fallback/supplement
    const stampRewards = await this.stampRewardRepository.find({ 
      where: { userId },
    });
    
    console.log(`🔍 [USER_ITEMS] Found ${stampRewards.length} rewards in stamp_rewards table for user ${userId}`);
    
    // If we have items from user_items, return them directly
    if (validItems.length > 0) {
      console.log(`🔍 [USER_ITEMS] Returning ${validItems.length} items from user_items table`);
      return validItems;
    }
    
    // Fallback: Aggregate stamp_rewards by rewardType (excluding gems) if user_items is empty
    const rewardAggregates = new Map<RewardType, number>();
    for (const reward of stampRewards) {
      if (reward.rewardType !== RewardType.GEMS) {
        const currentAmount = rewardAggregates.get(reward.rewardType) || 0;
        rewardAggregates.set(reward.rewardType, currentAmount + reward.amount);
      }
    }
    
    console.log(`🔍 [USER_ITEMS] Aggregated rewards from stamp_rewards:`, Array.from(rewardAggregates.entries()).map(([type, amount]) => ({ rewardType: type, amount })));
    
    // Map RewardType (from stamp_rewards) to UserItemType (for API response)
    // RewardType enum values: 'backflip', 'choice_priority', 'rekall_token_airdrop'
    // UserItemType enum values: 'backflip', 'choicePriority', 'rekallTokenAirdrop'
    const rewardTypeToItemType: Record<RewardType, UserItemType | null> = {
      [RewardType.BACKFLIP]: UserItemType.BACKFLIP,
      [RewardType.CHOICE_PRIORITY]: UserItemType.CHOICE_PRIORITY,
      [RewardType.REKALL_TOKEN_AIRDROP]: UserItemType.REKALL_TOKEN_AIRDROP,
      [RewardType.GEMS]: null, // Gems are handled separately, not as items
    };
    
    // Convert aggregated rewards to UserItem[] format for API response
    const result: UserItem[] = [];
    for (const [rewardType, amount] of rewardAggregates.entries()) {
      const itemType = rewardTypeToItemType[rewardType];
      if (itemType && amount > 0) {
        // Create a pseudo-UserItem object (we don't need to save it, just return it)
        const item = this.userItemRepository.create({
          userId,
          itemType,
          amount,
          description: 'Rewarded from stamp collection',
        });
        result.push(item);
      }
    }
    
    console.log(`🔍 [USER_ITEMS] Returning ${result.length} items from stamp_rewards (fallback):`, result.map(i => ({ itemType: i.itemType, amount: i.amount })));
    return result;
  }

  async getUserItem(userId: string, itemType: UserItemType): Promise<UserItem | null> {
    return this.userItemRepository.findOne({ where: { userId, itemType } });
  }

  async getItemAmount(userId: string, itemType: UserItemType): Promise<number> {
    const item = await this.getUserItem(userId, itemType);
    return item ? item.amount : 0;
  }

  /**
   * Save item usage history in stamp_rewards table
   * Negative amount indicates item was used (spent)
   */
  async saveItemUsageHistory(
    userId: string,
    itemType: UserItemType,
    amount: number, // Should be negative (e.g., -1)
  ): Promise<StampReward> {
    // Map UserItemType to RewardType
    const itemTypeToRewardType: Record<UserItemType, RewardType> = {
      [UserItemType.BACKFLIP]: RewardType.BACKFLIP,
      [UserItemType.CHOICE_PRIORITY]: RewardType.CHOICE_PRIORITY,
      [UserItemType.REKALL_TOKEN_AIRDROP]: RewardType.REKALL_TOKEN_AIRDROP,
    };

    const rewardType = itemTypeToRewardType[itemType];
    if (!rewardType) {
      throw new Error(`Invalid item type for history: ${itemType}`);
    }

    // Create a stamp_reward record with negative amount to indicate usage
    const usageHistory = this.stampRewardRepository.create({
      userId,
      rewardType,
      amount, // Negative amount (e.g., -1)
    });

    return this.stampRewardRepository.save(usageHistory);
  }
}

