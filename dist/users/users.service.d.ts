import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
export declare class UsersService {
    private userRepository;
    constructor(userRepository: Repository<User>);
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
}
