import { User } from '../../users/entities/user.entity';
export declare class Wallet {
    id: string;
    address: string;
    label: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: User;
}
