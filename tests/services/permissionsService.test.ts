import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getUserPermissions,
  hasRoleLevel,
  getHighestRole,
  canPerformAction,
  PermissionChecker,
  RESOURCES,
  ACTIONS,
  ROLE_HIERARCHY,
  PERMISSIONS
} from '../../src/services/permissionsService';
import { UserRole } from '../../src/types/user';

describe('permissionsService', () => {
  describe('RESOURCES constant', () => {
    it('should define all required resources', () => {
      expect(RESOURCES.PRODUCTS).toBe('products');
      expect(RESOURCES.DOMAINS).toBe('domains');
      expect(RESOURCES.CONTEXTS).toBe('contexts');
      expect(RESOURCES.SCHEMAS).toBe('schemas');
      expect(RESOURCES.SCHEMA_VERSIONS).toBe('schema_versions');
      expect(RESOURCES.USER_MANAGEMENT).toBe('user_management');
      expect(RESOURCES.SYSTEM_SETTINGS).toBe('system_settings');
    });
  });

  describe('ACTIONS constant', () => {
    it('should define all required actions', () => {
      expect(ACTIONS.CREATE).toBe('create');
      expect(ACTIONS.READ).toBe('read');
      expect(ACTIONS.UPDATE).toBe('update');
      expect(ACTIONS.DELETE).toBe('delete');
      expect(ACTIONS.APPROVE).toBe('approve');
      expect(ACTIONS.PUBLISH).toBe('publish');
      expect(ACTIONS.MANAGE).toBe('manage');
    });
  });

  describe('ROLE_HIERARCHY constant', () => {
    it('should define role hierarchy with correct levels', () => {
      expect(ROLE_HIERARCHY.guest).toBe(1);
      expect(ROLE_HIERARCHY.viewer).toBe(2);
      expect(ROLE_HIERARCHY.editor).toBe(3);
      expect(ROLE_HIERARCHY.admin).toBe(4);
    });
  });

  describe('PERMISSIONS constant', () => {
    it('should define permissions for all resources and actions', () => {
      expect(PERMISSIONS).toBeInstanceOf(Array);
      expect(PERMISSIONS.length).toBeGreaterThan(0);
      
      // Check that permissions have required structure
      PERMISSIONS.forEach(permission => {
        expect(permission).toHaveProperty('resource');
        expect(permission).toHaveProperty('action');
        expect(permission).toHaveProperty('roles');
        expect(Array.isArray(permission.roles)).toBe(true);
      });
    });

    it('should include permissions for all resources', () => {
      const resourcesInPermissions = new Set(PERMISSIONS.map(p => p.resource));
      const expectedResources = Object.values(RESOURCES);
      
      expectedResources.forEach(resource => {
        expect(resourcesInPermissions.has(resource)).toBe(true);
      });
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has required role', () => {
      expect(hasPermission(['editor'], RESOURCES.PRODUCTS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(['admin'], RESOURCES.PRODUCTS, ACTIONS.DELETE)).toBe(true);
      expect(hasPermission(['viewer'], RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      expect(hasPermission(['viewer'], RESOURCES.PRODUCTS, ACTIONS.CREATE)).toBe(false);
      expect(hasPermission(['editor'], RESOURCES.PRODUCTS, ACTIONS.DELETE)).toBe(false);
      expect(hasPermission(['guest'], RESOURCES.USER_MANAGEMENT, ACTIONS.READ)).toBe(false);
    });

    it('should return true when user has any of the required roles', () => {
      expect(hasPermission(['editor', 'admin'], RESOURCES.PRODUCTS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(['viewer', 'editor'], RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(true);
    });

    it('should return false for empty user roles', () => {
      expect(hasPermission([], RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
      expect(hasPermission(undefined, RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
    });

    it('should return false for non-existent permission', () => {
      expect(hasPermission(['admin'], 'non-existent-resource', ACTIONS.READ)).toBe(false);
      expect(hasPermission(['admin'], RESOURCES.PRODUCTS, 'non-existent-action')).toBe(false);
    });

    it('should handle multiple roles correctly', () => {
      expect(hasPermission(['guest', 'viewer', 'editor'], RESOURCES.PRODUCTS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(['guest', 'viewer'], RESOURCES.PRODUCTS, ACTIONS.CREATE)).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for admin user', () => {
      const adminPermissions = getUserPermissions(['admin']);
      
      expect(adminPermissions.length).toBeGreaterThan(0);
      
      // Admin should have permissions for all resources
      const adminResources = new Set(adminPermissions.map(p => p.resource));
      expect(adminResources.has(RESOURCES.USER_MANAGEMENT)).toBe(true);
      expect(adminResources.has(RESOURCES.SYSTEM_SETTINGS)).toBe(true);
      expect(adminResources.has(RESOURCES.PRODUCTS)).toBe(true);
    });

    it('should return limited permissions for viewer user', () => {
      const viewerPermissions = getUserPermissions(['viewer']);
      
      expect(viewerPermissions.length).toBeGreaterThan(0);
      
      // Viewer should only have read permissions for most resources
      const readPermissions = viewerPermissions.filter(p => p.action === ACTIONS.READ);
      const createPermissions = viewerPermissions.filter(p => p.action === ACTIONS.CREATE);
      
      expect(readPermissions.length).toBeGreaterThan(0);
      expect(createPermissions.length).toBe(0);
    });

    it('should return permissions for editor user', () => {
      const editorPermissions = getUserPermissions(['editor']);
      
      expect(editorPermissions.length).toBeGreaterThan(0);
      
      // Editor should have create/read/update permissions but not delete/manage
      const hasCreateProducts = editorPermissions.some(p => 
        p.resource === RESOURCES.PRODUCTS && p.action === ACTIONS.CREATE
      );
      const hasDeleteProducts = editorPermissions.some(p => 
        p.resource === RESOURCES.PRODUCTS && p.action === ACTIONS.DELETE
      );
      
      expect(hasCreateProducts).toBe(true);
      expect(hasDeleteProducts).toBe(false);
    });

    it('should return empty array for empty user roles', () => {
      expect(getUserPermissions([])).toEqual([]);
      expect(getUserPermissions(undefined)).toEqual([]);
    });

    it('should return combined permissions for multiple roles', () => {
      const multiRolePermissions = getUserPermissions(['viewer', 'editor']);
      const viewerOnlyPermissions = getUserPermissions(['viewer']);
      const editorOnlyPermissions = getUserPermissions(['editor']);
      
      expect(multiRolePermissions.length).toBeGreaterThanOrEqual(Math.max(viewerOnlyPermissions.length, editorOnlyPermissions.length));
    });

    it('should not return duplicate permissions', () => {
      const permissions = getUserPermissions(['viewer', 'editor', 'admin']);
      const uniquePermissions = permissions.filter((permission, index, array) =>
        array.findIndex(p => p.resource === permission.resource && p.action === permission.action) === index
      );
      
      expect(permissions.length).toBe(uniquePermissions.length);
    });
  });

  describe('hasRoleLevel', () => {
    it('should return true when user role is higher than required role', () => {
      expect(hasRoleLevel('admin', 'editor')).toBe(true);
      expect(hasRoleLevel('admin', 'viewer')).toBe(true);
      expect(hasRoleLevel('admin', 'guest')).toBe(true);
      expect(hasRoleLevel('editor', 'viewer')).toBe(true);
      expect(hasRoleLevel('editor', 'guest')).toBe(true);
      expect(hasRoleLevel('viewer', 'guest')).toBe(true);
    });

    it('should return true when user role equals required role', () => {
      expect(hasRoleLevel('admin', 'admin')).toBe(true);
      expect(hasRoleLevel('editor', 'editor')).toBe(true);
      expect(hasRoleLevel('viewer', 'viewer')).toBe(true);
      expect(hasRoleLevel('guest', 'guest')).toBe(true);
    });

    it('should return false when user role is lower than required role', () => {
      expect(hasRoleLevel('guest', 'viewer')).toBe(false);
      expect(hasRoleLevel('guest', 'editor')).toBe(false);
      expect(hasRoleLevel('guest', 'admin')).toBe(false);
      expect(hasRoleLevel('viewer', 'editor')).toBe(false);
      expect(hasRoleLevel('viewer', 'admin')).toBe(false);
      expect(hasRoleLevel('editor', 'admin')).toBe(false);
    });
  });

  describe('getHighestRole', () => {
    it('should return highest role from multiple roles', () => {
      expect(getHighestRole(['guest', 'viewer', 'editor', 'admin'])).toBe('admin');
      expect(getHighestRole(['viewer', 'editor'])).toBe('editor');
      expect(getHighestRole(['guest', 'viewer'])).toBe('viewer');
    });

    it('should return single role when only one role is provided', () => {
      expect(getHighestRole(['admin'])).toBe('admin');
      expect(getHighestRole(['editor'])).toBe('editor');
      expect(getHighestRole(['viewer'])).toBe('viewer');
      expect(getHighestRole(['guest'])).toBe('guest');
    });

    it('should return null for empty roles', () => {
      expect(getHighestRole([])).toBeNull();
      expect(getHighestRole(undefined)).toBeNull();
    });

    it('should handle duplicate roles', () => {
      expect(getHighestRole(['viewer', 'editor', 'viewer', 'editor'])).toBe('editor');
    });

    it('should handle roles in any order', () => {
      expect(getHighestRole(['guest', 'admin', 'viewer', 'editor'])).toBe('admin');
      expect(getHighestRole(['editor', 'guest', 'admin', 'viewer'])).toBe('admin');
    });
  });

  describe('canPerformAction', () => {
    describe('with hierarchy enabled', () => {
      it('should allow higher roles to perform lower role actions', () => {
        expect(canPerformAction(['admin'], RESOURCES.PRODUCTS, ACTIONS.CREATE, true)).toBe(true);
        expect(canPerformAction(['admin'], RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(true);
        expect(canPerformAction(['editor'], RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(true);
      });

      it('should deny lower roles from performing higher role actions', () => {
        expect(canPerformAction(['viewer'], RESOURCES.PRODUCTS, ACTIONS.DELETE, true)).toBe(false);
        expect(canPerformAction(['editor'], RESOURCES.PRODUCTS, ACTIONS.DELETE, true)).toBe(false);
        expect(canPerformAction(['guest'], RESOURCES.USER_MANAGEMENT, ACTIONS.READ, true)).toBe(false);
      });

      it('should use hierarchy for role-based permissions', () => {
        expect(canPerformAction(['admin'], RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(true);
        expect(canPerformAction(['editor'], RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(true);
        expect(canPerformAction(['viewer'], RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(true);
        expect(canPerformAction(['guest'], RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(true);
      });
    });

    describe('with hierarchy disabled', () => {
      it('should use exact permission matching', () => {
        expect(canPerformAction(['admin'], RESOURCES.PRODUCTS, ACTIONS.CREATE, false)).toBe(true);
        expect(canPerformAction(['editor'], RESOURCES.PRODUCTS, ACTIONS.CREATE, false)).toBe(true);
        expect(canPerformAction(['viewer'], RESOURCES.PRODUCTS, ACTIONS.CREATE, false)).toBe(false);
      });

      it('should not allow role inheritance', () => {
        // Admin role should only work if explicitly listed in permission
        const result = canPerformAction(['admin'], RESOURCES.PRODUCTS, ACTIONS.CREATE, false);
        expect(result).toBe(true); // Admin is explicitly listed for this permission
        
        const viewerResult = canPerformAction(['viewer'], RESOURCES.PRODUCTS, ACTIONS.CREATE, false);
        expect(viewerResult).toBe(false); // Viewer is not listed for create permission
      });
    });

    it('should return false for non-existent permissions', () => {
      expect(canPerformAction(['admin'], 'non-existent-resource', ACTIONS.READ, true)).toBe(false);
      expect(canPerformAction(['admin'], RESOURCES.PRODUCTS, 'non-existent-action', true)).toBe(false);
    });

    it('should handle empty user roles', () => {
      expect(canPerformAction([], RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(false);
      expect(canPerformAction(undefined, RESOURCES.PRODUCTS, ACTIONS.READ, true)).toBe(false);
    });

    it('should default to hierarchy enabled when parameter not provided', () => {
      expect(canPerformAction(['admin'], RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(true);
      expect(canPerformAction(['viewer'], RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(true);
    });
  });

  describe('PermissionChecker', () => {
    describe('canCreate', () => {
      it('should check create permissions correctly', () => {
        expect(PermissionChecker.canCreate(['editor'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canCreate(['admin'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canCreate(['viewer'], RESOURCES.PRODUCTS)).toBe(false);
        expect(PermissionChecker.canCreate(['guest'], RESOURCES.PRODUCTS)).toBe(false);
      });
    });

    describe('canRead', () => {
      it('should check read permissions correctly', () => {
        expect(PermissionChecker.canRead(['guest'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canRead(['viewer'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canRead(['editor'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canRead(['admin'], RESOURCES.PRODUCTS)).toBe(true);
      });

      it('should deny read for restricted resources', () => {
        expect(PermissionChecker.canRead(['editor'], RESOURCES.USER_MANAGEMENT)).toBe(false);
        expect(PermissionChecker.canRead(['viewer'], RESOURCES.SYSTEM_SETTINGS)).toBe(false);
      });
    });

    describe('canUpdate', () => {
      it('should check update permissions correctly', () => {
        expect(PermissionChecker.canUpdate(['editor'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canUpdate(['admin'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canUpdate(['viewer'], RESOURCES.PRODUCTS)).toBe(false);
        expect(PermissionChecker.canUpdate(['guest'], RESOURCES.PRODUCTS)).toBe(false);
      });
    });

    describe('canDelete', () => {
      it('should check delete permissions correctly', () => {
        expect(PermissionChecker.canDelete(['admin'], RESOURCES.PRODUCTS)).toBe(true);
        expect(PermissionChecker.canDelete(['editor'], RESOURCES.PRODUCTS)).toBe(false);
        expect(PermissionChecker.canDelete(['viewer'], RESOURCES.PRODUCTS)).toBe(false);
        expect(PermissionChecker.canDelete(['guest'], RESOURCES.PRODUCTS)).toBe(false);
      });
    });

    describe('canManage', () => {
      it('should check manage permissions correctly', () => {
        expect(PermissionChecker.canManage(['admin'], RESOURCES.USER_MANAGEMENT)).toBe(true);
        expect(PermissionChecker.canManage(['admin'], RESOURCES.SYSTEM_SETTINGS)).toBe(true);
        expect(PermissionChecker.canManage(['editor'], RESOURCES.USER_MANAGEMENT)).toBe(false);
        expect(PermissionChecker.canManage(['viewer'], RESOURCES.SYSTEM_SETTINGS)).toBe(false);
      });
    });

    describe('isAdmin', () => {
      it('should check admin role correctly', () => {
        expect(PermissionChecker.isAdmin(['admin'])).toBe(true);
        expect(PermissionChecker.isAdmin(['admin', 'editor'])).toBe(true);
        expect(PermissionChecker.isAdmin(['editor'])).toBe(false);
        expect(PermissionChecker.isAdmin(['viewer'])).toBe(false);
        expect(PermissionChecker.isAdmin(['guest'])).toBe(false);
        expect(PermissionChecker.isAdmin([])).toBe(false);
      });
    });

    describe('isEditor', () => {
      it('should check editor role correctly (including admin)', () => {
        expect(PermissionChecker.isEditor(['editor'])).toBe(true);
        expect(PermissionChecker.isEditor(['admin'])).toBe(true);
        expect(PermissionChecker.isEditor(['admin', 'editor'])).toBe(true);
        expect(PermissionChecker.isEditor(['viewer'])).toBe(false);
        expect(PermissionChecker.isEditor(['guest'])).toBe(false);
        expect(PermissionChecker.isEditor([])).toBe(false);
      });
    });

    describe('isViewer', () => {
      it('should check viewer role correctly (including higher roles)', () => {
        expect(PermissionChecker.isViewer(['viewer'])).toBe(true);
        expect(PermissionChecker.isViewer(['editor'])).toBe(true);
        expect(PermissionChecker.isViewer(['admin'])).toBe(true);
        expect(PermissionChecker.isViewer(['viewer', 'editor'])).toBe(true);
        expect(PermissionChecker.isViewer(['guest'])).toBe(false);
        expect(PermissionChecker.isViewer([])).toBe(false);
      });
    });
  });

  describe('Permission Matrix Validation', () => {
    it('should have consistent permissions across role hierarchy', () => {
      // Check that higher roles have at least the same permissions as lower roles for basic operations
      const resourceActions = [
        { resource: RESOURCES.PRODUCTS, action: ACTIONS.READ },
        { resource: RESOURCES.DOMAINS, action: ACTIONS.READ },
        { resource: RESOURCES.CONTEXTS, action: ACTIONS.READ },
        { resource: RESOURCES.SCHEMAS, action: ACTIONS.READ }
      ];

      resourceActions.forEach(({ resource, action }) => {
        const guestCan = hasPermission(['guest'], resource, action);
        const viewerCan = hasPermission(['viewer'], resource, action);
        const editorCan = hasPermission(['editor'], resource, action);
        const adminCan = hasPermission(['admin'], resource, action);

        if (guestCan) {
          expect(viewerCan).toBe(true);
          expect(editorCan).toBe(true);
          expect(adminCan).toBe(true);
        }

        if (viewerCan) {
          expect(editorCan).toBe(true);
          expect(adminCan).toBe(true);
        }

        if (editorCan) {
          expect(adminCan).toBe(true);
        }
      });
    });

    it('should have admin-only permissions for sensitive operations', () => {
      const sensitiveOperations = [
        { resource: RESOURCES.USER_MANAGEMENT, action: ACTIONS.READ },
        { resource: RESOURCES.USER_MANAGEMENT, action: ACTIONS.MANAGE },
        { resource: RESOURCES.SYSTEM_SETTINGS, action: ACTIONS.UPDATE },
        { resource: RESOURCES.PRODUCTS, action: ACTIONS.DELETE },
        { resource: RESOURCES.SCHEMA_VERSIONS, action: ACTIONS.APPROVE }
      ];

      sensitiveOperations.forEach(({ resource, action }) => {
        expect(hasPermission(['guest'], resource, action)).toBe(false);
        expect(hasPermission(['viewer'], resource, action)).toBe(false);
        expect(hasPermission(['editor'], resource, action)).toBe(false);
        expect(hasPermission(['admin'], resource, action)).toBe(true);
      });
    });

    it('should allow all authenticated users to read basic resources', () => {
      const basicResources = [
        RESOURCES.PRODUCTS,
        RESOURCES.DOMAINS,
        RESOURCES.CONTEXTS,
        RESOURCES.SCHEMAS,
        RESOURCES.SCHEMA_VERSIONS
      ];

      const allRoles: UserRole[] = ['guest', 'viewer', 'editor', 'admin'];

      basicResources.forEach(resource => {
        allRoles.forEach(role => {
          expect(hasPermission([role], resource, ACTIONS.READ)).toBe(true);
        });
      });
    });

    it('should restrict creation to editor and admin roles', () => {
      const creatableResources = [
        RESOURCES.PRODUCTS,
        RESOURCES.DOMAINS,
        RESOURCES.CONTEXTS,
        RESOURCES.SCHEMAS,
        RESOURCES.SCHEMA_VERSIONS
      ];

      creatableResources.forEach(resource => {
        expect(hasPermission(['guest'], resource, ACTIONS.CREATE)).toBe(false);
        expect(hasPermission(['viewer'], resource, ACTIONS.CREATE)).toBe(false);
        expect(hasPermission(['editor'], resource, ACTIONS.CREATE)).toBe(true);
        expect(hasPermission(['admin'], resource, ACTIONS.CREATE)).toBe(true);
      });
    });

    it('should have complete permission coverage for all defined resources and actions', () => {
      const resources = Object.values(RESOURCES);
      const actions = Object.values(ACTIONS);

      resources.forEach(resource => {
        actions.forEach(action => {
          const permission = PERMISSIONS.find(p => p.resource === resource && p.action === action);
          
          // Not all combinations need to exist, but if they do, they should be properly defined
          if (permission) {
            expect(permission.roles).toBeInstanceOf(Array);
            expect(permission.roles.length).toBeGreaterThan(0);
            
            permission.roles.forEach(role => {
              expect(['guest', 'viewer', 'editor', 'admin']).toContain(role);
            });
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined or null inputs gracefully', () => {
      expect(hasPermission(null as any, RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
      expect(getUserPermissions(null as any)).toEqual([]);
      expect(getHighestRole(null as any)).toBeNull();
      expect(canPerformAction(null as any, RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
    });

    it('should handle empty arrays', () => {
      expect(hasPermission([], RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
      expect(getUserPermissions([])).toEqual([]);
      expect(getHighestRole([])).toBeNull();
      expect(canPerformAction([], RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
    });

    it('should handle invalid role names', () => {
      const invalidRoles = ['invalid-role', 'non-existent'] as UserRole[];
      
      expect(hasPermission(invalidRoles, RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
      expect(getUserPermissions(invalidRoles)).toEqual([]);
      expect(canPerformAction(invalidRoles, RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(false);
    });

    it('should handle mixed valid and invalid roles', () => {
      const mixedRoles = ['admin', 'invalid-role'] as UserRole[];
      
      expect(hasPermission(mixedRoles, RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(true);
      expect(getUserPermissions(mixedRoles).length).toBeGreaterThan(0);
      expect(getHighestRole(mixedRoles)).toBe('admin');
      expect(canPerformAction(mixedRoles, RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(true);
    });

    it('should be case sensitive for resource and action names', () => {
      expect(hasPermission(['admin'], 'PRODUCTS', ACTIONS.READ)).toBe(false);
      expect(hasPermission(['admin'], RESOURCES.PRODUCTS, 'READ')).toBe(false);
      expect(hasPermission(['admin'], 'Products', 'Create')).toBe(false);
    });

    it('should handle duplicate roles in array', () => {
      const duplicateRoles: UserRole[] = ['editor', 'editor', 'admin', 'admin'];
      
      expect(hasPermission(duplicateRoles, RESOURCES.PRODUCTS, ACTIONS.DELETE)).toBe(true);
      expect(getHighestRole(duplicateRoles)).toBe('admin');
      
      const permissions = getUserPermissions(duplicateRoles);
      const uniquePermissions = permissions.filter((permission, index, array) =>
        array.findIndex(p => p.resource === permission.resource && p.action === permission.action) === index
      );
      
      expect(permissions.length).toBe(uniquePermissions.length);
    });
  });
});