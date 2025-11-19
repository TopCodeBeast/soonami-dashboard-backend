import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { GemTransactionsService } from './gem-transactions.service';
import { GemTransactionType } from './entities/gem-transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { GemTransaction } from './entities/gem-transaction.entity';
export declare class UsersService {
    private readonly userRepository;
    private readonly walletRepository;
    private readonly gemTransactionRepository;
    private readonly gemTransactionsService;
    constructor(userRepository: Repository<User>, walletRepository: Repository<Wallet>, gemTransactionRepository: Repository<GemTransaction>, gemTransactionsService: GemTransactionsService);
    create(createUserDto: CreateUserDto, currentUserRole: UserRole): Promise<{
        id: string;
        email: string;
        name: string;
        gem: number;
        role: UserRole;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        updatedAt: Date;
        wallets: Wallet[];
    }>;
    findAll(currentUserRole: UserRole): Promise<User[]>;
    findOne(id: string, currentUserId: string, currentUserRole: UserRole): Promise<User>;
    update(id: string, updateUserDto: UpdateUserDto, currentUserId: string, currentUserRole: UserRole): Promise<User>;
    remove(id: string, currentUserId: string, currentUserRole: UserRole): Promise<{
        message: string;
    }>;
    getProfile(currentUserId: string): Promise<User>;
    getTopGemHolders(limit: number, currentUserRole: UserRole): Promise<{
        id: string;
        email: string;
        name: string;
        gem: number;
        password: string;
        role: UserRole;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        updatedAt: Date;
        wallets: Wallet[];
        rank: number;
    }[]>;
    getTopGemSpenders(limit: number, currentUserRole: UserRole): Promise<{
        userId: string;
        totalSpent: number;
        user: Pick<User, "id" | "name" | "email" | "gem">;
        rank: number;
    }[]>;
    getMostUsedItems(limit: number, currentUserRole: UserRole): Promise<{
        itemId: string;
        itemName: string;
        purchaseCount: number;
        totalGemsSpent: number;
    }[]>;
    getGemTransactions(options: {
        userId?: string;
        type?: GemTransactionType;
        limit?: number;
    }, currentUserId: string, currentUserRole: UserRole): Promise<GemTransaction[]>;
    getRecentActivities(limit: number, currentUserRole: UserRole): Promise<{
        type: "user_registered" | "user_login" | "wallet_added" | "gem_transaction";
        action: string;
        user: {
            id: string;
            email: string;
            name?: string;
        };
        timestamp: Date;
    }[]>;
    getLoginActivity(days: number, currentUserRole: UserRole): Promise<{
        date: string;
        count: number;
    }[]>;
    getRegistrationActivity(days: number, currentUserRole: UserRole): Promise<{
        date: string;
        count: number;
    }[]>;
    getDashboardStats(currentUserRole: UserRole): Promise<{
        totalUsers: number;
        activeUsers: number;
        newUsersToday: number;
        loginsToday: number;
    }>;
}
