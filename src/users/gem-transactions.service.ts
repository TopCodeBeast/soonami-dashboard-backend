import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GemTransaction, GemTransactionType } from './entities/gem-transaction.entity';
import { User } from './entities/user.entity';

@Injectable()
export class GemTransactionsService {
  constructor(
    @InjectRepository(GemTransaction)
    private readonly gemTransactionRepository: Repository<GemTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async recordTransaction(
    user: User,
    change: number,
    reason?: string,
    metadata?: string,
  ): Promise<GemTransaction | null> {
    if (!user || !change) {
      return null;
    }

    const type = change >= 0 ? GemTransactionType.EARN : GemTransactionType.SPEND;

    const entry = this.gemTransactionRepository.create({
      user,
      userId: user.id,
      change,
      type,
      reason,
      metadata,
    });

    return this.gemTransactionRepository.save(entry);
  }

  async getRecentTransactions(
    options: {
      userId?: string;
      type?: GemTransactionType;
      limit?: number;
    } = {},
  ): Promise<GemTransaction[]> {
    const { userId, type, limit = 20 } = options;

    const qb = this.gemTransactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .orderBy('transaction.createdAt', 'DESC')
      .limit(limit);

    if (userId) {
      qb.andWhere('transaction.userId = :userId', { userId });
    }

    if (type) {
      qb.andWhere('transaction.type = :type', { type });
    }

    return qb.getMany();
  }

  async getTopSpenders(limit = 10): Promise<
    Array<{
      userId: string;
      totalSpent: number;
      user: Pick<User, 'id' | 'name' | 'email' | 'gem'>;
    }>
  > {
    const rows = await this.gemTransactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.userId', 'userId')
      .addSelect('SUM(ABS(transaction.change))', 'totalSpent')
      .where('transaction.type = :type', { type: GemTransactionType.SPEND })
      .groupBy('transaction.userId')
      .orderBy('SUM(ABS(transaction.change))', 'DESC')
      .limit(limit)
      .getRawMany<{ userId: string; totalSpent: string }>();

    if (!rows.length) {
      return [];
    }

    const userIds = rows.map((row) => row.userId);
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'name', 'email', 'gem'],
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows
      .map((row) => {
        const user = userMap.get(row.userId);
        if (!user) {
          return null;
        }
        return {
          userId: row.userId,
          totalSpent: Number(row.totalSpent) || 0,
          user,
        };
      })
      .filter(Boolean) as Array<{
      userId: string;
      totalSpent: number;
      user: Pick<User, 'id' | 'name' | 'email' | 'gem'>;
    }>;
  }

  async getMostUsedItems(limit = 10): Promise<
    Array<{
      itemId: string;
      itemName: string;
      purchaseCount: number;
      totalGemsSpent: number;
    }>
  > {
    // Get all SPEND transactions with metadata
    const transactions = await this.gemTransactionRepository.find({
      where: { type: GemTransactionType.SPEND },
      select: ['metadata', 'change'],
    });

    // Parse metadata and count items
    const itemStats = new Map<
      string,
      { itemId: string; itemName: string; count: number; totalGems: number }
    >();

    for (const transaction of transactions) {
      if (!transaction.metadata) continue;

      try {
        const metadata = JSON.parse(transaction.metadata);
        const itemId = metadata.item_id;

        if (itemId) {
          const itemName = metadata.item_name || itemId;
          const gemsSpent = Math.abs(transaction.change);

          const existing = itemStats.get(itemId);
          if (existing) {
            existing.count += 1;
            existing.totalGems += gemsSpent;
          } else {
            itemStats.set(itemId, {
              itemId,
              itemName,
              count: 1,
              totalGems: gemsSpent,
            });
          }
        }
      } catch (error) {
        // Skip invalid JSON metadata
        continue;
      }
    }

    // Convert to array and sort by purchase count
    const result = Array.from(itemStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        purchaseCount: item.count,
        totalGemsSpent: item.totalGems,
      }));

    return result;
  }
}

