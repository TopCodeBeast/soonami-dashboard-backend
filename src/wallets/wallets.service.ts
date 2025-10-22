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

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createWalletDto: CreateWalletDto, userId: string, currentUserRole: UserRole) {
    // Users can only add wallets to their own account, admins can add to any account
    if (currentUserRole !== UserRole.ADMIN) {
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
    // Users can only view their own wallets, admins can view any user's wallets
    if (currentUserRole !== UserRole.ADMIN && currentUserId !== userId) {
      throw new ForbiddenException('You can only view your own wallets');
    }

    return this.walletRepository.find({
      where: { userId },
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

    // Users can only view their own wallets, admins can view any wallet
    if (currentUserRole !== UserRole.ADMIN && wallet.userId !== currentUserId) {
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

    // Users can only update their own wallets, admins can update any wallet
    if (currentUserRole !== UserRole.ADMIN && wallet.userId !== currentUserId) {
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

    // Users can only delete their own wallets, admins can delete any wallet
    if (currentUserRole !== UserRole.ADMIN && wallet.userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own wallets');
    }

    await this.walletRepository.remove(wallet);
    return { message: 'Wallet deleted successfully' };
  }
}
