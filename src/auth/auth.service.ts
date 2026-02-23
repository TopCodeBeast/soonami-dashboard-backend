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
import { LoginDto, RegisterDto, ChangePasswordDto, RequestCodeDto, VerifyCodeDto, CheckUserDto, CheckTokenDto } from './dto/auth.dto';
import { EmailService } from './services/email.service';
import { CodeStorageService } from './services/code-storage.service';
import { TokenService } from './services/token.service';
import { StampsService } from '../stamps/stamps.service';
import { validateName } from './utils/name-validator';

/** soonami-dashboard-frontend: no token in DB, no expiry; login with JWT only */
const DASHBOARD_FRONTEND = 'soonami-dashboard-frontend';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private codeStorageService: CodeStorageService,
    private tokenService: TokenService,
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

    // Reload user with wallets relation
    const userWithWallets = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['wallets'],
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
        wallets: userWithWallets?.wallets || [],
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

  async verifyCode(verifyCodeDto: VerifyCodeDto, frontendService?: string) {
    const email = verifyCodeDto.email.toLowerCase().trim();
    const code = verifyCodeDto.code.trim();
    const name = verifyCodeDto.name?.trim();
    
    // Verify code
    if (!this.codeStorageService.verifyCode(email, code)) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    
    // Check if user exists first (needed to get userId for token check)
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    
    const isFirstLogin = !existingUser;
    const isDashboard = frontendService === DASHBOARD_FRONTEND;

    // Dashboard: no token in DB, no session check. Other frontends: block if active token exists.
    if (!isDashboard) {
      console.log(`[LOGIN CHECK] Checking for active tokens before login - email: ${email}, userId: ${existingUser?.id || 'N/A'}`);
      const hasActiveToken = existingUser
        ? await this.tokenService.hasActiveToken(email, existingUser.id)
        : await this.tokenService.hasActiveToken(email);
      if (hasActiveToken) {
        console.log(`[LOGIN CHECK] ❌ BLOCKED: Active token found for ${email} - preventing second login`);
        throw new ConflictException('Another session is already logged in. Please close other sessions or try again later.');
      }
      console.log(`[LOGIN CHECK] ✅ ALLOWED: No active tokens found for ${email}`);
    } else {
      console.log(`[LOGIN CHECK] Dashboard login - no token DB, no session check`);
    }
    
    if (isFirstLogin) {
      // First-time login - need name to create user
      if (!name) {
        throw new BadRequestException('Name is required for first-time registration');
      }
      
      // Validate name: max 40 chars, alphanumeric + spaces only, no profanity
      const nameValidation = validateName(name);
      if (!nameValidation.valid) {
        throw new BadRequestException(nameValidation.error || 'Invalid name');
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
      
      // Reload user with wallets relation
      const userWithWallets = await this.userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['wallets'],
      });
      
      // Update last login
      await this.userRepository.update(savedUser.id, { lastLoginAt: new Date() });
      
      // Collect daily stamp
      let stampInfo = null;
      try {
        const stampResult = await this.stampsService.claimStamp(savedUser.id);
        // Always include stamp info, even if not successful, so frontend can show current status
        stampInfo = {
          collected: stampResult.success,
          success: stampResult.success,
          stampsCollected: stampResult.stampsCollected,
          stampsNeeded: stampResult.stampsNeeded,
          reward: stampResult.reward, // Will be undefined if no reward
          message: stampResult.message,
        };
        
        // Log reward if given
        if (stampResult.reward) {
          console.log('🎉 [AUTH] New user received reward on first login:', stampResult.reward);
        }
      } catch (error) {
        console.error('Error collecting stamp:', error);
        // Don't fail login if stamp collection fails, but still try to get current status
        try {
          const status = await this.stampsService.getStampStatus(savedUser.id);
          stampInfo = {
            collected: false,
            success: false,
            stampsCollected: status.stampsCollected,
            stampsNeeded: status.stampsNeeded,
            message: status.message,
          };
        } catch (statusError) {
          console.error('Error getting stamp status:', statusError);
        }
      }
      
      const payload: any = { email: savedUser.email, sub: savedUser.id, role: savedUser.role };
      if (isDashboard) payload.fs = DASHBOARD_FRONTEND;
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      });
      
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      if (!isDashboard) {
        console.log(`[LOGIN] Creating token for user: ${savedUser.id}, email: ${email}`);
        try {
          await this.tokenService.createToken(savedUser.id, email, accessToken, frontendService);
          console.log(`[LOGIN] ✅ Token created successfully for ${email}`);
        } catch (error: any) {
          if (error.message.includes('Active token exists')) {
            console.log(`[LOGIN] ❌ Token creation blocked - active token exists for ${email}`);
            throw new ConflictException('Another session is already logged in. Please close other sessions or try again later.');
          }
          throw error;
        }
      } else {
        console.log(`[LOGIN] Dashboard login - token not stored in DB`);
      }
      
      return {
        accessToken,
        refreshToken,
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
          gem: savedUser.gem,
          isActive: savedUser.isActive,
          lastLoginAt: savedUser.lastLoginAt,
          stampsCollected: savedUser.stampsCollected,
          lastStampClaimDate: savedUser.lastStampClaimDate,
          firstStampClaimDate: savedUser.firstStampClaimDate,
          createdAt: savedUser.createdAt,
          updatedAt: savedUser.updatedAt,
          wallets: userWithWallets?.wallets || [],
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
      
      // IMPORTANT: Collect daily stamp BEFORE updating lastLoginAt
      // Otherwise the 24-hour cooldown check will fail because lastLoginAt will be "now"
      let stampInfo = null;
      try {
        const stampResult = await this.stampsService.claimStamp(existingUser.id);
        // Always include stamp info, even if not successful, so frontend can show current status
        stampInfo = {
          collected: stampResult.success,
          success: stampResult.success,
          stampsCollected: stampResult.stampsCollected,
          stampsNeeded: stampResult.stampsNeeded,
          reward: stampResult.reward, // Will be undefined if no reward
          message: stampResult.message,
        };
        
        // Log reward if given
        if (stampResult.reward) {
          console.log('🎉 [AUTH] User received reward on login:', stampResult.reward);
        }
      } catch (error) {
        console.error('Error collecting stamp:', error);
        // Don't fail login if stamp collection fails, but still try to get current status
        try {
          const status = await this.stampsService.getStampStatus(existingUser.id);
          stampInfo = {
            collected: false,
            success: false,
            stampsCollected: status.stampsCollected,
            stampsNeeded: status.stampsNeeded,
            message: status.message,
          };
        } catch (statusError) {
          console.error('Error getting stamp status:', statusError);
        }
      }
      
      // Update last login AFTER stamp claim (so cooldown check uses old value)
      await this.userRepository.update(existingUser.id, { lastLoginAt: new Date() });
      
      // Reload user with wallets relation
      const userWithWallets = await this.userRepository.findOne({
        where: { id: existingUser.id },
        relations: ['wallets'],
      });
      
      const payload: any = { email: existingUser.email, sub: existingUser.id, role: existingUser.role };
      if (isDashboard) payload.fs = DASHBOARD_FRONTEND;
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      });
      
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      if (!isDashboard) {
        console.log(`[LOGIN] Creating token for existing user: ${existingUser.id}, email: ${email}`);
        try {
          await this.tokenService.createToken(existingUser.id, email, accessToken, frontendService);
          console.log(`[LOGIN] ✅ Token created successfully for ${email}`);
        } catch (error: any) {
          if (error.message.includes('Active token exists')) {
            console.log(`[LOGIN] ❌ Token creation blocked - active token exists for ${email}`);
            throw new ConflictException('Another session is already logged in. Please close other sessions or try again later.');
          }
          throw error;
        }
      } else {
        console.log(`[LOGIN] Dashboard login - token not stored in DB`);
      }
      
      return {
        accessToken,
        refreshToken,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          gem: existingUser.gem,
          isActive: existingUser.isActive,
          lastLoginAt: existingUser.lastLoginAt,
          stampsCollected: existingUser.stampsCollected,
          lastStampClaimDate: existingUser.lastStampClaimDate,
          firstStampClaimDate: existingUser.firstStampClaimDate,
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
          wallets: userWithWallets?.wallets || [],
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

  async directLoginForAdmin(email: string, frontendService?: string) {
    const emailLower = email.toLowerCase().trim();
    const isDashboard = frontendService === DASHBOARD_FRONTEND;
    
    const user = await this.userRepository.findOne({
      where: { email: emailLower },
    });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    if (!isDashboard) {
      const hasActiveToken = await this.tokenService.hasActiveToken(emailLower, user.id);
      if (hasActiveToken) {
        console.log(`[DIRECT LOGIN] ❌ BLOCKED: Active token found for ${emailLower}`);
        throw new ConflictException('Another session is already logged in. Please close other sessions or try again later.');
      }
      console.log(`[DIRECT LOGIN] ✅ ALLOWED: No active tokens found for ${emailLower}`);
    } else {
      console.log(`[DIRECT LOGIN] Dashboard - no token DB check`);
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
    
    // Reload user with wallets relation
    const userWithWallets = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['wallets'],
    });
    
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
    
    const payload: any = { email: user.email, sub: user.id, role: user.role };
    if (isDashboard) payload.fs = DASHBOARD_FRONTEND;
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    if (!isDashboard) {
      try {
        await this.tokenService.createToken(user.id, emailLower, accessToken, frontendService);
      } catch (error: any) {
        if (error.message.includes('Active token exists')) {
          throw new ConflictException('Another session is already logged in. Please close other sessions or try again later.');
        }
        throw error;
      }
    }
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        gem: user.gem,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        stampsCollected: user.stampsCollected,
        lastStampClaimDate: user.lastStampClaimDate,
        firstStampClaimDate: user.firstStampClaimDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        wallets: userWithWallets?.wallets || [],
      },
      stampInfo,
    };
  }

  async logout(token: string): Promise<{ ok: boolean }> {
    if (token) {
      await this.tokenService.expireToken(token);
    }
    return { ok: true };
  }

  async updateActivity(token: string, frontendService?: string): Promise<{ ok: boolean }> {
    if (token) {
      await this.tokenService.updateActivity(token, frontendService);
      if (frontendService) {
        console.log(`✅ Activity updated from frontend: ${frontendService}`);
      }
    }
    return { ok: true };
  }

  async expireTokenDueToInactivity(token: string, frontendService?: string): Promise<{ ok: boolean }> {
    if (token) {
      // Verify frontend service matches token's frontend service
      const userToken = await this.tokenService.getTokenByTokenString(token);
      if (userToken && userToken.frontendService && frontendService && userToken.frontendService !== frontendService) {
        console.warn(`⚠️ Frontend service mismatch: token belongs to ${userToken.frontendService}, but expire request from ${frontendService}`);
        // Still expire, but log warning
      }
      
      await this.tokenService.expireToken(token);
      console.log(`✅ Token expired due to inactivity from frontend: ${frontendService || 'unknown'}`);
    }
    return { ok: true };
  }

  /**
   * Check if token is valid and belongs to the given email.
   * Returns { valid: boolean, user?: ... }. Supports both DB tokens and dashboard (JWT-only) tokens.
   */
  async checkToken(checkTokenDto: CheckTokenDto): Promise<{ valid: boolean; user?: any }> {
    const { token, email } = checkTokenDto;
    const normalizedEmail = email.toLowerCase().trim();

    if (!token || !normalizedEmail) {
      return { valid: false };
    }

    const userToken = await this.tokenService.validateToken(token);
    if (userToken) {
      if (userToken.username?.toLowerCase().trim() !== normalizedEmail) {
        return { valid: false };
      }
      const user = await this.userRepository.findOne({
        where: { id: userToken.userId },
        relations: ['wallets'],
      });
      if (!user || !user.isActive) return { valid: false };
      return {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          gem: user.gem,
          isActive: user.isActive,
          wallets: user.wallets || [],
        },
      };
    }

    // Dashboard token (not in DB): validate by JWT only
    try {
      const payload = this.jwtService.verify(token);
      if (payload.fs !== DASHBOARD_FRONTEND) return { valid: false };
      if ((payload.email || '').toLowerCase().trim() !== normalizedEmail) return { valid: false };
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['wallets'],
      });
      if (!user || !user.isActive) return { valid: false };
      return {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          gem: user.gem,
          isActive: user.isActive,
          wallets: user.wallets || [],
        },
      };
    } catch {
      return { valid: false };
    }
  }
}
