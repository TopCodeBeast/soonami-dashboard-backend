import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { RoleHierarchy } from './utils/role-hierarchy';
import { GemTransactionsService } from './gem-transactions.service';
import { GemTransactionType } from './entities/gem-transaction.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly gemTransactionsService: GemTransactionsService,
  ) {}

  async create(createUserDto: CreateUserDto, currentUserRole: UserRole) {
    // Only managers and admins can create users
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can create users');
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

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      parseInt(process.env.BCRYPT_ROUNDS) || 12,
    );

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }

  async findAll(currentUserRole: UserRole) {
    // Only managers and admins can view all users
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      throw new ForbiddenException('Only managers and admins can view all users');
    }

    const users = await this.userRepository.find({
      relations: ['wallets'],
      select: ['id', 'name', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt', 'gem'],
    });

    return users;
  }

  async findOne(id: string, currentUserId: string, currentUserRole: UserRole) {
    // Users can only view their own profile, managers and admins can view any user
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole) && currentUserId !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['wallets'],
      select: ['id', 'name', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt', 'gem'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
    currentUserRole: UserRole,
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

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        parseInt(process.env.BCRYPT_ROUNDS) || 12,
      );
    }

    let gemChange: number | null = null;
    let gemReason: string | undefined;
    let gemMetadata: string | undefined;

    if (Object.prototype.hasOwnProperty.call(updateUserDto, 'gem') && typeof updateUserDto.gem === 'number') {
      gemChange = updateUserDto.gem - (targetUser.gem || 0);
      gemReason = (updateUserDto as any).gemTransactionReason;
      gemMetadata = (updateUserDto as any).gemTransactionMetadata;
    }

    await this.userRepository.update(id, updateUserDto);

    if (gemChange && gemChange !== 0) {
      if (typeof updateUserDto.gem === 'number') {
        targetUser.gem = updateUserDto.gem;
      }
      await this.gemTransactionsService.recordTransaction(targetUser, gemChange, gemReason, gemMetadata);
    }

    return this.findOne(id, currentUserId, currentUserRole);
  }

  async remove(id: string, currentUserId: string, currentUserRole: UserRole) {
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
      relations: ['wallets'],
      select: ['id', 'name', 'email', 'gem', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log(`✅ Profile fetched for user ${currentUserId} with ${user.wallets?.length || 0} wallets`);
    return user;
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
}
