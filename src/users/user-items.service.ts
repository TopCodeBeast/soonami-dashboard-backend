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
    } else {
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

