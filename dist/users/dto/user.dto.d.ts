import { UserRole } from '../entities/user.entity';
export declare class CreateUserDto {
    email: string;
    name?: string;
    password: string;
    role?: UserRole;
}
export declare class UpdateUserDto {
    email?: string;
    name?: string;
    password?: string;
    role?: UserRole;
    isActive?: boolean;
}
export declare class UserResponseDto {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
    wallets: any[];
}
