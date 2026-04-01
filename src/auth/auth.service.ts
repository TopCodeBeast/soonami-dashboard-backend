import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto, RegisterDto, ChangePasswordDto, RequestCodeDto, VerifyCodeDto, RevokeAllSessionsDto, CheckUserDto, CheckTokenDto } from './dto/auth.dto';
import { EmailService } from './services/email.service';
import { CodeStorageService } from './services/code-storage.service';
import { TokenService } from './services/token.service';
import { StampsService } from '../stamps/stamps.service';
import { validateName } from './utils/name-validator';
import { loadStreamAssignmentPool } from '../users/utils/stream-assignment';
import { StreamInstance } from './entities/stream-instance.entity';

/** soonami-dashboard-frontend: no token in DB, no expiry; login with JWT only */
const DASHBOARD_FRONTEND = 'soonami-dashboard-frontend';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(StreamInstance)
    private streamInstanceRepository: Repository<StreamInstance>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private codeStorageService: CodeStorageService,
    private tokenService: TokenService,
    private stampsService: StampsService,
    private dataSource: DataSource,
  ) {}

  private async ensureStreamInstancePool(): Promise<void> {
    const pool = loadStreamAssignmentPool();
    if (pool.length === 0) {
      return;
    }

    const existingInstances = await this.streamInstanceRepository.find({
      select: ['id', 'socketPort', 'pixelStreamUrl', 'userId', 'userEmail'],
    });
    const existingByPort = new Map(
      existingInstances.map((instance) => [instance.socketPort, instance]),
    );

    for (const entry of pool) {
      const existing = existingByPort.get(entry.socketPort);
      if (!existing) {
        await this.streamInstanceRepository.insert({
          socketPort: entry.socketPort,
          pixelStreamUrl: entry.pixelStreamUrl,
          userId: null,
          userEmail: null,
        });
        continue;
      }

      if (
        existing.userId == null &&
        existing.pixelStreamUrl !== entry.pixelStreamUrl
      ) {
        await this.streamInstanceRepository.update(existing.id, {
          pixelStreamUrl: entry.pixelStreamUrl,
        });
      }
    }
  }

  private async ensurePixelStreamAssignment(user: User): Promise<User> {
    await this.ensureStreamInstancePool();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const instanceRepo = queryRunner.manager.getRepository(StreamInstance);
      const userRepo = queryRunner.manager.getRepository(User);

      let instance = await instanceRepo
        .createQueryBuilder('instance')
        .setLock('pessimistic_write')
        .where('instance.userId = :userId', { userId: user.id })
        .getOne();

      if (!instance) {
        instance = await instanceRepo
          .createQueryBuilder('instance')
          .setLock('pessimistic_write')
          .where('instance.userId IS NULL')
          .orderBy('instance.socketPort', 'ASC')
          .getOne();

        if (!instance) {
          throw new ConflictException(
            'No available stream instances. Please try again later.',
          );
        }

        await instanceRepo.update(instance.id, {
          userId: user.id,
          userEmail: user.email,
        });
      } else if (instance.userEmail !== user.email) {
        await instanceRepo.update(instance.id, {
          userEmail: user.email,
        });
      }

      const updatedFields: Partial<User> = {};
      if (user.socketPort !== instance.socketPort) {
        updatedFields.socketPort = instance.socketPort;
      }
      if (user.pixelStreamUrl !== instance.pixelStreamUrl) {
        updatedFields.pixelStreamUrl = instance.pixelStreamUrl;
      }

      if (Object.keys(updatedFields).length > 0) {
        await userRepo.update(user.id, updatedFields);
      }

      user.socketPort = instance.socketPort;
      user.pixelStreamUrl = instance.pixelStreamUrl;

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return user;
  }

  private async resolveStreamAssignmentForFrontend(
    user: User,
    frontendService?: string | null,
  ): Promise<User> {
    const isDashboardFrontend = frontendService === DASHBOARD_FRONTEND;
    if (isDashboardFrontend) {
      // Dashboard sessions should never reserve gameplay stream slots.
      await this.clearUserStreamAssignment(user.id, user.email);
      user.socketPort = null;
      user.pixelStreamUrl = null;
      return user;
    }

    return this.ensurePixelStreamAssignment(user);
  }

  private async clearUserStreamAssignment(
    userId?: string | null,
    userEmail?: string | null,
  ): Promise<void> {
    const normalizedEmail = userEmail?.toLowerCase().trim() || null;
    await this.dataSource.transaction(async (manager) => {
      const streamInstanceRepo = manager.getRepository(StreamInstance);
      const userRepo = manager.getRepository(User);

      if (userId && normalizedEmail) {
        await streamInstanceRepo
          .createQueryBuilder()
          .update(StreamInstance)
          .set({ userId: null, userEmail: null })
          .where('"userId" = :userId', { userId })
          .orWhere('LOWER("userEmail") = :userEmail', { userEmail: normalizedEmail })
          .execute();
      } else if (userId) {
        await streamInstanceRepo.update({ userId }, { userId: null, userEmail: null });
      } else if (normalizedEmail) {
        await streamInstanceRepo
          .createQueryBuilder()
          .update(StreamInstance)
          .set({ userId: null, userEmail: null })
          .where('LOWER("userEmail") = :userEmail', { userEmail: normalizedEmail })
          .execute();
      }

      if (userId) {
        await userRepo.update(userId, {
          socketPort: null,
          pixelStreamUrl: null,
        });
      } else if (normalizedEmail) {
        await userRepo
          .createQueryBuilder()
          .update(User)
          .set({ socketPort: null, pixelStreamUrl: null })
          .where('LOWER(email) = :userEmail', { userEmail: normalizedEmail })
          .execute();
      }
    });
  }

  async listStreamInstances() {
    const instances = await this.streamInstanceRepository.find({
      order: { socketPort: 'ASC' },
    });

    return instances.map((instance) => ({
      id: instance.id,
      socketPort: instance.socketPort,
      pixelStreamUrl: instance.pixelStreamUrl,
      userId: instance.userId,
      userEmail: instance.userEmail,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    }));
  }

  async updateStreamInstanceUserEmail(
    instanceId: string,
    userEmail?: string | null,
  ) {
    const normalizedEmail = userEmail?.trim().toLowerCase() || null;

    return this.dataSource.transaction(async (manager) => {
      const instanceRepo = manager.getRepository(StreamInstance);
      const userRepo = manager.getRepository(User);

      const instance = await instanceRepo.findOne({ where: { id: instanceId } });
      if (!instance) {
        throw new BadRequestException('Stream instance not found');
      }

      if (!normalizedEmail) {
        if (instance.userId) {
          await userRepo.update(instance.userId, {
            socketPort: null,
            pixelStreamUrl: null,
          });
        }

        await instanceRepo.update(instance.id, {
          userId: null,
          userEmail: null,
        });
      } else {
        const targetUser = await userRepo
          .createQueryBuilder('user')
          .where('LOWER(user.email) = :email', { email: normalizedEmail })
          .getOne();

        if (!targetUser) {
          throw new BadRequestException('No user found for this email');
        }

        if (instance.userId && instance.userId !== targetUser.id) {
          await userRepo.update(instance.userId, {
            socketPort: null,
            pixelStreamUrl: null,
          });
        }

        await instanceRepo
          .createQueryBuilder()
          .update(StreamInstance)
          .set({ userId: null, userEmail: null })
          .where('"userId" = :userId', { userId: targetUser.id })
          .andWhere('id != :instanceId', { instanceId: instance.id })
          .execute();

        await instanceRepo.update(instance.id, {
          userId: targetUser.id,
          userEmail: targetUser.email,
        });

        await userRepo.update(targetUser.id, {
          socketPort: instance.socketPort,
          pixelStreamUrl: instance.pixelStreamUrl,
        });
      }

      const updatedInstance = await instanceRepo.findOne({
        where: { id: instance.id },
      });

      if (!updatedInstance) {
        throw new BadRequestException('Stream instance not found after update');
      }

      return {
        id: updatedInstance.id,
        socketPort: updatedInstance.socketPort,
        pixelStreamUrl: updatedInstance.pixelStreamUrl,
        userId: updatedInstance.userId,
        userEmail: updatedInstance.userEmail,
        createdAt: updatedInstance.createdAt,
        updatedAt: updatedInstance.updatedAt,
      };
    });
  }

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
      throw new UnauthorizedException(
        'Your account must be activated by an administrator before you can log in.',
      );
    }

    await this.ensurePixelStreamAssignment(user);
    const payload = { email: user.email, sub: user.id, role: user.role };
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
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
        socketPort: userWithWallets?.socketPort ?? user.socketPort,
        pixelStreamUrl: userWithWallets?.pixelStreamUrl ?? user.pixelStreamUrl,
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
    
    // Validate code without consuming so that on 409 (another session) the same code can be used for revoke-all-sessions
    if (!this.codeStorageService.validateCodeWithoutConsuming(email, code)) {
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
        console.log(`[LOGIN CHECK] ❌ BLOCKED: Active token found for ${email} - preventing second login (code not consumed, user can use "Log out all sessions")`);
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
      
      // Create user as inactive; admin must activate on soonami-frontend before they can log in
      const user = this.userRepository.create({
        email,
        name,
        gem: 0,
        role: UserRole.USER,
        isActive: false,
      });

      const savedUser = await this.userRepository.save(user);
      throw new UnauthorizedException(
        'Your account has been created. An administrator must activate your account before you can log in.',
      );
    }

    // Existing user - check if active
    if (!existingUser.isActive) {
      throw new UnauthorizedException(
        'Your account must be activated by an administrator before you can log in.',
      );
    }

      const assignedUser = await this.resolveStreamAssignmentForFrontend(
        existingUser,
        frontendService,
      );
      
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
      
      const payload: any = { email: assignedUser.email, sub: assignedUser.id, role: assignedUser.role };
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
      
      // Consume code only after successful login so that 409 leaves code valid for revoke-all-sessions
      this.codeStorageService.consumeCode(email);
      
      return {
        accessToken,
        refreshToken,
        user: {
          id: assignedUser.id,
          name: assignedUser.name,
          email: assignedUser.email,
          role: assignedUser.role,
          gem: assignedUser.gem,
          isActive: assignedUser.isActive,
          lastLoginAt: assignedUser.lastLoginAt,
          stampsCollected: assignedUser.stampsCollected,
          lastStampClaimDate: assignedUser.lastStampClaimDate,
          firstStampClaimDate: assignedUser.firstStampClaimDate,
          createdAt: assignedUser.createdAt,
          updatedAt: assignedUser.updatedAt,
          socketPort: userWithWallets?.socketPort ?? assignedUser.socketPort,
          pixelStreamUrl: userWithWallets?.pixelStreamUrl ?? assignedUser.pixelStreamUrl,
          wallets: userWithWallets?.wallets || [],
        },
        isFirstLogin: false,
        stampInfo,
      };
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
      throw new UnauthorizedException(
        'Your account must be activated by an administrator before you can log in.',
      );
    }
    
    // Only allow direct login for admin and manager roles
    if (user.role !== 'admin' && user.role !== 'manager') {
      throw new UnauthorizedException('Direct login only available for administrators and managers');
    }

    const assignedUser = await this.resolveStreamAssignmentForFrontend(
      user,
      frontendService,
    );

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
    
    const payload: any = { email: assignedUser.email, sub: assignedUser.id, role: assignedUser.role };
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
        id: assignedUser.id,
        name: assignedUser.name,
        email: assignedUser.email,
        role: assignedUser.role,
        gem: assignedUser.gem,
        isActive: assignedUser.isActive,
        lastLoginAt: assignedUser.lastLoginAt,
        stampsCollected: assignedUser.stampsCollected,
        lastStampClaimDate: assignedUser.lastStampClaimDate,
        firstStampClaimDate: assignedUser.firstStampClaimDate,
        createdAt: assignedUser.createdAt,
        updatedAt: assignedUser.updatedAt,
        socketPort: userWithWallets?.socketPort ?? assignedUser.socketPort,
        pixelStreamUrl: userWithWallets?.pixelStreamUrl ?? assignedUser.pixelStreamUrl,
        wallets: userWithWallets?.wallets || [],
      },
      stampInfo,
    };
  }

  async logout(token: string): Promise<{ ok: boolean }> {
    if (token) {
      await this.tokenService.expireToken(token);
      const decoded = this.jwtService.decode(token) as { sub?: string; email?: string } | null;
      const userId = decoded?.sub;
      const userEmail = decoded?.email;
      if (userId || userEmail) {
        await this.clearUserStreamAssignment(userId, userEmail);
      }
    }
    return { ok: true };
  }

  /**
   * Revoke all sessions for the user (by email + verification code).
   * Allows the user to log in on this device without hunting down other logged-in sessions.
   */
  async revokeAllSessions(revokeDto: RevokeAllSessionsDto): Promise<{ ok: boolean; message: string }> {
    const email = revokeDto.email.toLowerCase().trim();
    const code = revokeDto.code.trim();

    if (!this.codeStorageService.validateCodeWithoutConsuming(email, code)) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Expire using same criteria as hasActiveToken: (username OR userId) AND isActive = true
    const user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      await this.tokenService.expireAllUserTokensByUsernameAndUserId(email, user.id);
      await this.clearUserStreamAssignment(user.id, user.email);
    } else {
      await this.tokenService.expireAllUserTokensByUsername(email);
    }
    return { ok: true, message: 'All other sessions have been logged out. You can now log in on this device.' };
  }

  async updateActivity(token: string, frontendService?: string): Promise<{ ok: boolean }> {
    if (token) {
      await this.tokenService.updateActivity(token, frontendService);
      const decoded = this.jwtService.decode(token) as { sub?: string; email?: string } | null;
      const userId = decoded?.sub;
      const userEmail = decoded?.email?.toLowerCase().trim();
      if (userId) {
        await this.streamInstanceRepository.update(
          { userId },
          { userEmail: userEmail || null },
        );
      }
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
      const decoded = this.jwtService.decode(token) as { sub?: string; email?: string } | null;
      const userId = decoded?.sub;
      const userEmail = decoded?.email;
      if (userId || userEmail) {
        await this.clearUserStreamAssignment(userId, userEmail);
      }
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
          socketPort: user.socketPort,
          pixelStreamUrl: user.pixelStreamUrl,
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
          socketPort: user.socketPort,
          pixelStreamUrl: user.pixelStreamUrl,
          wallets: user.wallets || [],
        },
      };
    } catch {
      return { valid: false };
    }
  }
}
