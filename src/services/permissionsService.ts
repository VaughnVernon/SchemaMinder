import { UserRole } from '../types/user';

/**
 * Permission definitions for different resources and actions
 */
export interface Permission {
  resource: string;
  action: string;
  roles: UserRole[];
}

/**
 * Resource types in the schema registry
 */
export const RESOURCES = {
  PRODUCTS: 'products',
  DOMAINS: 'domains', 
  CONTEXTS: 'contexts',
  SCHEMAS: 'schemas',
  SCHEMA_VERSIONS: 'schema_versions',
  USER_MANAGEMENT: 'user_management',
  SYSTEM_SETTINGS: 'system_settings'
} as const;

/**
 * Action types that can be performed on resources
 */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  PUBLISH: 'publish',
  MANAGE: 'manage'
} as const;

/**
 * Role hierarchy (higher roles inherit permissions from lower roles)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 1,
  viewer: 2,
  editor: 3,
  admin: 4
};

/**
 * Permission matrix defining what roles can do what actions on which resources
 */
export const PERMISSIONS: Permission[] = [
  // Products
  { resource: RESOURCES.PRODUCTS, action: ACTIONS.READ, roles: ['guest', 'viewer', 'editor', 'admin'] },
  { resource: RESOURCES.PRODUCTS, action: ACTIONS.CREATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.PRODUCTS, action: ACTIONS.UPDATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.PRODUCTS, action: ACTIONS.DELETE, roles: ['admin'] },

  // Domains
  { resource: RESOURCES.DOMAINS, action: ACTIONS.READ, roles: ['guest', 'viewer', 'editor', 'admin'] },
  { resource: RESOURCES.DOMAINS, action: ACTIONS.CREATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.DOMAINS, action: ACTIONS.UPDATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.DOMAINS, action: ACTIONS.DELETE, roles: ['admin'] },

  // Contexts
  { resource: RESOURCES.CONTEXTS, action: ACTIONS.READ, roles: ['guest', 'viewer', 'editor', 'admin'] },
  { resource: RESOURCES.CONTEXTS, action: ACTIONS.CREATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.CONTEXTS, action: ACTIONS.UPDATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.CONTEXTS, action: ACTIONS.DELETE, roles: ['admin'] },

  // Schemas
  { resource: RESOURCES.SCHEMAS, action: ACTIONS.READ, roles: ['guest', 'viewer', 'editor', 'admin'] },
  { resource: RESOURCES.SCHEMAS, action: ACTIONS.CREATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.SCHEMAS, action: ACTIONS.UPDATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.SCHEMAS, action: ACTIONS.DELETE, roles: ['admin'] },

  // Schema Versions
  { resource: RESOURCES.SCHEMA_VERSIONS, action: ACTIONS.READ, roles: ['guest', 'viewer', 'editor', 'admin'] },
  { resource: RESOURCES.SCHEMA_VERSIONS, action: ACTIONS.CREATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.SCHEMA_VERSIONS, action: ACTIONS.UPDATE, roles: ['editor', 'admin'] },
  { resource: RESOURCES.SCHEMA_VERSIONS, action: ACTIONS.DELETE, roles: ['admin'] },
  { resource: RESOURCES.SCHEMA_VERSIONS, action: ACTIONS.APPROVE, roles: ['admin'] },
  { resource: RESOURCES.SCHEMA_VERSIONS, action: ACTIONS.PUBLISH, roles: ['admin'] },

  // User Management
  { resource: RESOURCES.USER_MANAGEMENT, action: ACTIONS.READ, roles: ['admin'] },
  { resource: RESOURCES.USER_MANAGEMENT, action: ACTIONS.CREATE, roles: ['admin'] },
  { resource: RESOURCES.USER_MANAGEMENT, action: ACTIONS.UPDATE, roles: ['admin'] },
  { resource: RESOURCES.USER_MANAGEMENT, action: ACTIONS.DELETE, roles: ['admin'] },
  { resource: RESOURCES.USER_MANAGEMENT, action: ACTIONS.MANAGE, roles: ['admin'] },

  // System Settings
  { resource: RESOURCES.SYSTEM_SETTINGS, action: ACTIONS.READ, roles: ['admin'] },
  { resource: RESOURCES.SYSTEM_SETTINGS, action: ACTIONS.UPDATE, roles: ['admin'] },
  { resource: RESOURCES.SYSTEM_SETTINGS, action: ACTIONS.MANAGE, roles: ['admin'] }
];

