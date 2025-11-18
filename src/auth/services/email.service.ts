import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
    const useTls = process.env.SMTP_USE_TLS !== 'false';

    if (smtpUser && smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: !useTls,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    try {
      // In development, if SMTP is not configured, just log the code
      if (!this.transporter) {
        this.logger.warn(`SMTP not configured. Verification code for ${email}: ${code}`);
        return true; // Return true in dev mode to allow testing
      }

      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        to: email,
        subject: 'Your Login Verification Code',
        text: `
Hello,

Your verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Anna Crowdtale Team
`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification code sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${email}: ${error}`);
      return false;
    }
  }
}

