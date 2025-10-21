import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions, usePermissionsWithLoading } from '../../src/hooks/usePermissions';
import { useAuth } from '../../src/contexts/AuthContext';
import { UserRole, User } from '../../src/types/user';
import { RESOURCES, ACTIONS } from '../../src/services/permissionsService';

// Mock the auth context
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('usePermissions', () => {
  const mockUser: User = {
    id: '1',
    fullName: 'Test User',
    emailAddress: 'test@example.com',
    emailVerified: true,
    roles: ['editor'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: mockUser,
        isLoading: false,
        error: null
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Setup', () => {
    it('should throw error when used outside AuthProvider', () => {
      (useAuth as any).mockImplementation(() => {
        throw new Error('useAuth must be used within an AuthProvider');
      });

      expect(() => {
        renderHook(() => usePermissions());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should return permissions object when used within AuthProvider', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current).toHaveProperty('userRoles');
      expect(result.current).toHaveProperty('highestRole');
      expect(result.current).toHaveProperty('permissions');
      expect(result.current).toHaveProperty('can');
      expect(result.current).toHaveProperty('is');
      expect(result.current).toHaveProperty('RESOURCES');
      expect(result.current).toHaveProperty('ACTIONS');
    });
  });

  describe('User Roles', () => {
    it('should return user roles from auth state', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.userRoles).toEqual(['editor']);
    });

    it('should return empty array when user is null', () => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.userRoles).toEqual([]);
    });

    it('should return empty array when user roles are undefined', () => {
      const userWithoutRoles = { ...mockUser, roles: undefined };
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: userWithoutRoles,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.userRoles).toEqual([]);
    });

    it('should handle multiple user roles', () => {
      const userWithMultipleRoles = { ...mockUser, roles: ['viewer', 'editor', 'admin'] };
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: userWithMultipleRoles,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.userRoles).toEqual(['viewer', 'editor', 'admin']);
    });
  });

  describe('Highest Role', () => {
    it('should return highest role for single role', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.highestRole).toBe('editor');
    });

    it('should return highest role for multiple roles', () => {
      const userWithMultipleRoles = { ...mockUser, roles: ['guest', 'viewer', 'editor', 'admin'] };
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: userWithMultipleRoles,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.highestRole).toBe('admin');
    });

    it('should return null for empty roles', () => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.highestRole).toBeNull();
    });
  });

  describe('Basic Permission Checks', () => {
    describe('Can Object', () => {
      it('should check create permissions', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.create(RESOURCES.PRODUCTS)).toBe(true);
        expect(result.current.can.create(RESOURCES.USER_MANAGEMENT)).toBe(false);
      });

      it('should check read permissions', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.read(RESOURCES.PRODUCTS)).toBe(true);
        expect(result.current.can.read(RESOURCES.USER_MANAGEMENT)).toBe(false);
      });

      it('should check update permissions', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.update(RESOURCES.PRODUCTS)).toBe(true);
        expect(result.current.can.update(RESOURCES.USER_MANAGEMENT)).toBe(false);
      });

      it('should check delete permissions', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.delete(RESOURCES.PRODUCTS)).toBe(false); // Editor cannot delete
        expect(result.current.can.delete(RESOURCES.USER_MANAGEMENT)).toBe(false);
      });

      it('should check approve permissions', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.approve(RESOURCES.SCHEMA_VERSIONS)).toBe(false); // Editor cannot approve
      });

      it('should check publish permissions', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.publish(RESOURCES.SCHEMA_VERSIONS)).toBe(false); // Editor cannot publish
      });

      it('should check manage permissions', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.manage(RESOURCES.USER_MANAGEMENT)).toBe(false); // Editor cannot manage users
      });

      it('should check perform permissions with hierarchy', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.perform(RESOURCES.PRODUCTS, ACTIONS.CREATE, true)).toBe(true);
        expect(result.current.can.perform(RESOURCES.PRODUCTS, ACTIONS.CREATE, false)).toBe(true);
      });

      it('should check perform permissions without hierarchy', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.perform(RESOURCES.PRODUCTS, ACTIONS.DELETE, false)).toBe(false);
      });
    });

    describe('Direct Permission Check', () => {
      it('should check permissions directly', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.hasPermission(RESOURCES.PRODUCTS, ACTIONS.READ)).toBe(true);
        expect(result.current.hasPermission(RESOURCES.USER_MANAGEMENT, ACTIONS.READ)).toBe(false);
      });
    });
  });

  describe('Resource-Specific Permissions', () => {
    describe('Products Permissions', () => {
      it('should check product permissions for editor', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.products.create).toBe(true);
        expect(result.current.products.read).toBe(true);
        expect(result.current.products.update).toBe(true);
        expect(result.current.products.delete).toBe(false);
      });

      it('should check product permissions for admin', () => {
        const adminUser = { ...mockUser, roles: ['admin'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: adminUser,
            isLoading: false,
            error: null
          }
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.products.create).toBe(true);
        expect(result.current.products.read).toBe(true);
        expect(result.current.products.update).toBe(true);
        expect(result.current.products.delete).toBe(true);
      });

      it('should check product permissions for viewer', () => {
        const viewerUser = { ...mockUser, roles: ['viewer'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: viewerUser,
            isLoading: false,
            error: null
          }
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.products.create).toBe(false);
        expect(result.current.products.read).toBe(true);
        expect(result.current.products.update).toBe(false);
        expect(result.current.products.delete).toBe(false);
      });
    });

    describe('Domains Permissions', () => {
      it('should check domain permissions for editor', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.domains.create).toBe(true);
        expect(result.current.domains.read).toBe(true);
        expect(result.current.domains.update).toBe(true);
        expect(result.current.domains.delete).toBe(false);
      });
    });

    describe('Contexts Permissions', () => {
      it('should check context permissions for editor', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.contexts.create).toBe(true);
        expect(result.current.contexts.read).toBe(true);
        expect(result.current.contexts.update).toBe(true);
        expect(result.current.contexts.delete).toBe(false);
      });
    });

    describe('Schemas Permissions', () => {
      it('should check schema permissions for editor', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.schemas.create).toBe(true);
        expect(result.current.schemas.read).toBe(true);
        expect(result.current.schemas.update).toBe(true);
        expect(result.current.schemas.delete).toBe(false);
      });
    });

    describe('Schema Versions Permissions', () => {
      it('should check schema version permissions for editor', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.schemaVersions.create).toBe(true);
        expect(result.current.schemaVersions.read).toBe(true);
        expect(result.current.schemaVersions.update).toBe(true);
        expect(result.current.schemaVersions.delete).toBe(false);
        expect(result.current.schemaVersions.approve).toBe(false);
        expect(result.current.schemaVersions.publish).toBe(false);
      });

      it('should check schema version permissions for admin', () => {
        const adminUser = { ...mockUser, roles: ['admin'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: adminUser,
            isLoading: false,
            error: null
          }
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.schemaVersions.create).toBe(true);
        expect(result.current.schemaVersions.read).toBe(true);
        expect(result.current.schemaVersions.update).toBe(true);
        expect(result.current.schemaVersions.delete).toBe(true);
        expect(result.current.schemaVersions.approve).toBe(true);
        expect(result.current.schemaVersions.publish).toBe(true);
      });
    });

    describe('User Management Permissions', () => {
      it('should check user management permissions for editor', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.userManagement.read).toBe(false);
        expect(result.current.userManagement.create).toBe(false);
        expect(result.current.userManagement.update).toBe(false);
        expect(result.current.userManagement.delete).toBe(false);
        expect(result.current.userManagement.manage).toBe(false);
      });

      it('should check user management permissions for admin', () => {
        const adminUser = { ...mockUser, roles: ['admin'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: adminUser,
            isLoading: false,
            error: null
          }
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.userManagement.read).toBe(true);
        expect(result.current.userManagement.create).toBe(true);
        expect(result.current.userManagement.update).toBe(true);
        expect(result.current.userManagement.delete).toBe(true);
        expect(result.current.userManagement.manage).toBe(true);
      });
    });

    describe('System Settings Permissions', () => {
      it('should check system settings permissions for editor', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.systemSettings.read).toBe(false);
        expect(result.current.systemSettings.update).toBe(false);
        expect(result.current.systemSettings.manage).toBe(false);
      });

      it('should check system settings permissions for admin', () => {
        const adminUser = { ...mockUser, roles: ['admin'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: adminUser,
            isLoading: false,
            error: null
          }
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.systemSettings.read).toBe(true);
        expect(result.current.systemSettings.update).toBe(true);
        expect(result.current.systemSettings.manage).toBe(true);
      });
    });
  });

  describe('Role Checks', () => {
    describe('Is Object', () => {
      it('should check admin role', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.is.admin).toBe(false);

        const adminUser = { ...mockUser, roles: ['admin'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: adminUser,
            isLoading: false,
            error: null
          }
        });

        const { result: adminResult } = renderHook(() => usePermissions());
        expect(adminResult.current.is.admin).toBe(true);
      });

      it('should check editor role', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.is.editor).toBe(true);

        // Admin should also be considered editor
        const adminUser = { ...mockUser, roles: ['admin'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: adminUser,
            isLoading: false,
            error: null
          }
        });

        const { result: adminResult } = renderHook(() => usePermissions());
        expect(adminResult.current.is.editor).toBe(true);
      });

      it('should check viewer role', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.is.viewer).toBe(true);

        const viewerUser = { ...mockUser, roles: ['viewer'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: viewerUser,
            isLoading: false,
            error: null
          }
        });

        const { result: viewerResult } = renderHook(() => usePermissions());
        expect(viewerResult.current.is.viewer).toBe(true);
      });

      it('should check guest role', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.is.guest).toBe(false);

        const guestUser = { ...mockUser, roles: ['guest'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: guestUser,
            isLoading: false,
            error: null
          }
        });

        const { result: guestResult } = renderHook(() => usePermissions());
        expect(guestResult.current.is.guest).toBe(true);
      });
    });

    describe('Role Utility Functions', () => {
      it('should check if user has specific role', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.hasRole('editor')).toBe(true);
        expect(result.current.hasRole('admin')).toBe(false);
        expect(result.current.hasRole('viewer')).toBe(false);
        expect(result.current.hasRole('guest')).toBe(false);
      });

      it('should check if user has any of specified roles', () => {
        const { result } = renderHook(() => usePermissions());

        expect(result.current.hasAnyRole(['admin', 'editor'])).toBe(true);
        expect(result.current.hasAnyRole(['admin', 'viewer'])).toBe(false);
        expect(result.current.hasAnyRole(['guest'])).toBe(false);
        expect(result.current.hasAnyRole([])).toBe(false);
      });

      it('should check if user has all specified roles', () => {
        const multiRoleUser = { ...mockUser, roles: ['viewer', 'editor'] };
        (useAuth as any).mockReturnValue({
          authState: {
            isAuthenticated: true,
            user: multiRoleUser,
            isLoading: false,
            error: null
          }
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.hasAllRoles(['viewer', 'editor'])).toBe(true);
        expect(result.current.hasAllRoles(['viewer'])).toBe(true);
        expect(result.current.hasAllRoles(['editor'])).toBe(true);
        expect(result.current.hasAllRoles(['viewer', 'editor', 'admin'])).toBe(false);
        expect(result.current.hasAllRoles([])).toBe(true);
      });
    });
  });

  describe('Constants', () => {
    it('should provide RESOURCES constants', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.RESOURCES).toBeDefined();
      expect(result.current.RESOURCES.PRODUCTS).toBe('products');
      expect(result.current.RESOURCES.DOMAINS).toBe('domains');
      expect(result.current.RESOURCES.CONTEXTS).toBe('contexts');
      expect(result.current.RESOURCES.SCHEMAS).toBe('schemas');
      expect(result.current.RESOURCES.SCHEMA_VERSIONS).toBe('schema_versions');
      expect(result.current.RESOURCES.USER_MANAGEMENT).toBe('user_management');
      expect(result.current.RESOURCES.SYSTEM_SETTINGS).toBe('system_settings');
    });

    it('should provide ACTIONS constants', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.ACTIONS).toBeDefined();
      expect(result.current.ACTIONS.CREATE).toBe('create');
      expect(result.current.ACTIONS.READ).toBe('read');
      expect(result.current.ACTIONS.UPDATE).toBe('update');
      expect(result.current.ACTIONS.DELETE).toBe('delete');
      expect(result.current.ACTIONS.APPROVE).toBe('approve');
      expect(result.current.ACTIONS.PUBLISH).toBe('publish');
      expect(result.current.ACTIONS.MANAGE).toBe('manage');
    });
  });

  describe('Memoization', () => {
    it('should memoize userRoles based on auth state changes', () => {
      const { result, rerender } = renderHook(() => usePermissions());

      const firstRoles = result.current.userRoles;

      // Rerender without changing user roles
      rerender();

      expect(result.current.userRoles).toBe(firstRoles);

      // Change user roles
      const updatedUser = { ...mockUser, roles: ['admin'] };
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: updatedUser,
          isLoading: false,
          error: null
        }
      });

      rerender();

      expect(result.current.userRoles).not.toBe(firstRoles);
      expect(result.current.userRoles).toEqual(['admin']);
    });

    it('should memoize permissions based on userRoles changes', () => {
      const { result, rerender } = renderHook(() => usePermissions());

      const firstPermissions = result.current.permissions;

      // Rerender without changing user roles
      rerender();

      expect(result.current.permissions).toBe(firstPermissions);

      // Change user roles
      const updatedUser = { ...mockUser, roles: ['admin'] };
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: updatedUser,
          isLoading: false,
          error: null
        }
      });

      rerender();

      expect(result.current.permissions).not.toBe(firstPermissions);
    });

    it('should memoize can object based on userRoles changes', () => {
      const { result, rerender } = renderHook(() => usePermissions());

      const firstCan = result.current.can;

      // Rerender without changing user roles
      rerender();

      expect(result.current.can).toBe(firstCan);

      // Change user roles
      const updatedUser = { ...mockUser, roles: ['admin'] };
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: updatedUser,
          isLoading: false,
          error: null
        }
      });

      rerender();

      expect(result.current.can).not.toBe(firstCan);
    });
  });
});

