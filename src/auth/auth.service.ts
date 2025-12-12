import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto, RegisterDto, ChangePasswordDto, RequestCodeDto, VerifyCodeDto, CheckUserDto } from './dto/auth.dto';
import { EmailService } from './services/email.service';
import { CodeStorageService } from './services/code-storage.service';
import { StampsService } from '../stamps/stamps.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private codeStorageService: CodeStorageService,
    private stampsService: StampsService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Legacy method - password-based login is no longer supported
    // This method is kept for backward compatibility but will always return null
    // The main login flow uses email verification code (verifyCode method).
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
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

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Legacy method - password-based registration is no longer supported
    // Users should use email verification code registration (verifyCode method)
    const user = this.userRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      gem: registerDto.gem || 0,
      role: UserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);
    return savedUser;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { email: user.email, sub: user.id, role: user.role };
      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      });

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    // Legacy method - password-based authentication is no longer supported
    // This system uses email verification code login, so password changes are not applicable
    throw new BadRequestException('Password changes are not supported. This system uses email verification code login.');
  }

  async requestCode(requestCodeDto: RequestCodeDto) {
    const email = requestCodeDto.email.toLowerCase().trim();
    
    // Generate and store code
    const code = this.codeStorageService.storeCode(email);
    
    // Send code via email
    const emailSent = await this.emailService.sendVerificationCode(email, code);
    
    if (!emailSent) {
      // In development, we still return success even if email fails
      // The code will be logged
    }
    
    return { message: 'Verification code sent to your email' };
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    const email = verifyCodeDto.email.toLowerCase().trim();
    const code = verifyCodeDto.code.trim();
    const name = verifyCodeDto.name?.trim();
    
    // Verify code
    if (!this.codeStorageService.verifyCode(email, code)) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
      relations: ['wallets'],
    });
    
    const isFirstLogin = !existingUser;
    
    if (isFirstLogin) {
      // First-time login - need name to create user
      if (!name || name.length < 1 || name.length > 100) {
        throw new BadRequestException(
          'Name is required for first-time registration (1-100 characters)',
        );
      }
      
      // Create user (no password needed - using email verification code login)
      const user = this.userRepository.create({
        email,
        name,
        gem: 0,
        role: UserRole.USER,
        isActive: true,
      });
      
      const savedUser = await this.userRepository.save(user);
      
      // Update last login
      await this.userRepository.update(savedUser.id, { lastLoginAt: new Date() });
      
      // Collect daily stamp
      let stampInfo = null;
      try {
        const stampResult = await this.stampsService.claimStamp(savedUser.id);
        if (stampResult.success) {
          stampInfo = {
            collected: true,
            stampsCollected: stampResult.stampsCollected,
            stampsNeeded: stampResult.stampsNeeded,
            reward: stampResult.reward,
            message: stampResult.message,
          };
        }
      } catch (error) {
        console.error('Error collecting stamp:', error);
        // Don't fail login if stamp collection fails
      }
      
      const payload = { email: savedUser.email, sub: savedUser.id, role: savedUser.role };
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
          ...savedUser,
          wallets: savedUser.wallets || [],
        },
        isFirstLogin: true,
        stampInfo,
      };
    } else {
      // Existing user - check if active
      if (!existingUser.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }
      
      // Note: Role checking should be done by the calling application (dashboard frontend)
      // This endpoint is used by both the dashboard and the Python project,
      // so we allow all active users to authenticate here
      
      // Update last login
      await this.userRepository.update(existingUser.id, { lastLoginAt: new Date() });
      
      // Collect daily stamp
      let stampInfo = null;
      try {
        const stampResult = await this.stampsService.claimStamp(existingUser.id);
        if (stampResult.success) {
          stampInfo = {
            collected: true,
            stampsCollected: stampResult.stampsCollected,
            stampsNeeded: stampResult.stampsNeeded,
            reward: stampResult.reward,
            message: stampResult.message,
          };
        }
      } catch (error) {
        console.error('Error collecting stamp:', error);
        // Don't fail login if stamp collection fails
      }
      
      const payload = { email: existingUser.email, sub: existingUser.id, role: existingUser.role };
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
          ...existingUser,
          wallets: existingUser.wallets || [],
        },
        isFirstLogin: false,
        stampInfo,
      };
    }
  }

  async checkUser(checkUserDto: CheckUserDto) {
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

  async directLoginForAdmin(email: string) {
    const emailLower = email.toLowerCase().trim();
    
    const user = await this.userRepository.findOne({
      where: { email: emailLower },
      relations: ['wallets'],
    });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    
    // Only allow direct login for admin and manager roles
    if (user.role !== 'admin' && user.role !== 'manager') {
      throw new UnauthorizedException('Direct login only available for administrators and managers');
    }
    
    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
    
    // Collect daily stamp
    let stampInfo = null;
    try {
      const stampResult = await this.stampsService.claimStamp(user.id);
      if (stampResult.success) {
        stampInfo = {
          collected: true,
          stampsCollected: stampResult.stampsCollected,
          stampsNeeded: stampResult.stampsNeeded,
          reward: stampResult.reward,
          message: stampResult.message,
        };
      }
    } catch (error) {
      console.error('Error collecting stamp:', error);
      // Don't fail login if stamp collection fails
    }
    
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
        ...user,
        wallets: user.wallets || [],
      },
      stampInfo,
    };
  }
}
