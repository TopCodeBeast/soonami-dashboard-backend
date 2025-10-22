import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';
export declare class WalletsService {
    private walletRepository;
    private userRepository;
    constructor(walletRepository: Repository<Wallet>, userRepository: Repository<User>);
    create(createWalletDto: CreateWalletDto, userId: string, currentUserRole: UserRole): Promise<Wallet>;
    findAll(userId: string, currentUserId: string, currentUserRole: UserRole): Promise<Wallet[]>;
    findOne(id: string, currentUserId: string, currentUserRole: UserRole): Promise<Wallet>;
    update(id: string, updateWalletDto: UpdateWalletDto, currentUserId: string, currentUserRole: UserRole): Promise<Wallet>;
    remove(id: string, currentUserId: string, currentUserRole: UserRole): Promise<{
        message: string;
    }>;
}
