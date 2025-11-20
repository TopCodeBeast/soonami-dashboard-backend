"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcryptjs");
const user_entity_1 = require("../users/entities/user.entity");
const email_service_1 = require("./services/email.service");
const code_storage_service_1 = require("./services/code-storage.service");
let AuthService = class AuthService {
    constructor(userRepository, jwtService, emailService, codeStorageService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.codeStorageService = codeStorageService;
    }
    async validateUser(email, password) {
        const user = await this.userRepository.findOne({
            where: { email },
            relations: ['wallets'],
        });
        if (user && (await bcrypt.compare(password, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        await this.userRepository.update(user.id, { lastLoginAt: new Date() });
        const payload = { email: user.email, sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                gem: user.gem,
                wallets: user.wallets,
            },
        };
    }
    async register(registerDto) {
        const existingUser = await this.userRepository.findOne({
            where: { email: registerDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        const user = this.userRepository.create({
            email: registerDto.email,
            name: registerDto.name,
            gem: registerDto.gem || 0,
            password: hashedPassword,
            role: user_entity_1.UserRole.USER,
        });
        const savedUser = await this.userRepository.save(user);
        const { password, ...result } = savedUser;
        return result;
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
            });
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const newPayload = { email: user.email, sub: user.id, role: user.role };
            const newAccessToken = this.jwtService.sign(newPayload, {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            });
            return { accessToken: newAccessToken };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async changePassword(userId, changePasswordDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (!user.password) {
            throw new common_1.BadRequestException('Password not set for this account');
        }
        const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new common_1.BadRequestException('Current password is incorrect');
        }
        const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        await this.userRepository.update(userId, {
            password: hashedNewPassword,
        });
        return { message: 'Password changed successfully' };
    }
    async requestCode(requestCodeDto) {
        const email = requestCodeDto.email.toLowerCase().trim();
        const code = this.codeStorageService.storeCode(email);
        const emailSent = await this.emailService.sendVerificationCode(email, code);
        if (!emailSent) {
        }
        return { message: 'Verification code sent to your email' };
    }
    async verifyCode(verifyCodeDto) {
        const email = verifyCodeDto.email.toLowerCase().trim();
        const code = verifyCodeDto.code.trim();
        const name = verifyCodeDto.name?.trim();
        if (!this.codeStorageService.verifyCode(email, code)) {
            throw new common_1.UnauthorizedException('Invalid or expired verification code');
        }
        const existingUser = await this.userRepository.findOne({
            where: { email },
            relations: ['wallets'],
        });
        const isFirstLogin = !existingUser;
        if (isFirstLogin) {
            if (!name || name.length < 1 || name.length > 100) {
                throw new common_1.BadRequestException('Name is required for first-time registration (1-100 characters)');
            }
            const user = this.userRepository.create({
                email,
                name,
                gem: 0,
                password: null,
                role: user_entity_1.UserRole.USER,
                isActive: true,
            });
            const savedUser = await this.userRepository.save(user);
            await this.userRepository.update(savedUser.id, { lastLoginAt: new Date() });
            const payload = { email: savedUser.email, sub: savedUser.id, role: savedUser.role };
            const accessToken = this.jwtService.sign(payload, {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            });
            const refreshToken = this.jwtService.sign(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            });
            const { password, ...userResult } = savedUser;
            return {
                accessToken,
                refreshToken,
                user: {
                    ...userResult,
                    wallets: savedUser.wallets || [],
                },
                isFirstLogin: true,
            };
        }
        else {
            if (!existingUser.isActive) {
                throw new common_1.UnauthorizedException('Account is deactivated');
            }
            if (existingUser.role !== user_entity_1.UserRole.ADMIN && existingUser.role !== user_entity_1.UserRole.MANAGER) {
                throw new common_1.UnauthorizedException('Access denied. Only administrators and managers can access this dashboard.');
            }
            await this.userRepository.update(existingUser.id, { lastLoginAt: new Date() });
            const payload = { email: existingUser.email, sub: existingUser.id, role: existingUser.role };
            const accessToken = this.jwtService.sign(payload, {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            });
            const refreshToken = this.jwtService.sign(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            });
            const { password, ...userResult } = existingUser;
            return {
                accessToken,
                refreshToken,
                user: {
                    ...userResult,
                    wallets: existingUser.wallets || [],
                },
                isFirstLogin: false,
            };
        }
    }
    async checkUser(checkUserDto) {
        const email = checkUserDto.email.toLowerCase().trim();
        const user = await this.userRepository.findOne({
            where: { email },
            select: ['id', 'email', 'name', 'role', 'isActive'],
        });
        if (!user) {
            return { exists: false };
        }
        return {
            exists: true,
            role: user.role,
            isActive: user.isActive,
            name: user.name,
        };
    }
    async directLoginForAdmin(email) {
        const emailLower = email.toLowerCase().trim();
        const user = await this.userRepository.findOne({
            where: { email: emailLower },
            relations: ['wallets'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        if (user.role !== 'admin' && user.role !== 'manager') {
            throw new common_1.UnauthorizedException('Direct login only available for administrators and managers');
        }
        await this.userRepository.update(user.id, { lastLoginAt: new Date() });
        const payload = { email: user.email, sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        });
        const { password, ...userResult } = user;
        return {
            accessToken,
            refreshToken,
            user: {
                ...userResult,
                wallets: user.wallets || [],
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        email_service_1.EmailService,
        code_storage_service_1.CodeStorageService])
], AuthService);
//# sourceMappingURL=auth.service.js.map