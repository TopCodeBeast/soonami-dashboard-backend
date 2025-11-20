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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private codeStorageService: CodeStorageService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
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

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      parseInt(process.env.BCRYPT_ROUNDS) || 12,
    );

    const user = this.userRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      gem: registerDto.gem || 0,
      password: hashedPassword,
      role: UserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;

    return result;
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException('Password not set for this account');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 12,
    );

    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });

    return { message: 'Password changed successfully' };
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
      
      // Create user without password
      const user = this.userRepository.create({
        email,
        name,
        gem: 0,
        password: null, // No password needed
        role: UserRole.USER,
        isActive: true,
      });
      
      const savedUser = await this.userRepository.save(user);
      
      // Update last login
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
    } else {
      // Existing user - check if active
      if (!existingUser.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }
      
      // Check if user is admin or manager (for dashboard access)
      if (existingUser.role !== UserRole.ADMIN && existingUser.role !== UserRole.MANAGER) {
        throw new UnauthorizedException('Access denied. Only administrators and managers can access this dashboard.');
      }
      
      // Update last login
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
}
