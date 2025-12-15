import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserItem, UserItemType } from './entities/user-item.entity';

@Injectable()
export class UserItemsService {
  constructor(
    @InjectRepository(UserItem)
    private readonly userItemRepository: Repository<UserItem>,
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
    return this.userItemRepository.find({ where: { userId } });
  }

  async getUserItem(userId: string, itemType: UserItemType): Promise<UserItem | null> {
    return this.userItemRepository.findOne({ where: { userId, itemType } });
  }

  async getItemAmount(userId: string, itemType: UserItemType): Promise<number> {
    const item = await this.getUserItem(userId, itemType);
    return item ? item.amount : 0;
  }
}

