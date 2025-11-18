export declare class RequestCodeDto {
    email: string;
}
export declare class VerifyCodeDto {
    email: string;
    code: string;
    name?: string;
}
export declare class CheckUserDto {
    email: string;
}
export declare class DirectLoginDto {
    email: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterDto {
    email: string;
    name?: string;
    gem?: number;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
