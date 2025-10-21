import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  hasPermission,
  getUserPermissions,
  getHighestRole,
  canPerformAction,
  PermissionChecker,
  RESOURCES,
  ACTIONS
} from '../services/permissionsService';
import { UserRole } from '../types/user';

/**
 * Custom hook for checking user permissions within React components
 */
export const usePermissions = () => {
  const { authState } = useAuth();
  
  const userRoles = useMemo(() => {
    return authState.user?.roles || [];
  }, [authState.user?.roles]);

  const permissions = useMemo(() => {
    return getUserPermissions(userRoles);
  }, [userRoles]);

  const highestRole = useMemo(() => {
    return getHighestRole(userRoles);
  }, [userRoles]);

  // Basic permission checks
  const can = useMemo(() => ({
    create: (resource: string) => hasPermission(userRoles, resource, ACTIONS.CREATE),
    read: (resource: string) => hasPermission(userRoles, resource, ACTIONS.READ),
    update: (resource: string) => hasPermission(userRoles, resource, ACTIONS.UPDATE),
    delete: (resource: string) => hasPermission(userRoles, resource, ACTIONS.DELETE),
    approve: (resource: string) => hasPermission(userRoles, resource, ACTIONS.APPROVE),
    publish: (resource: string) => hasPermission(userRoles, resource, ACTIONS.PUBLISH),
    manage: (resource: string) => hasPermission(userRoles, resource, ACTIONS.MANAGE),
    perform: (resource: string, action: string, useHierarchy = true) => 
      canPerformAction(userRoles, resource, action, useHierarchy)
  }), [userRoles]);

  // Resource-specific permission checks
  const canAccessProducts = useMemo(() => ({
    create: can.create(RESOURCES.PRODUCTS),
    read: can.read(RESOURCES.PRODUCTS),
    update: can.update(RESOURCES.PRODUCTS),
    delete: can.delete(RESOURCES.PRODUCTS)
  }), [can]);

  const canAccessDomains = useMemo(() => ({
    create: can.create(RESOURCES.DOMAINS),
    read: can.read(RESOURCES.DOMAINS),
    update: can.update(RESOURCES.DOMAINS),
    delete: can.delete(RESOURCES.DOMAINS)
  }), [can]);

  const canAccessContexts = useMemo(() => ({
    create: can.create(RESOURCES.CONTEXTS),
    read: can.read(RESOURCES.CONTEXTS),
    update: can.update(RESOURCES.CONTEXTS),
    delete: can.delete(RESOURCES.CONTEXTS)
  }), [can]);

  const canAccessSchemas = useMemo(() => ({
    create: can.create(RESOURCES.SCHEMAS),
    read: can.read(RESOURCES.SCHEMAS),
    update: can.update(RESOURCES.SCHEMAS),
    delete: can.delete(RESOURCES.SCHEMAS)
  }), [can]);

  const canAccessSchemaVersions = useMemo(() => ({
    create: can.create(RESOURCES.SCHEMA_VERSIONS),
    read: can.read(RESOURCES.SCHEMA_VERSIONS),
    update: can.update(RESOURCES.SCHEMA_VERSIONS),
    delete: can.delete(RESOURCES.SCHEMA_VERSIONS),
    approve: can.approve(RESOURCES.SCHEMA_VERSIONS),
    publish: can.publish(RESOURCES.SCHEMA_VERSIONS)
  }), [can]);

  const canAccessUserManagement = useMemo(() => ({
    read: can.read(RESOURCES.USER_MANAGEMENT),
    create: can.create(RESOURCES.USER_MANAGEMENT),
    update: can.update(RESOURCES.USER_MANAGEMENT),
    delete: can.delete(RESOURCES.USER_MANAGEMENT),
    manage: can.manage(RESOURCES.USER_MANAGEMENT)
  }), [can]);

  const canAccessSystemSettings = useMemo(() => ({
    read: can.read(RESOURCES.SYSTEM_SETTINGS),
    update: can.update(RESOURCES.SYSTEM_SETTINGS),
    manage: can.manage(RESOURCES.SYSTEM_SETTINGS)
  }), [can]);

  // Role-based checks
  const is = useMemo(() => ({
    admin: PermissionChecker.isAdmin(userRoles),
    editor: PermissionChecker.isEditor(userRoles),
    viewer: PermissionChecker.isViewer(userRoles),
    guest: userRoles.includes('guest')
  }), [userRoles]);

  // Utility function to check if user has specific role
  const hasRole = (role: UserRole) => userRoles.includes(role);

  // Utility function to check if user has any of the specified roles
  const hasAnyRole = (roles: UserRole[]) => roles.some(role => userRoles.includes(role));

  // Utility function to check if user has all of the specified roles
  const hasAllRoles = (roles: UserRole[]) => roles.every(role => userRoles.includes(role));

  return {
    // User info
    userRoles,
    highestRole,
    permissions,
    
    // General permission checks
    can,
    hasPermission: (resource: string, action: string) => hasPermission(userRoles, resource, action),
    
    // Resource-specific permissions
    products: canAccessProducts,
    domains: canAccessDomains,
    contexts: canAccessContexts,
    schemas: canAccessSchemas,
    schemaVersions: canAccessSchemaVersions,
    userManagement: canAccessUserManagement,
    systemSettings: canAccessSystemSettings,
    
    // Role checks
    is,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // Utility constants
    RESOURCES,
    ACTIONS
  };
};

/**
 * Hook for checking permissions with loading state
 */
export const usePermissionsWithLoading = () => {
  const { authState } = useAuth();
  const permissions = usePermissions();

  return {
    ...permissions,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user
  };
};

export default usePermissions;