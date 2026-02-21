import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { UserToken } from '../entities/user-token.entity';

/** Frontend that does not use token expiry (no 1h, no inactivity, no browser-close). */
const DASHBOARD_FRONTEND = 'soonami-dashboard-frontend';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(UserToken)
    private tokenRepository: Repository<UserToken>,
  ) {}

  /**
   * Create a new token record
   * Also checks for existing active tokens before creating to prevent race conditions
   * soonami-dashboard-frontend: token does not expire (long-lived session).
   */
  async createToken(userId: string, username: string, token: string, frontendService?: string): Promise<UserToken> {
    // Check for active tokens BEFORE creating new one
    // If active token exists, throw error - don't create new token
    const hasActive = await this.hasActiveToken(username, userId);
    if (hasActive) {
      console.log(`[TOKEN CREATE] ❌ BLOCKED: Active token exists for ${username} (userId: ${userId})`);
      throw new Error('Another session is already logged in. Please close other sessions or wait for token to expire.');
    }

    const now = new Date();
    // Dashboard: no expiry. Other frontends: 1 hour.
    const isDashboard = frontendService === DASHBOARD_FRONTEND;
    const expiresAt = isDashboard
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year
      : new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    const userToken = this.tokenRepository.create({
      userId,
      username,
      token,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      isActive: true,
      frontendService: frontendService || null,
    });

    const savedToken = await this.tokenRepository.save(userToken);
    console.log(`[TOKEN CREATE] ✅ Created token - id: ${savedToken.id}, isActive: ${savedToken.isActive}, expiresAt: ${savedToken.expiresAt}, lastActivityAt: ${savedToken.lastActivityAt}`);
    
    // Verify the token was saved correctly
    const verifyToken = await this.tokenRepository.findOne({ where: { id: savedToken.id } });
    if (verifyToken) {
      console.log(`[TOKEN CREATE] Verified token - id: ${verifyToken.id}, isActive: ${verifyToken.isActive}`);
      if (!verifyToken.isActive) {
        console.error(`[TOKEN CREATE] ⚠️ WARNING: Token was saved with isActive=false! Fixing...`);
        // Fix it immediately
        await this.tokenRepository.update({ id: verifyToken.id }, { isActive: true });
        console.log(`[TOKEN CREATE] ✅ Fixed token isActive to true`);
        // Reload to get updated value
        const fixedToken = await this.tokenRepository.findOne({ where: { id: savedToken.id } });
        return fixedToken || savedToken;
      }
    }
    
    return savedToken;
  }

  /**
   * Check if user has any active tokens (by username or userId)
   * Returns true if ANY non-expired token exists (within 1 hour)
   */
  async hasActiveToken(username: string, userId?: string): Promise<boolean> {
    const now = new Date();

    // Build query to check by username OR userId
    // Active = isActive and (not expired by time, or dashboard which has no expiry)
    const queryBuilder = this.tokenRepository.createQueryBuilder('token')
      .where('token.isActive = :isActive', { isActive: true })
      .andWhere('(token.expiresAt > :now OR token.frontendService = :dashboard)', { now, dashboard: DASHBOARD_FRONTEND })
      .andWhere('(token.username = :username' + (userId ? ' OR token.userId = :userId' : '') + ')', {
        username,
        ...(userId ? { userId } : {}),
      });

    const tokens = await queryBuilder.getMany();

    console.log(`[TOKEN CHECK] Checking tokens for username: ${username}, userId: ${userId || 'N/A'}`);
    console.log(`[TOKEN CHECK] Found ${tokens.length} active non-expired tokens`);

    if (tokens.length > 0) {
      tokens.forEach((t, idx) => {
        console.log(`[TOKEN CHECK] Token ${idx + 1}: expiresAt=${t.expiresAt}, lastActivityAt=${t.lastActivityAt}, isActive=${t.isActive}`);
      });
      return true;
    }

    return false;
  }

  /**
   * Check if user has any active tokens by userId
   */
  async hasActiveTokenByUserId(userId: string): Promise<boolean> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Get all active tokens for this userId
    const tokens = await this.tokenRepository.find({
      where: {
        userId,
        isActive: true,
      },
    });

    if (tokens.length === 0) return false;

    // Check if any token is still valid (not expired and has recent activity)
    return tokens.some(
      (t) => {
        const notExpired = t.expiresAt > now;
        const hasRecentActivity = t.lastActivityAt > fiveMinutesAgo;
        return notExpired && hasRecentActivity;
      },
    );
  }

  /**
   * Get active tokens for a username
   */
  async getActiveTokens(username: string): Promise<UserToken[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const tokens = await this.tokenRepository.find({
      where: {
        username,
        isActive: true,
      },
    });

    // Filter tokens that are not expired and have recent activity
    return tokens.filter(
      (t) => t.expiresAt > now && t.lastActivityAt > fiveMinutesAgo,
    );
  }

  /**
   * Update last activity timestamp for a token
   * Also verifies that the frontend service matches (if provided)
   */
  async updateActivity(token: string, frontendService?: string): Promise<void> {
    const updateData: any = { lastActivityAt: new Date() };
    
    // If frontendService is provided, verify it matches the token's frontendService
    if (frontendService) {
      const userToken = await this.tokenRepository.findOne({
        where: { token, isActive: true },
      });
      
      if (userToken && userToken.frontendService && userToken.frontendService !== frontendService) {
        console.warn(`⚠️ Frontend service mismatch: token belongs to ${userToken.frontendService}, but received from ${frontendService}`);
        // Still update activity, but log warning
      }
      
      // Update frontendService if it was null (backward compatibility)
      if (userToken && !userToken.frontendService) {
        updateData.frontendService = frontendService;
      }
    }
    
    await this.tokenRepository.update(
      { token, isActive: true },
      updateData,
    );
  }

  /**
   * Expire a token (mark as inactive)
   */
  async expireToken(token: string): Promise<void> {
    await this.tokenRepository.update({ token }, { isActive: false });
  }

  /**
   * Get token by token string
   */
  async getTokenByTokenString(token: string): Promise<UserToken | null> {
    return this.tokenRepository.findOne({
      where: { token },
    });
  }

  /**
   * Expire all tokens for a username
   */
  async expireAllUserTokensByUsername(username: string): Promise<void> {
    await this.tokenRepository.update(
      { username, isActive: true },
      { isActive: false },
    );
  }

  /**
   * Expire all tokens for a userId
   */
  async expireAllUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );
  }

  /**
   * Validate token exists and is active
   * Only checks:
   * 1. Token exists and isActive = true
   * 2. Absolute expiration (1 hour)
   * 3. Browser close detection (2+ minutes no heartbeat)
   * 
   * NOTE: Frontend sends heartbeat every 2 minutes. If no heartbeat for 2+ minutes → browser closed
   * NOTE: Inactivity expiration (5 minutes) is handled by frontend
   */
  async validateToken(token: string): Promise<UserToken | null> {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes - no heartbeat = browser closed

    const userToken = await this.tokenRepository.findOne({
      where: { token, isActive: true },
    });

    if (!userToken) return null;

    // soonami-dashboard-frontend: no expiry logic (long-lived session)
    if (userToken.frontendService === DASHBOARD_FRONTEND) {
      return userToken;
    }

    // Check if token expired (1 hour absolute)
    if (userToken.expiresAt <= now) {
      await this.expireToken(token);
      return null;
    }

    // Check if browser closed (no heartbeat for 2+ minutes)
    // Frontend sends heartbeat every 2 minutes. If no heartbeat → browser closed
    if (userToken.lastActivityAt <= twoMinutesAgo) {
      const minutesSinceActivity = Math.floor((now.getTime() - userToken.lastActivityAt.getTime()) / (60 * 1000));
      console.log(`[TOKEN VALIDATION] ❌ Token expired - No heartbeat for ${minutesSinceActivity} minutes (browser closed)`);
      console.log(`[TOKEN VALIDATION] Frontend: ${userToken.frontendService || 'unknown'}, Username: ${userToken.username}`);
      await this.expireToken(token);
      return null;
    }

    return userToken;
  }

  /**
   * Cleanup expired tokens (called by interval service)
   * Only expires tokens that are:
   * 1. Absolutely expired (expiresAt < now) - 1 hour from creation
   * 2. Browser closed detection (lastActivityAt < 2 minutes ago) - no heartbeat received
   * 
   * NOTE: Frontend sends heartbeat every 2 minutes. If no heartbeat for 2+ minutes → browser closed
   * NOTE: Inactivity expiration (5 minutes) is handled by frontend calling /auth/expire-inactivity
   */
  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes - no heartbeat = browser closed
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000); // Safety buffer

    console.log(`[CLEANUP] Running cleanup at ${now.toISOString()}`);
    console.log(`[CLEANUP] Only expiring: absolute expiration (1 hour) and browser close (2+ min no heartbeat)`);

    // First, get tokens that should be expired for logging
    const tokensToExpire = await this.tokenRepository.find({
      where: {
        isActive: true,
      },
    });

    const expiredByTime = tokensToExpire.filter(t => t.expiresAt <= now && t.frontendService !== DASHBOARD_FRONTEND);
    const expiredByBrowserClose = tokensToExpire.filter(
      t => t.expiresAt > now && t.lastActivityAt <= twoMinutesAgo && t.frontendService !== DASHBOARD_FRONTEND
    );
    
    // Group by frontend service for logging
    const expiredByFrontend: Record<string, number> = {};
    expiredByBrowserClose.forEach(t => {
      const service = t.frontendService || 'unknown';
      expiredByFrontend[service] = (expiredByFrontend[service] || 0) + 1;
    });

    console.log(`[CLEANUP] Found ${expiredByTime.length} tokens expired by time, ${expiredByBrowserClose.length} by browser close (no heartbeat for 2+ minutes)`);
    if (Object.keys(expiredByFrontend).length > 0) {
      console.log(`[CLEANUP] Browser close breakdown by frontend:`, expiredByFrontend);
    }

    // Expire tokens that are past absolute expiration (1 hour)
    // Exclude soonami-dashboard-frontend (no expiry for dashboard)
    let expiredByTimeCount = 0;
    if (expiredByTime.length > 0) {
      const result = await this.tokenRepository
        .createQueryBuilder()
        .update(UserToken)
        .set({ isActive: false })
        .where('isActive = :isActive', { isActive: true })
        .andWhere('expiresAt <= :now', { now })
        .andWhere('(frontendService IS NULL OR frontendService != :dashboard)', { dashboard: DASHBOARD_FRONTEND })
        .execute();
      expiredByTimeCount = result.affected || 0;
    }

    // Expire tokens that have no heartbeat for 2+ minutes (browser closed)
    // Exclude soonami-dashboard-frontend (no browser-close expiry for dashboard)
    // Frontend sends heartbeat every 2 minutes. If no heartbeat received → browser closed
    let expiredByBrowserCloseCount = 0;
    if (expiredByBrowserClose.length > 0) {
      // Log which tokens will be expired (before expiring)
      expiredByBrowserClose.forEach(t => {
        if (t.frontendService === DASHBOARD_FRONTEND) return;
        const minutesSinceActivity = Math.floor((now.getTime() - t.lastActivityAt.getTime()) / (60 * 1000));
        console.log(`[CLEANUP] 🔍 Token for ${t.username} (frontend: ${t.frontendService || 'unknown'}) - No heartbeat for ${minutesSinceActivity} minutes - Will expire (browser closed)`);
      });

      const result = await this.tokenRepository
        .createQueryBuilder()
        .update(UserToken)
        .set({ isActive: false })
        .where('isActive = :isActive', { isActive: true })
        .andWhere('lastActivityAt <= :twoMinutesAgo', { twoMinutesAgo })
        .andWhere('expiresAt > :now', { now })
        .andWhere('"createdAt" <= :threeMinutesAgo', { threeMinutesAgo })
        .andWhere('(frontendService IS NULL OR frontendService != :dashboard)', { dashboard: DASHBOARD_FRONTEND })
        .execute();
      expiredByBrowserCloseCount = result.affected || 0;

      if (expiredByBrowserCloseCount > 0) {
        console.log(`[CLEANUP] ✅ Expired ${expiredByBrowserCloseCount} tokens due to browser close (no heartbeat for 2+ minutes)`);
        if (Object.keys(expiredByFrontend).length > 0) {
          console.log(`[CLEANUP] 📊 Breakdown by frontend:`, expiredByFrontend);
        }
      }
    }

    console.log(`[CLEANUP] Summary: ${expiredByTimeCount} tokens expired by absolute expiration, ${expiredByBrowserCloseCount} tokens expired by browser close`);

    return expiredByTimeCount + expiredByBrowserCloseCount;
  }

  /**
   * Get token by token string
   */
  async getTokenByString(token: string): Promise<UserToken | null> {
    return await this.tokenRepository.findOne({
      where: { token },
    });
  }

  /** Alias for getTokenByString (used by auth.service). */
  async getTokenByTokenString(token: string): Promise<UserToken | null> {
    return this.getTokenByString(token);
  }
}
