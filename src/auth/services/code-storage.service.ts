import { Injectable, Logger } from '@nestjs/common';

interface CodeData {
  code: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

interface RateLimitResult {
  allowed: boolean;
  message: string;
}

@Injectable()
export class CodeStorageService {
  private readonly logger = new Logger(CodeStorageService.name);
  private readonly codes: Map<string, CodeData> = new Map();
  private readonly emailRequestTimestamps: Map<string, number[]> = new Map();
  private readonly ipRequestTimestamps: Map<string, number[]> = new Map();
  private readonly ipDailyRequestCount: Map<string, { dateKey: string; count: number }> = new Map();
  private readonly emailLastRequestAt: Map<string, number> = new Map();
  private readonly codeExpiryMinutes = 10;
  private readonly codeLength = 6;
  private readonly resendCooldownMs = 60 * 1000;
  private readonly emailWindowMs = 10 * 60 * 1000;
  private readonly emailWindowLimit = 3;
  private readonly ipWindowMs = 10 * 60 * 1000;
  private readonly ipWindowLimit = 10;
  private readonly ipDailyLimit = 100;

  generateCode(): string {
    return Array.from({ length: this.codeLength }, () =>
      Math.floor(Math.random() * 10),
    ).join('');
  }

  private pruneWindow(timestamps: number[], now: number, windowMs: number): number[] {
    return timestamps.filter((timestamp) => now - timestamp <= windowMs);
  }

  private getDateKey(now: Date): string {
    return now.toISOString().split('T')[0];
  }

  checkRequestRateLimit(email: string, rawClientIp?: string): RateLimitResult {
    const nowDate = new Date();
    const now = nowDate.getTime();
    const emailLower = email.toLowerCase().trim();
    const clientIp = (rawClientIp || 'unknown').trim();

    const lastSentAt = this.emailLastRequestAt.get(emailLower);
    if (lastSentAt) {
      const elapsed = now - lastSentAt;
      if (elapsed < this.resendCooldownMs) {
        const retryAfter = Math.ceil((this.resendCooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          message: `Please wait ${retryAfter} seconds before requesting a new code.`,
        };
      }
    }

    const emailTimestamps = this.pruneWindow(
      this.emailRequestTimestamps.get(emailLower) || [],
      now,
      this.emailWindowMs,
    );
    if (emailTimestamps.length >= this.emailWindowLimit) {
      return {
        allowed: false,
        message: 'Too many verification requests for this email. Please try again later.',
      };
    }

    const ipTimestamps = this.pruneWindow(
      this.ipRequestTimestamps.get(clientIp) || [],
      now,
      this.ipWindowMs,
    );
    if (ipTimestamps.length >= this.ipWindowLimit) {
      return {
        allowed: false,
        message: 'Too many requests from this network. Please try again later.',
      };
    }

    const currentDateKey = this.getDateKey(nowDate);
    const dailyCounter = this.ipDailyRequestCount.get(clientIp);
    const currentDailyCount =
      dailyCounter && dailyCounter.dateKey === currentDateKey ? dailyCounter.count : 0;

    if (currentDailyCount >= this.ipDailyLimit) {
      return {
        allowed: false,
        message: 'Daily verification request limit reached from this network.',
      };
    }

    emailTimestamps.push(now);
    ipTimestamps.push(now);

    this.emailRequestTimestamps.set(emailLower, emailTimestamps);
    this.ipRequestTimestamps.set(clientIp, ipTimestamps);
    this.ipDailyRequestCount.set(clientIp, {
      dateKey: currentDateKey,
      count: currentDailyCount + 1,
    });
    this.emailLastRequestAt.set(emailLower, now);

    return { allowed: true, message: 'ok' };
  }

  storeCode(email: string): string {
    const emailLower = email.toLowerCase().trim();
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.codeExpiryMinutes);

    // If there's an existing code, log it for debugging
    const existingCode = this.codes.get(emailLower);
    if (existingCode) {
      this.logger.warn(
        `Overwriting existing code for ${email}. Old code expires at ${existingCode.expiresAt}, attempts: ${existingCode.attempts}`,
      );
    }

    this.codes.set(emailLower, {
      code,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
    });

    this.logger.log(
      `Stored verification code for ${email} (code: ${code}, expires at ${expiresAt})`,
    );
    return code;
  }

  /** Remove the stored code for this email (e.g. after successful login). */
  consumeCode(email: string): void {
    const emailLower = email.toLowerCase().trim();
    if (this.codes.has(emailLower)) {
      this.codes.delete(emailLower);
      this.logger.log(`Code consumed for ${email}`);
    }
  }