/**
 * Check if a user with given roles has permission to perform an action on a resource
 */
export const hasPermission = (
  userRoles: UserRole[] = [],
  resource: string,
  action: string
): boolean => {
  // Handle null/undefined userRoles
  if (!userRoles) {
    return false;
  }

  const permission = PERMISSIONS.find(
    p => p.resource === resource && p.action === action
  );

  if (!permission) {
    // If no permission is defined, deny by default
    return false;
  }

  // Check if user has any of the required roles
  return userRoles.some(role => permission.roles.includes(role));
};

/**
 * Get all permissions for a user with given roles
 */
export const getUserPermissions = (userRoles: UserRole[] = []): Permission[] => {
  // Handle null/undefined userRoles
  if (!userRoles) {
    return [];
  }
  
  return PERMISSIONS.filter(permission =>
    userRoles.some(role => permission.roles.includes(role))
  );
};

/**
 * Check if a user role has higher or equal level than another role
 */
export const hasRoleLevel = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Get the highest role from a list of user roles
 */
export const getHighestRole = (userRoles: UserRole[] = []): UserRole | null => {
  // Handle null/undefined userRoles
  if (!userRoles || userRoles.length === 0) return null;
  
  return userRoles.reduce((highest, current) => {
    return ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest;
  });
};

/**
 * Check if user can perform action based on role hierarchy
 */
export const canPerformAction = (
  userRoles: UserRole[] = [],
  resource: string,
  action: string,
  useHierarchy = true
): boolean => {
  // Handle null/undefined userRoles
  if (!userRoles) {
    return false;
  }

  if (useHierarchy) {
    // Check with role hierarchy - higher roles inherit lower role permissions
    const permission = PERMISSIONS.find(
      p => p.resource === resource && p.action === action
    );

    if (!permission) return false;

    // Check if user has a role that meets the minimum requirement
    const minRequiredRole = permission.roles.reduce((min, role) => 
      ROLE_HIERARCHY[role] < ROLE_HIERARCHY[min] ? role : min
    );

    return userRoles.some(role => 
      ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRequiredRole]
    );
  }

  // Use exact permission matching
  return hasPermission(userRoles, resource, action);
};

/**
 * Permission check utilities for common operations
 */
export const PermissionChecker = {
  canCreate: (userRoles: UserRole[], resource: string) => 
    hasPermission(userRoles, resource, ACTIONS.CREATE),
  
  canRead: (userRoles: UserRole[], resource: string) => 
    hasPermission(userRoles, resource, ACTIONS.READ),
  
  canUpdate: (userRoles: UserRole[], resource: string) => 
    hasPermission(userRoles, resource, ACTIONS.UPDATE),
  
  canDelete: (userRoles: UserRole[], resource: string) => 
    hasPermission(userRoles, resource, ACTIONS.DELETE),
  
  canManage: (userRoles: UserRole[], resource: string) => 
    hasPermission(userRoles, resource, ACTIONS.MANAGE),
  
  isAdmin: (userRoles: UserRole[]) => 
    userRoles.includes('admin'),
  
  isEditor: (userRoles: UserRole[]) => 
    userRoles.includes('editor') || userRoles.includes('admin'),
  
  isViewer: (userRoles: UserRole[]) => 
    userRoles.some(role => ['viewer', 'editor', 'admin'].includes(role))
};