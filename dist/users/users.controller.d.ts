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
    getGemTransactions(userId: string, type: string, limit: number, req: any): Promise<import("./entities/gem-transaction.entity").GemTransaction[]>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
