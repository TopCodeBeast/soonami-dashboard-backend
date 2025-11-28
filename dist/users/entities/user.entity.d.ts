import { Wallet } from '../../wallets/entities/wallet.entity';
export declare enum UserRole {
    MANAGER = "manager",
    ADMIN = "admin",
    USER = "user"
}
export declare class User {
    id: string;
    email: string;
    name: string;
    gem: number;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: Date;
    lastDailyRewardClaimDate: Date;
    createdAt: Date;
    updatedAt: Date;
    wallets: Wallet[];
}
