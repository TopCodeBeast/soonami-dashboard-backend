import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { GemTransactionsService } from './gem-transactions.service';
import { GemTransactionType } from './entities/gem-transaction.entity';
export declare class UsersService {
    private readonly userRepository;
    private readonly gemTransactionsService;
    constructor(userRepository: Repository<User>, gemTransactionsService: GemTransactionsService);
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
        wallets: import("../wallets/entities/wallet.entity").Wallet[];
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
        wallets: import("../wallets/entities/wallet.entity").Wallet[];
        rank: number;
    }[]>;
    getTopGemSpenders(limit: number, currentUserRole: UserRole): Promise<{
        userId: string;
        totalSpent: number;
        user: Pick<User, "id" | "name" | "email" | "gem">;
        rank: number;
    }[]>;
    getGemTransactions(options: {
        userId?: string;
        type?: GemTransactionType;
        limit?: number;
    }, currentUserId: string, currentUserRole: UserRole): Promise<import("./entities/gem-transaction.entity").GemTransaction[]>;
}
