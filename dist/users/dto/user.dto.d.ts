import { UserRole } from '../entities/user.entity';
export declare class CreateUserDto {
    email: string;
    name?: string;
    gem?: number;
    password: string;
    role?: UserRole;
    isActive?: boolean;
    gemTransactionReason?: string;
    gemTransactionMetadata?: string;
}
export declare class UpdateUserDto {
    email?: string;
    name?: string;
    gem?: number;
    password?: string;
    role?: UserRole;
    isActive?: boolean;
    gemTransactionReason?: string;
    gemTransactionMetadata?: string;
}
export declare class UserResponseDto {
    id: string;
    email: string;
    name?: string;
    gem: number;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
    wallets: any[];
}
