import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore - mailgun.js types may not be available
import Mailgun from 'mailgun.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailgunClient: any;
  private smtpTransporter: any;
  private domain: string;
  private mailgunFromEmail: string;
  private smtpFromEmail: string;

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${domain}`;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser || fromEmail;

    if (apiKey && domain) {
      try {
        // Use require for form-data to ensure compatibility with mailgun.js
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const formData = require('form-data');
        const mailgun = new Mailgun(formData);
        this.mailgunClient = mailgun.client({
          username: 'api',
          key: apiKey,
        });
        this.domain = domain;
        this.mailgunFromEmail = fromEmail;
        this.logger.log('Mailgun email service initialized successfully');
      } catch (error) {
        this.logger.error(`Failed to initialize Mailgun client: ${error}`);
        if (error instanceof Error) {
          this.logger.error(`Error details: ${error.message}`);
        }
        this.logger.warn('Email sending will be disabled');
      }
    } else {
      this.logger.warn('Mailgun not configured. Email sending will be disabled.');
    }

    if (smtpHost && smtpUser && smtpPassword) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodemailer = require('nodemailer');
        const secure = smtpPort === 465;
        this.smtpTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });
        this.smtpFromEmail = smtpFromEmail;
        this.logger.log('SMTP email fallback initialized successfully');
      } catch (error) {
        this.logger.error(`Failed to initialize SMTP transporter: ${error}`);
      }
    } else {
      this.logger.warn('SMTP fallback not configured.');
    }
  }

  private buildMessageData(email: string, code: string) {
    return {
      to: email,
      subject: 'Your Login Verification Code - Anna Crowdtale',
      text: `
Hello,

Your Anna login code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Anna Crowdtale Team
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .code-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      margin: 20px 0;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      margin: 10px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <h2>Hello,</h2>
  <p>Your Anna login code is:</p>
  <div class="code-container">
    <div class="code">${code}</div>
  </div>
  <p>This code will expire in 10 minutes.</p>
  <p>If you didn't request this code, please ignore this email.</p>
  <div class="footer">
    <p>Best regards,<br>Anna Crowdtale Team</p>
  </div>
</body>
</html>
`,
    };
  }

  private isRateLimitedError(error: any): boolean {
    const statusCode = error?.status || error?.statusCode || error?.details?.status;
    const errorText = String(error?.message || error || '').toLowerCase();
    return statusCode === 429 || errorText.includes('too many requests') || errorText.includes('429');
  }

  private async sendViaSmtp(email: string, code: string): Promise<boolean> {
    if (!this.smtpTransporter) {
      return false;
    }

    const message = this.buildMessageData(email, code);
    await this.smtpTransporter.sendMail({
      from: this.smtpFromEmail,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    this.logger.log(`Verification code sent to ${email} via SMTP fallback`);
    return true;
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const messageData = this.buildMessageData(email, code);

    try {
      if (this.mailgunClient && this.domain) {
        const response = await this.mailgunClient.messages.create(this.domain, {
          from: this.mailgunFromEmail,
          ...messageData,
        });
        this.logger.log(`Verification code sent to ${email} via Mailgun. Message ID: ${response.id}`);
        return true;
      }

      if (this.smtpTransporter) {
        return this.sendViaSmtp(email, code);
      }

      this.logger.warn(`No email provider configured. Verification code for ${email}: ${code}`);
      return true;
    } catch (error) {
      if (this.isRateLimitedError(error) && this.smtpTransporter) {
        this.logger.warn(`Mailgun rate-limited for ${email}. Trying SMTP fallback.`);
        try {
          return await this.sendViaSmtp(email, code);
        } catch (smtpError) {
          this.logger.error(`SMTP fallback also failed for ${email}: ${smtpError}`);
          return false;
        }
      }

      this.logger.error(`Failed to send verification code to ${email}: ${error}`);
      return false;
    }
  }
}

