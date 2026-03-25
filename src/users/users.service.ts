import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, MoreThanOrEqual, LessThan } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { RoleHierarchy } from './utils/role-hierarchy';
import { ManagerWhitelist } from './utils/manager-whitelist';
import { GemTransactionsService } from './gem-transactions.service';
import { GemTransactionType } from './entities/gem-transaction.entity';
import { getPixelStreamConfig } from './utils/pixel-stream-assignment';
// Wallet import - table may not exist, queries are wrapped in try-catch
import { Wallet } from '../wallets/entities/wallet.entity';
import { GemTransaction } from './entities/gem-transaction.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(GemTransaction)
    private readonly gemTransactionRepository: Repository<GemTransaction>,
    private readonly gemTransactionsService: GemTransactionsService,
  ) {}

  private async ensurePixelStreamAssignment(user: User): Promise<User> {
    const needsSocketPort = user.socketPort == null;
    const needsPixelStreamUrl = !user.pixelStreamUrl;
    if (!needsSocketPort && !needsPixelStreamUrl) {
      return user;
    }

    const { ports, urls } = getPixelStreamConfig();
    if (ports.length === 0 || urls.length === 0) {
      return user;
    }

    const usedRows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.socketPort', 'socketPort')
      .where('user.socketPort IS NOT NULL')
      .andWhere('user.id != :id', { id: user.id })
      .getRawMany<{ socketPort: string | number }>();

    const usedPorts = new Set(usedRows.map((row) => Number(row.socketPort)).filter((value) => Number.isFinite(value)));

    const resolvedSocketPort =
      user.socketPort != null ? user.socketPort : ports.find((port) => !usedPorts.has(port)) ?? null;

    if (resolvedSocketPort == null) {
      // No free unique socket port available in configured pool.
      return user;
    }

    const configuredIndex = ports.indexOf(resolvedSocketPort);
    const resolvedPixelStreamUrl =
      user.pixelStreamUrl && user.pixelStreamUrl.trim().length > 0
        ? user.pixelStreamUrl
        : configuredIndex >= 0
          ? urls[configuredIndex]
          : urls[0];

    const updatedFields: Partial<User> = {};
    if (needsSocketPort) {
      updatedFields.socketPort = resolvedSocketPort;
      user.socketPort = resolvedSocketPort;
    }
    if (needsPixelStreamUrl && resolvedPixelStreamUrl) {
      updatedFields.pixelStreamUrl = resolvedPixelStreamUrl;
      user.pixelStreamUrl = resolvedPixelStreamUrl;
    }

    if (Object.keys(updatedFields).length > 0) {
      try {
        await this.userRepository.update(user.id, updatedFields);
      } catch (error: any) {
        // Another request may have consumed the same free port concurrently.
        if (error?.code !== '23505') {
          throw error;
        }
      }
    }
    return user;
  }

  private mapDatabaseError(error: any): never {
    if (error?.code === '23505') {
      const detail = String(error?.detail || '');
      if (detail.includes('socketPort')) {
        throw new ConflictException('Socket port is already assigned to another user');
      }
      if (detail.includes('email')) {
        throw new ConflictException('Email already exists');
      }
      throw new ConflictException('Duplicate value violates a unique constraint');
    }
    throw error;
  }

  private async skipDuplicateManualStreamFields<
    T extends { socketPort?: number; pixelStreamUrl?: string }
  >(
    payload: T,
    excludeUserId?: string,
  ): Promise<T> {
    const sanitized = { ...payload };

    const hasSocketPort =
      Object.prototype.hasOwnProperty.call(payload, 'socketPort') &&
      typeof payload.socketPort === 'number' &&
      Number.isFinite(payload.socketPort);
    if (hasSocketPort) {
      const portDuplicateQuery = this.userRepository
        .createQueryBuilder('user')
        .select('user.id', 'id')
        .where('user.socketPort = :socketPort', { socketPort: payload.socketPort });
      if (excludeUserId) {
        portDuplicateQuery.andWhere('user.id != :excludeUserId', { excludeUserId });
      }
      const duplicatePortOwner = await portDuplicateQuery.getRawOne<{ id: string }>();

      if (duplicatePortOwner) {
        delete sanitized.socketPort;
      }
    }

    const hasPixelStreamUrl =
      Object.prototype.hasOwnProperty.call(payload, 'pixelStreamUrl') &&
      typeof payload.pixelStreamUrl === 'string';
    if (hasPixelStreamUrl) {
      const normalizedPixelStreamUrl = payload.pixelStreamUrl!.trim();
      if (normalizedPixelStreamUrl.length === 0) {
        delete sanitized.pixelStreamUrl;
      } else {
        const urlDuplicateQuery = this.userRepository
          .createQueryBuilder('user')
          .select('user.id', 'id')
          .where('user.pixelStreamUrl = :pixelStreamUrl', {
            pixelStreamUrl: normalizedPixelStreamUrl,
          });
        if (excludeUserId) {
          urlDuplicateQuery.andWhere('user.id != :excludeUserId', { excludeUserId });
        }
        const duplicateUrlOwner = await urlDuplicateQuery.getRawOne<{ id: string }>();

        if (duplicateUrlOwner) {
          delete sanitized.pixelStreamUrl;
        } else {
          sanitized.pixelStreamUrl = normalizedPixelStreamUrl as T['pixelStreamUrl'];
        }
      }
    }

    return sanitized;
  }

  async create(createUserDto: CreateUserDto, currentUserRole: UserRole, currentUserEmail: string) {
    // Only managers and admins can create users
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can create users');
    }

    // Check whitelist if trying to create a manager
    if (createUserDto.role === UserRole.MANAGER && !ManagerWhitelist.isWhitelisted(currentUserEmail)) {
      throw new ForbiddenException('Only whitelisted users can create managers');
    }

    // Check if current user can assign the requested role
    if (createUserDto.role && !RoleHierarchy.canManageRole(currentUserRole, createUserDto.role)) {
      throw new ForbiddenException(`You cannot assign the role: ${createUserDto.role}`);
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const createPayload = await this.skipDuplicateManualStreamFields(createUserDto);
    const user = this.userRepository.create({
      ...createPayload,
    });

    let savedUser: User;
    try {
      savedUser = await this.userRepository.save(user);
    } catch (error: any) {
      this.mapDatabaseError(error);
    }
    await this.ensurePixelStreamAssignment(savedUser);
    return savedUser;
  }

  async findAll(currentUserRole: UserRole) {
    // Only managers and admins can view all users
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view all users');
    }

    const users = await this.userRepository.find({
      relations: ['wallets'],
      select: [
        'id',
        'name',
        'email',
        'role',
        'isActive',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
        'gem',
        'socketPort',
        'pixelStreamUrl',
        'gameSaveFile',
      ],
    });
    
    const usersWithAssignments = await Promise.all(
      users.map(async (user) => this.ensurePixelStreamAssignment(user)),
    );

    // Return users with wallets (or empty array if none)
    return usersWithAssignments.map(user => ({
      ...user,
      wallets: user.wallets || [],
    }));
  }

  async findOne(id: string, currentUserId: string, currentUserRole: UserRole) {
    // Users can only view their own profile, managers and admins can view any user
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole) && currentUserId !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['wallets'],
      select: [
        'id',
        'name',
        'email',
        'role',
        'isActive',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
        'gem',
        'socketPort',
        'pixelStreamUrl',
        'gameSaveFile',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.ensurePixelStreamAssignment(user);

    // Return user with wallets (or empty array if none)
    return {
      ...user,
      wallets: user.wallets || [],
    };
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'name',
        'email',
        'role',
        'isActive',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
        'gem',
        'socketPort',
        'pixelStreamUrl',
        'gameSaveFile',
      ],
    });
  }

  async getGameSave(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'gameSaveFile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.gameSaveFile ?? null;
  }

  async saveGameSave(userId: string, saveData: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, { gameSaveFile: saveData });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
    currentUserRole: UserRole,
    currentUserEmail: string,
  ) {
    // Users can only update their own profile (except role), managers and admins can update any user
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole) && currentUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Get the target user to check their current role
    const targetUser = await this.userRepository.findOne({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check whitelist if trying to assign manager role or updating an existing manager
    // BUT skip this check if:
    // 1. User is updating themselves (currentUserId === id)
    // 2. Only gem-related fields are being updated (no role change)
    const isAssigningManager = updateUserDto.role === UserRole.MANAGER;
    const isUpdatingManager = targetUser.role === UserRole.MANAGER;
    const ALLOWED_SELF_UPDATE_KEYS = [
      'gem', 'gemTransactionReason', 'gemTransactionMetadata',
      'stabilitySignalRemainingMinutes', 'stabilitySignalFullCapacityMinutes',
      'stabilitySignalPausedAt', 'stabilitySignalLastActivityAt',
    ];
    const isOnlyUpdatingGemsOrStability = Object.keys(updateUserDto).every(key =>
      ALLOWED_SELF_UPDATE_KEYS.includes(key),
    );
    const isSelfUpdate = currentUserId === id;
    
    // Only enforce whitelist check if:
    // - Assigning manager role, OR
    // - Updating a manager AND it's not a self-update AND it's not just gem updates
    if (isAssigningManager || (isUpdatingManager && !isSelfUpdate && !isOnlyUpdatingGemsOrStability)) {
      if (!ManagerWhitelist.isWhitelisted(currentUserEmail)) {
        throw new ForbiddenException('Only whitelisted users can manage managers');
      }
    }

    // Check if current user can change roles
    if (updateUserDto.role) {
      if (!RoleHierarchy.canManageRole(currentUserRole, updateUserDto.role)) {
        throw new ForbiddenException(`You cannot assign the role: ${updateUserDto.role}`);
      }
      
      // Prevent users from changing their own role to a higher level
      if (currentUserId === id && !RoleHierarchy.canManageRole(currentUserRole, updateUserDto.role)) {
        throw new ForbiddenException('You cannot change your own role');
      }
    }

    let gemChange: number | null = null;
    let gemReason: string | undefined;
    let gemMetadata: string | undefined;

    if (Object.prototype.hasOwnProperty.call(updateUserDto, 'gem') && typeof updateUserDto.gem === 'number') {
      gemChange = updateUserDto.gem - (targetUser.gem || 0);
      gemReason = updateUserDto.gemTransactionReason;
      gemMetadata = updateUserDto.gemTransactionMetadata;
    }

    // Extract transaction fields before updating user (they're not part of User entity)
    const { gemTransactionReason, gemTransactionMetadata, ...userUpdateDataRaw } = updateUserDto;
    const userUpdateData = await this.skipDuplicateManualStreamFields(userUpdateDataRaw, id);
    
    try {
      await this.userRepository.update(id, userUpdateData);
    } catch (error: any) {
      this.mapDatabaseError(error);
    }

    if (gemChange && gemChange !== 0) {
      // Reload user to get updated gem value
      const updatedUser = await this.userRepository.findOne({ where: { id } });
      if (updatedUser) {
        try {
          await this.gemTransactionsService.recordTransaction(updatedUser, gemChange, gemReason, gemMetadata);
        } catch (error) {
          // Log error but don't fail the update if transaction recording fails
          console.error('Failed to record gem transaction:', error);
        }
      }
    }

    return this.findOne(id, currentUserId, currentUserRole);
  }

  async remove(id: string, currentUserId: string, currentUserRole: UserRole, currentUserEmail: string) {
    // Only managers and admins can delete users
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can delete users');
    }

    // Prevent self-deletion
    if (currentUserId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check whitelist if trying to delete a manager
    if (user.role === UserRole.MANAGER && !ManagerWhitelist.isWhitelisted(currentUserEmail)) {
      throw new ForbiddenException('Only whitelisted users can delete managers');
    }

    // Check if current user can delete this user based on role hierarchy
    if (!RoleHierarchy.canManageRole(currentUserRole, user.role)) {
      throw new ForbiddenException(`You cannot delete users with role: ${user.role}`);
    }

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async getProfile(currentUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: currentUserId },
      // Don't load wallets relation if table doesn't exist - make it optional
      // relations: ['wallets'],
      // Include all fields including stampsCollected
      select: [
        'id',
        'name',
        'email',
        'gem',
        'role',
        'isActive',
        'socketPort',
        'pixelStreamUrl',
        'lastLoginAt',
        'stampsCollected',
        'lastStampClaimDate',
        'firstStampClaimDate',
        'stabilitySignalRemainingMinutes',
        'stabilitySignalFullCapacityMinutes',
        'stabilitySignalPausedAt',
        'stabilitySignalLastActivityAt',
        'socketPort',
        'pixelStreamUrl',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.ensurePixelStreamAssignment(user);

    console.log(`✅ Profile fetched for user ${currentUserId} with ${user.stampsCollected || 0} stamps`);
    
    // Load wallets relation and stability signal fields
    const userWithWallets = await this.userRepository.findOne({
      where: { id: currentUserId },
      relations: ['wallets'],
      select: [
        'id',
        'name',
        'email',
        'gem',
        'role',
        'isActive',
        'socketPort',
        'pixelStreamUrl',
        'lastLoginAt',
        'stampsCollected',
        'lastStampClaimDate',
        'firstStampClaimDate',
        'stabilitySignalRemainingMinutes',
        'stabilitySignalFullCapacityMinutes',
        'stabilitySignalPausedAt',
        'stabilitySignalLastActivityAt',
        'socketPort',
        'pixelStreamUrl',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!userWithWallets) {
      throw new NotFoundException('User not found');
    }
    await this.ensurePixelStreamAssignment(userWithWallets);

    // Return user with wallets and stability signal fields
    return {
      id: userWithWallets.id,
      name: userWithWallets.name,
      email: userWithWallets.email,
      gem: userWithWallets.gem,
      role: userWithWallets.role,
      isActive: userWithWallets.isActive,
      socketPort: userWithWallets.socketPort,
      pixelStreamUrl: userWithWallets.pixelStreamUrl,
      lastLoginAt: userWithWallets.lastLoginAt,
      stampsCollected: userWithWallets.stampsCollected,
      lastStampClaimDate: userWithWallets.lastStampClaimDate,
      firstStampClaimDate: userWithWallets.firstStampClaimDate,
      stabilitySignalRemainingMinutes: userWithWallets.stabilitySignalRemainingMinutes ?? 0,
      stabilitySignalFullCapacityMinutes: userWithWallets.stabilitySignalFullCapacityMinutes ?? 60,
      stabilitySignalPausedAt: userWithWallets.stabilitySignalPausedAt,
      stabilitySignalLastActivityAt: userWithWallets.stabilitySignalLastActivityAt,
      createdAt: userWithWallets.createdAt,
      updatedAt: userWithWallets.updatedAt,
      wallets: userWithWallets.wallets || [],
    };
  }

  async getGameSaveFile(currentUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: currentUserId },
      select: ['id', 'gameSaveFile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      jsonString: user.gameSaveFile || '',
    };
  }

  async updateGameSaveFile(currentUserId: string, jsonString: string) {
    const user = await this.userRepository.findOne({
      where: { id: currentUserId },
      select: ['id'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(currentUserId, {
      gameSaveFile: jsonString || '',
    });

    return {
      success: true,
      updated: true,
    };
  }

  async getTopGemHolders(limit = 10, currentUserRole: UserRole) {
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view gem leaderboards');
    }

    const users = await this.userRepository.find({
      select: ['id', 'name', 'email', 'gem', 'role'],
      order: { gem: 'DESC' },
      take: limit,
      where: { isActive: true },
    });

    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));
  }

  async getTopGemSpenders(limit = 10, currentUserRole: UserRole) {
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view gem spenders leaderboard');
    }

    const spenders = await this.gemTransactionsService.getTopSpenders(limit);
    return spenders.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  }

  async getMostUsedItems(limit = 10, currentUserRole: UserRole) {
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view most used items');
    }

    return await this.gemTransactionsService.getMostUsedItems(limit);
  }

  async getGemTransactions(options: {
    userId?: string;
    type?: GemTransactionType;
    limit?: number;
  }, currentUserId: string, currentUserRole: UserRole) {
    const params = { ...options };
    params.limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      params.userId = currentUserId;
    }

    return this.gemTransactionsService.getRecentTransactions(params);
  }

  async getRecentActivities(limit = 20, currentUserRole: UserRole) {
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view recent activities');
    }

    const activities: Array<{
      type: 'user_registered' | 'user_login' | 'wallet_added' | 'gem_transaction';
      action: string;
      user: { id: string; email: string; name?: string };
      timestamp: Date;
    }> = [];

    // Get recent user registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await this.userRepository.find({
      where: {
        createdAt: MoreThan(sevenDaysAgo),
      },
      select: ['id', 'email', 'name', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    recentUsers.forEach((user) => {
      activities.push({
        type: 'user_registered',
        action: 'New user registered',
        user: { id: user.id, email: user.email, name: user.name },
        timestamp: user.createdAt,
      });
    });

    // Get recent logins (last 7 days, excluding today's registrations)
    const recentLogins = await this.userRepository.find({
      where: {
        lastLoginAt: MoreThan(sevenDaysAgo),
      },
      select: ['id', 'email', 'name', 'lastLoginAt'],
      order: { lastLoginAt: 'DESC' },
      take: limit,
    });

    recentLogins.forEach((user) => {
      // Only add if it's not a same-day registration
      const isSameDayRegistration = recentUsers.some(
        (u) => u.id === user.id && 
        u.createdAt.toDateString() === user.lastLoginAt?.toDateString()
      );
      
      if (!isSameDayRegistration && user.lastLoginAt) {
        activities.push({
          type: 'user_login',
          action: 'User logged in',
          user: { id: user.id, email: user.email, name: user.name },
          timestamp: user.lastLoginAt,
        });
      }
    });

    // Get recent wallet additions (last 7 days)
    const recentWallets = await this.walletRepository.find({
      where: {
        createdAt: MoreThan(sevenDaysAgo),
      },
      relations: ['user'],
      select: {
        id: true,
        createdAt: true,
        user: {
          id: true,
          email: true,
          name: true,
        },
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    recentWallets.forEach((wallet) => {
      if (wallet.user) {
        activities.push({
          type: 'wallet_added',
          action: 'Wallet added',
          user: { id: wallet.user.id, email: wallet.user.email, name: wallet.user.name },
          timestamp: wallet.createdAt,
        });
      }
    });

    // Get recent gem transactions (last 7 days)
    const recentTransactions = await this.gemTransactionRepository.find({
      where: {
        createdAt: MoreThan(sevenDaysAgo),
      },
      relations: ['user'],
      select: {
        id: true,
        type: true,
        change: true,
        reason: true,
        createdAt: true,
        user: {
          id: true,
          email: true,
          name: true,
        },
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    recentTransactions.forEach((transaction) => {
      if (transaction.user) {
        const action = transaction.type === GemTransactionType.EARN
          ? `Gem purchase: +${Math.abs(transaction.change)} gems`
          : `Gem spent: -${Math.abs(transaction.change)} gems`;
        
        activities.push({
          type: 'gem_transaction',
          action: transaction.reason || action,
          user: { id: transaction.user.id, email: transaction.user.email, name: transaction.user.name },
          timestamp: transaction.createdAt,
        });
      }
    });

    // Sort all activities by timestamp (most recent first) and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return activities.slice(0, limit);
  }

  async getLoginActivity(days: number = 7, currentUserRole: UserRole) {
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view login activity');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get logins grouped by date
    const logins = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE_TRUNC('day', user.lastLoginAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.lastLoginAt >= :startDate', { startDate })
      .andWhere('user.lastLoginAt IS NOT NULL')
      .groupBy("DATE_TRUNC('day', user.lastLoginAt)")
      .orderBy("DATE_TRUNC('day', user.lastLoginAt)", 'ASC')
      .getRawMany<{ date: Date; count: string }>();

    // Generate all dates in the range and fill in missing dates with 0
    const activityMap = new Map<string, number>();
    const endDate = new Date();
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      activityMap.set(dateKey, 0);
    }

    // Fill in actual counts
    logins.forEach((login) => {
      const dateKey = new Date(login.date).toISOString().split('T')[0];
      activityMap.set(dateKey, parseInt(login.count, 10));
    });

    // Convert to array format
    return Array.from(activityMap.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRegistrationActivity(days: number = 7, currentUserRole: UserRole) {
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view registration activity');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get registrations grouped by date
    const registrations = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE_TRUNC('day', user.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', user.createdAt)")
      .orderBy("DATE_TRUNC('day', user.createdAt)", 'ASC')
      .getRawMany<{ date: Date; count: string }>();

    // Generate all dates in the range and fill in missing dates with 0
    const activityMap = new Map<string, number>();
    const endDate = new Date();
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      activityMap.set(dateKey, 0);
    }

    // Fill in actual counts
    registrations.forEach((registration) => {
      const dateKey = new Date(registration.date).toISOString().split('T')[0];
      activityMap.set(dateKey, parseInt(registration.count, 10));
    });

    // Convert to array format
    return Array.from(activityMap.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getDashboardStats(currentUserRole: UserRole) {
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view dashboard stats');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total Users - count all users
    const totalUsers = await this.userRepository.count();

    // Active Users - count users with isActive = true
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });

    // New Users Today - count users created today (between today 00:00:00 and tomorrow 00:00:00)
    const newUsersTodayQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :today', { today })
      .andWhere('user.createdAt < :tomorrow', { tomorrow })
      .getCount();

    // Logins Today - count users who logged in today (between today 00:00:00 and tomorrow 00:00:00)
    // Note: lastLoginAt can be null, so we need to check for that
    const loginsTodayQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt >= :today', { today })
      .andWhere('user.lastLoginAt < :tomorrow', { tomorrow })
      .andWhere('user.lastLoginAt IS NOT NULL')
      .getCount();

    const [newUsersToday, loginsToday] = await Promise.all([
      newUsersTodayQuery,
      loginsTodayQuery,
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      loginsToday,
    };
  }
}
