import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto, RegisterDto, ChangePasswordDto, RequestCodeDto, VerifyCodeDto, CheckUserDto } from './dto/auth.dto';
import { EmailService } from './services/email.service';
import { CodeStorageService } from './services/code-storage.service';
export declare class AuthService {
    private userRepository;
    private jwtService;
    private emailService;
    private codeStorageService;
    constructor(userRepository: Repository<User>, jwtService: JwtService, emailService: EmailService, codeStorageService: CodeStorageService);
    validateUser(email: string, password: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
            gem: any;
            wallets: any;
        };
    }>;
    register(registerDto: RegisterDto): Promise<{
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
        wallets: import("../wallets/entities/wallet.entity").Wallet[];
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    requestCode(requestCodeDto: RequestCodeDto): Promise<{
        message: string;
    }>;
    verifyCode(verifyCodeDto: VerifyCodeDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            wallets: import("../wallets/entities/wallet.entity").Wallet[];
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
        };
        isFirstLogin: boolean;
    }>;
    checkUser(checkUserDto: CheckUserDto): Promise<{
        exists: boolean;
        role?: undefined;
        isActive?: undefined;
        name?: undefined;
    } | {
        exists: boolean;
        role: UserRole;
        isActive: boolean;
        name: string;
    }>;
    directLoginForAdmin(email: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            wallets: import("../wallets/entities/wallet.entity").Wallet[];
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
        };
    }>;
}
