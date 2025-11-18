import { Injectable, Logger } from '@nestjs/common';

interface CodeData {
  code: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

@Injectable()
export class CodeStorageService {
  private readonly logger = new Logger(CodeStorageService.name);
  private readonly codes: Map<string, CodeData> = new Map();
  private readonly codeExpiryMinutes = 10;
  private readonly codeLength = 6;

  generateCode(): string {
    return Array.from({ length: this.codeLength }, () =>
      Math.floor(Math.random() * 10),
    ).join('');
  }

  storeCode(email: string): string {
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.codeExpiryMinutes);

    this.codes.set(email.toLowerCase(), {
      code,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
    });

    this.logger.log(
      `Stored verification code for ${email} (expires at ${expiresAt})`,
    );
    return code;
  }

  verifyCode(email: string, code: string): boolean {
    const emailLower = email.toLowerCase();
    const codeData = this.codes.get(emailLower);

    if (!codeData) {
      this.logger.warn(`No code found for ${email}`);
      return false;
    }

    // Check if code has expired
    if (new Date() > codeData.expiresAt) {
      this.logger.warn(`Code expired for ${email}`);
      this.codes.delete(emailLower);
      return false;
    }

    // Check if too many attempts
    if (codeData.attempts >= codeData.maxAttempts) {
      this.logger.warn(`Too many attempts for ${email}`);
      this.codes.delete(emailLower);
      return false;
    }

    // Increment attempts
    codeData.attempts++;

    // Verify code
    if (codeData.code === code) {
      // Code is valid, remove it
      this.codes.delete(emailLower);
      this.logger.log(`Code verified successfully for ${email}`);
      return true;
    } else {
      this.logger.warn(
        `Invalid code attempt for ${email} (attempt ${codeData.attempts})`,
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
  }
}

