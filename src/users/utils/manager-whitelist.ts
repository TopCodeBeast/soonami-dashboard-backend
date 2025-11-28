/**
 * Manager Whitelist Utility
 * Only whitelisted emails can create, update, or delete users with manager role
 */
export class ManagerWhitelist {
  private static whitelist: string[] = [];

  /**
   * Initialize whitelist from environment variable
   * Format: comma-separated emails (e.g., "email1@example.com,email2@example.com")
   */
  static initialize() {
    const whitelistEnv = process.env.MANAGER_WHITELIST || 'maxb47163@gmail.com';
    this.whitelist = whitelistEnv
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);
    
    console.log(`✅ Manager whitelist initialized with ${this.whitelist.length} email(s): ${this.whitelist.join(', ')}`);
  }

  /**
   * Check if an email is whitelisted to manage managers
   * @param email - Email address to check
   * @returns true if email is whitelisted
   */
  static isWhitelisted(email: string): boolean {
    if (!email) return false;
    return this.whitelist.includes(email.toLowerCase().trim());
  }

  /**
   * Get all whitelisted emails
   * @returns Array of whitelisted emails
   */
  static getWhitelist(): string[] {
    return [...this.whitelist];
  }
}

// Initialize on module load
ManagerWhitelist.initialize();

