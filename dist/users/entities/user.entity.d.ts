import { Wallet } from '../../wallets/entities/wallet.entity';
export declare enum UserRole {
    ADMIN = "admin",
    USER = "user"
}
export declare class User {
    id: string;
    email: string;
    name: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
    wallets: Wallet[];
}