  /** Validate code without consuming it (e.g. for revoke-all-sessions so the same code can then be used to verify and log in). */
  validateCodeWithoutConsuming(email: string, code: string): boolean {
    const emailLower = email.toLowerCase().trim();
    const codeTrimmed = code.trim();
    const codeData = this.codes.get(emailLower);
    if (!codeData) return false;
    const now = new Date();
    if (now > codeData.expiresAt) return false;
    if (codeData.attempts >= codeData.maxAttempts) return false;
    return codeData.code === codeTrimmed;
  }

  verifyCode(email: string, code: string): boolean {
    const emailLower = email.toLowerCase().trim();
    const codeTrimmed = code.trim();

    const codeData = this.codes.get(emailLower);

    if (!codeData) {
      this.logger.warn(`No code found for ${email}. Available emails: ${Array.from(this.codes.keys()).join(', ')}`);
      return false;
    }

    // Check if code has expired
    const now = new Date();
    if (now > codeData.expiresAt) {
      this.logger.warn(`Code expired for ${email}. Expired at ${codeData.expiresAt}, current time: ${now}`);
      this.codes.delete(emailLower);
      return false;
    }

    // Check if too many attempts
    if (codeData.attempts >= codeData.maxAttempts) {
      this.logger.warn(`Too many attempts for ${email} (${codeData.attempts}/${codeData.maxAttempts})`);
      this.codes.delete(emailLower);
      return false;
    }

    // Increment attempts BEFORE verification (so failed attempts are counted)
    codeData.attempts++;

    // Verify code (trimmed comparison)
    if (codeData.code === codeTrimmed) {
      // Code is valid, remove it
      this.codes.delete(emailLower);
      this.logger.log(`Code verified successfully for ${email} (attempt ${codeData.attempts})`);
      return true;
    } else {
      this.logger.warn(
        `Invalid code attempt for ${email} (attempt ${codeData.attempts}/${codeData.maxAttempts}). Expected: ${codeData.code}, Got: ${codeTrimmed}`,
      );
      return false;
    }
  }

  getCode(email: string): string | null {
    const emailLower = email.toLowerCase();
    const codeData = this.codes.get(emailLower);
    if (codeData && new Date() <= codeData.expiresAt) {
      return codeData.code;
    }
    if (codeData) {
      this.codes.delete(emailLower);
    }
    return null;
  }

  cleanupExpired(): void {
    const now = new Date();
    const expiredEmails: string[] = [];
    for (const [email, data] of this.codes.entries()) {
      if (now > data.expiresAt) {
        expiredEmails.push(email);
      }
    }
    expiredEmails.forEach((email) => this.codes.delete(email));
    if (expiredEmails.length > 0) {
      this.logger.log(`Cleaned up ${expiredEmails.length} expired codes`);
    }

    const currentMs = now.getTime();
    for (const [email, timestamps] of this.emailRequestTimestamps.entries()) {
      const pruned = this.pruneWindow(timestamps, currentMs, this.emailWindowMs);
      if (pruned.length === 0) {
        this.emailRequestTimestamps.delete(email);
      } else {
        this.emailRequestTimestamps.set(email, pruned);
      }
    }

    for (const [ip, timestamps] of this.ipRequestTimestamps.entries()) {
      const pruned = this.pruneWindow(timestamps, currentMs, this.ipWindowMs);
      if (pruned.length === 0) {
        this.ipRequestTimestamps.delete(ip);
      } else {
        this.ipRequestTimestamps.set(ip, pruned);
      }
    }

    const currentDateKey = this.getDateKey(now);
    for (const [ip, dailyCounter] of this.ipDailyRequestCount.entries()) {
      if (dailyCounter.dateKey !== currentDateKey) {
        this.ipDailyRequestCount.delete(ip);
      }
    }

    for (const [email, timestamp] of this.emailLastRequestAt.entries()) {
      if (currentMs - timestamp > this.resendCooldownMs) {
        this.emailLastRequestAt.delete(email);
      }
    }
  }

  // Debug method to check stored codes
  getStoredCodesInfo(): { email: string; attempts: number; expiresAt: Date; hasCode: boolean }[] {
    return Array.from(this.codes.entries()).map(([email, data]) => ({
      email,
      attempts: data.attempts,
      expiresAt: data.expiresAt,
      hasCode: !!data.code,
    }));
  }
}

