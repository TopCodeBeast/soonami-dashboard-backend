import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto, RequestCodeDto, VerifyCodeDto, CheckUserDto, DirectLoginDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
        role: import("../users/entities/user.entity").UserRole;
        isActive: boolean;
        lastLoginAt: Date;
        lastDailyRewardClaimDate: Date;
        createdAt: Date;
        updatedAt: Date;
        wallets: import("../wallets/entities/wallet.entity").Wallet[];
    }>;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
    }>;
    changePassword(req: any, changePasswordDto: ChangePasswordDto): Promise<{
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
            role: import("../users/entities/user.entity").UserRole;
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
        role: import("../users/entities/user.entity").UserRole;
        isActive: boolean;
        name: string;
    }>;
    directLogin(directLoginDto: DirectLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            wallets: import("../wallets/entities/wallet.entity").Wallet[];
            id: string;
            email: string;
            name: string;
            gem: number;
            role: import("../users/entities/user.entity").UserRole;
            isActive: boolean;
            lastLoginAt: Date;
            lastDailyRewardClaimDate: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
