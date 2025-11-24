import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        gem: number;
        role: import("./entities/user.entity").UserRole;
        isActive: boolean;
        lastLoginAt: Date;
        lastDailyRewardClaimDate: Date;
        createdAt: Date;
        updatedAt: Date;
        wallets: import("../wallets/entities/wallet.entity").Wallet[];
    }>;
    findAll(req: any): Promise<import("./entities/user.entity").User[]>;
    getProfile(req: any): Promise<import("./entities/user.entity").User>;
    findOne(id: string, req: any): Promise<import("./entities/user.entity").User>;
    update(id: string, updateUserDto: UpdateUserDto, req: any): Promise<import("./entities/user.entity").User>;
    getTopGemHolders(limit: number, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        gem: number;
        password: string;
        role: import("./entities/user.entity").UserRole;
        isActive: boolean;
        lastLoginAt: Date;
        lastDailyRewardClaimDate: Date;
        createdAt: Date;
        updatedAt: Date;
        wallets: import("../wallets/entities/wallet.entity").Wallet[];
        rank: number;
    }[]>;
    getTopGemSpenders(limit: number, req: any): Promise<{
        userId: string;
        totalSpent: number;
        user: Pick<import("./entities/user.entity").User, "id" | "name" | "email" | "gem">;
        rank: number;
    }[]>;
    getMostUsedItems(limit: number, req: any): Promise<{
        itemId: string;
        itemName: string;
        purchaseCount: number;
        totalGemsSpent: number;
    }[]>;
    getGemTransactions(userId: string, type: string, limit: number, req: any): Promise<import("./entities/gem-transaction.entity").GemTransaction[]>;
    getRecentActivities(limit: number, req: any): Promise<{
        type: "user_registered" | "user_login" | "wallet_added" | "gem_transaction";
        action: string;
        user: {
            id: string;
            email: string;
            name?: string;
        };
        timestamp: Date;
    }[]>;
    getLoginActivity(days: number, req: any): Promise<{
        date: string;
        count: number;
    }[]>;
    getRegistrationActivity(days: number, req: any): Promise<{
        date: string;
        count: number;
    }[]>;
    getDashboardStats(req: any): Promise<{
        totalUsers: number;
        activeUsers: number;
        newUsersToday: number;
        loginsToday: number;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
