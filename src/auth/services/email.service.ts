import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore - mailgun.js types may not be available
import Mailgun from 'mailgun.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailgunClient: any;
  private domain: string;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${domain}`;

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
        this.fromEmail = fromEmail;
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
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    try {
      // In development, if Mailgun is not configured, just log the code
      if (!this.mailgunClient || !this.domain) {
        this.logger.warn(`Mailgun not configured. Verification code for ${email}: ${code}`);
        return true; // Return true in dev mode to allow testing
      }

      const messageData = {
        from: this.fromEmail,
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

      const response = await this.mailgunClient.messages.create(this.domain, messageData);
      this.logger.log(`Verification code sent to ${email} via Mailgun. Message ID: ${response.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${email} via Mailgun: ${error}`);
      return false;
    }
  }
}

