import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TokenService } from './services/token.service';

/**
 * Service to periodically clean up expired tokens
 * Only checks for:
 * 1. Absolute expiration (1 hour from creation)
 * 2. Browser close detection (no heartbeat for 2+ minutes)
 * 
 * NOTE: Frontend sends heartbeat every 2 minutes. If no heartbeat for 2+ minutes → browser closed
 * NOTE: Inactivity expiration (5 minutes) is handled by frontend calling /auth/expire-inactivity
 */
@Injectable()
export class TokenCleanupService implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 1 * 60 * 1000; // 1 minute

  constructor(private tokenService: TokenService) {}

  onModuleInit() {
    // Run cleanup immediately on startup (but delay slightly to avoid race conditions)
    setTimeout(() => {
      this.tokenService.cleanupExpiredTokens().then((count) => {
        console.log(`✅ Initial token cleanup completed: ${count} tokens expired`);
      }).catch((err) => {
        console.error('Error during initial token cleanup:', err);
      });
    }, 5000); // Wait 5 seconds before first cleanup

    // Schedule periodic cleanup
    // Only expires tokens that are:
    // 1. Absolutely expired (1 hour)
    // 2. Browser closed (no activity for 6+ minutes)
    this.cleanupInterval = setInterval(() => {
      this.tokenService.cleanupExpiredTokens().then((count) => {
        if (count > 0) {
          console.log(`🧹 Token cleanup: ${count} tokens expired (absolute expiration or browser close)`);
        }
      }).catch((err) => {
        console.error('Error during periodic token cleanup:', err);
      });
    }, this.CLEANUP_INTERVAL_MS);

    console.log('✅ Token cleanup service started (runs every 1 minute)');
    console.log('📝 Only expires: absolute expiration (1 hour) and browser close (2+ min no heartbeat)');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Token cleanup service stopped');
    }
  }
}
