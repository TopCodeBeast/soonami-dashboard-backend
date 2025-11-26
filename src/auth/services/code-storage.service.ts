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

