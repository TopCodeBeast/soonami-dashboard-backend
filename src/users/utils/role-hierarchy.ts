import { UserRole } from '../entities/user.entity';

/**
 * Role hierarchy utility for managing role-based access control
 * Hierarchy: MANAGER > ADMIN > USER
 */
export class RoleHierarchy {
  private static readonly ROLE_LEVELS = {
    [UserRole.MANAGER]: 3,
    [UserRole.ADMIN]: 2,
    [UserRole.USER]: 1,
  };

  /**
   * Check if a role has permission to perform an action on another role
   * @param currentRole - The role of the current user
   * @param targetRole - The role of the target user
   * @returns true if current role can manage target role
   */
  static canManageRole(currentRole: UserRole, targetRole: UserRole): boolean {
    const currentLevel = this.ROLE_LEVELS[currentRole];
    const targetLevel = this.ROLE_LEVELS[targetRole];
    
    // Can only manage roles lower than current role
    return currentLevel > targetLevel;
  }

  /**
   * Check if a role has permission to access admin features
   * @param role - The role to check
   * @returns true if role can access admin features
   */
  static canAccessAdminFeatures(role: UserRole): boolean {
    return role === UserRole.MANAGER || role === UserRole.ADMIN;
  }

  /**
   * Check if a role has permission to access manager features
   * @param role - The role to check
   * @returns true if role can access manager features
   */
  static canAccessManagerFeatures(role: UserRole): boolean {
    return role === UserRole.MANAGER;
  }

  /**
   * Get all roles that a role can manage
   * @param role - The role to check
   * @returns Array of roles that can be managed
   */
  static getManageableRoles(role: UserRole): UserRole[] {
    const currentLevel = this.ROLE_LEVELS[role];
    return Object.entries(this.ROLE_LEVELS)
      .filter(([_, level]) => level < currentLevel)
      .map(([roleName, _]) => roleName as UserRole);
  }

  /**
   * Get role level for comparison
   * @param role - The role to get level for
   * @returns Numeric level (higher = more permissions)
   */
  static getRoleLevel(role: UserRole): number {
    return this.ROLE_LEVELS[role];
  }
}
