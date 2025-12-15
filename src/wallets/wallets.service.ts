import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';
import { RoleHierarchy } from '../users/utils/role-hierarchy';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createWalletDto: CreateWalletDto, userId: string, currentUserRole: UserRole) {
    // Users can only add wallets to their own account, managers and admins can add to any account
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole)) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    // Check if wallet address already exists
    const existingWallet = await this.walletRepository.findOne({
      where: { address: createWalletDto.address },
    });

    if (existingWallet) {
      throw new ConflictException('Wallet address already exists');
    }

    const wallet = this.walletRepository.create({
      ...createWalletDto,
      userId,
    });

    return this.walletRepository.save(wallet);
  }

  async findAll(userId: string, currentUserId: string, currentUserRole: UserRole) {
    // Users can only view their own wallets, managers and admins can view any user's wallets
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole) && currentUserId !== userId) {
      throw new ForbiddenException('You can only view your own wallets');
    }

    return await this.walletRepository.find({
      where: { userId },
      relations: ['user'],
      select: {
        id: true,
        address: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          id: true,
          email: true,
          name: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, currentUserId: string, currentUserRole: UserRole) {
    const wallet = await this.walletRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Users can only view their own wallets, managers and admins can view any wallet
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole) && wallet.userId !== currentUserId) {
      throw new ForbiddenException('You can only view your own wallets');
    }

    return wallet;
  }

  async update(
    id: string,
    updateWalletDto: UpdateWalletDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ) {
    const wallet = await this.walletRepository.findOne({
      where: { id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Users can only update their own wallets, managers and admins can update any wallet
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole) && wallet.userId !== currentUserId) {
      throw new ForbiddenException('You can only update your own wallets');
    }

    await this.walletRepository.update(id, updateWalletDto);
    return this.findOne(id, currentUserId, currentUserRole);
  }

  async remove(id: string, currentUserId: string, currentUserRole: UserRole) {
    const wallet = await this.walletRepository.findOne({
      where: { id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Users can only delete their own wallets, managers and admins can delete any wallet
    if (!RoleHierarchy.canAccessAdminFeatures(currentUserRole) && wallet.userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own wallets');
    }

    await this.walletRepository.remove(wallet);
    return { message: 'Wallet deleted successfully' };
  }
}