describe('usePermissionsWithLoading', () => {
  const mockUser: User = {
    id: '1',
    fullName: 'Test User',
    emailAddress: 'test@example.com',
    emailVerified: true,
    roles: ['editor'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: mockUser,
        isLoading: false,
        error: null
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include loading state from auth context', () => {
    const { result } = renderHook(() => usePermissionsWithLoading());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBe(mockUser);
  });

  it('should include all standard permissions functionality', () => {
    const { result } = renderHook(() => usePermissionsWithLoading());

    expect(result.current.userRoles).toEqual(['editor']);
    expect(result.current.can.create(RESOURCES.PRODUCTS)).toBe(true);
    expect(result.current.is.editor).toBe(true);
  });

  it('should reflect loading state changes', () => {
    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: true,
        error: null
      }
    });

    const { result } = renderHook(() => usePermissionsWithLoading());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should handle authentication error states', () => {
    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: 'Authentication failed'
      }
    });

    const { result } = renderHook(() => usePermissionsWithLoading());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.userRoles).toEqual([]);
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle empty user roles gracefully', () => {
    const userWithEmptyRoles = {
      id: '1',
      fullName: 'Test User',
      emailAddress: 'test@example.com',
      emailVerified: true,
      roles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: userWithEmptyRoles,
        isLoading: false,
        error: null
      }
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.userRoles).toEqual([]);
    expect(result.current.highestRole).toBeNull();
    expect(result.current.can.create(RESOURCES.PRODUCTS)).toBe(false);
    expect(result.current.is.admin).toBe(false);
    expect(result.current.is.editor).toBe(false);
    expect(result.current.is.viewer).toBe(false);
  });

  it('should handle invalid role types gracefully', () => {
    const userWithInvalidRoles = {
      id: '1',
      fullName: 'Test User',
      emailAddress: 'test@example.com',
      emailVerified: true,
      roles: ['invalid-role', 'another-invalid'] as UserRole[],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: userWithInvalidRoles,
        isLoading: false,
        error: null
      }
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.userRoles).toEqual(['invalid-role', 'another-invalid']);
    expect(result.current.can.create(RESOURCES.PRODUCTS)).toBe(false);
    expect(result.current.is.admin).toBe(false);
  });

  it('should handle non-existent resources gracefully', () => {
    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: { id: '1', fullName: 'Test', emailAddress: 'test@test.com', emailVerified: true, roles: ['admin'],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        isLoading: false,
        error: null
      }
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.can.create('non-existent-resource')).toBe(false);
    expect(result.current.hasPermission('non-existent-resource', ACTIONS.READ)).toBe(false);
  });

  it('should handle non-existent actions gracefully', () => {
    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: { id: '1', fullName: 'Test', emailAddress: 'test@test.com', emailVerified: true, roles: ['admin'],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        isLoading: false,
        error: null
      }
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasPermission(RESOURCES.PRODUCTS, 'non-existent-action')).toBe(false);
  });
});