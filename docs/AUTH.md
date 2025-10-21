# Authorization System - Domo Schema Registry

## Overview

The Domo Schema Registry implements a comprehensive role-based access control (RBAC) system with hierarchical permissions. This document outlines the current authorization roles and enforcement mechanisms.

## 🔐 Authorization Roles

### Role Hierarchy
The system uses a 4-tier hierarchical role system where higher roles inherit permissions from lower roles:

1. **`guest`** (Level 1) - Minimal read-only access
2. **`viewer`** (Level 2) - Extended read-only access
3. **`editor`** (Level 3) - Can create and modify content
4. **`admin`** (Level 4) - Full system administration access

### Role Inheritance
```
admin (4) ─ inherits all permissions from ─→ editor (3)
editor (3) ─ inherits all permissions from ─→ viewer (2)
viewer (2) ─ inherits all permissions from ─→ guest (1)
```

## 📋 Permission Matrix

### Core Resources
The following permissions apply to **Products**, **Domains**, **Contexts**, and **Schemas**:

| Action | guest | viewer | editor | admin |
|--------|-------|--------|--------|-------|
| **READ** | ✅ | ✅ | ✅ | ✅ |
| **CREATE** | ❌ | ❌ | ✅ | ✅ |
| **UPDATE** | ❌ | ❌ | ✅ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### Schema Versions
Schema versions have additional workflow-related permissions:

| Action | guest | viewer | editor | admin |
|--------|-------|--------|--------|-------|
| **READ** | ✅ | ✅ | ✅ | ✅ |
| **CREATE** | ❌ | ❌ | ✅ | ✅ |
| **UPDATE** | ❌ | ❌ | ✅ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |
| **APPROVE** | ❌ | ❌ | ❌ | ✅ |
| **PUBLISH** | ❌ | ❌ | ❌ | ✅ |

### Administrative Resources

#### User Management
| Action | guest | viewer | editor | admin |
|--------|-------|--------|--------|-------|
| **READ** | ❌ | ❌ | ❌ | ✅ |
| **CREATE** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |
| **MANAGE** | ❌ | ❌ | ❌ | ✅ |

#### System Settings
| Action | guest | viewer | editor | admin |
|--------|-------|--------|--------|-------|
| **READ** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **MANAGE** | ❌ | ❌ | ❌ | ✅ |

## 🛡️ Enforcement Mechanisms

### 1. Frontend Enforcement

#### React Hooks (`src/hooks/usePermissions.ts`)
```typescript
import { usePermissions } from './hooks/usePermissions';

const MyComponent = () => {
  const { can, is } = usePermissions();

  return (
    <div>
      {can.create('products') && <CreateProductButton />}
      {can.update('schemas') && <EditSchemaButton />}
      {is.admin && <AdminPanel />}
    </div>
  );
};
```

#### Component-Level Protection (`src/middleware/AuthMiddleware.tsx`)
```typescript
// Protect entire components
<AuthMiddleware requireAuth={true} requiredRoles={['admin']}>
  <AdminPanel />
</AuthMiddleware>

// Higher-order component wrapper
const ProtectedComponent = withAuthGuard(Component, {
  requiredRoles: ['editor'],
  requireEmailVerified: true
});
```

### 2. Permission Service (`src/services/permissionsService.ts`)

#### Core Functions
```typescript
// Check specific permission
hasPermission(userRoles, 'products', 'create') // boolean

// Check with role hierarchy
canPerformAction(userRoles, 'schemas', 'delete', true) // boolean

// Role-based checks
PermissionChecker.isAdmin(userRoles) // boolean
PermissionChecker.isEditor(userRoles) // boolean (includes admin)
PermissionChecker.isViewer(userRoles) // boolean (includes editor, admin)
```

#### Permission Constants
```typescript
// Resources
RESOURCES.PRODUCTS
RESOURCES.DOMAINS
RESOURCES.CONTEXTS
RESOURCES.SCHEMAS
RESOURCES.SCHEMA_VERSIONS
RESOURCES.USER_MANAGEMENT
RESOURCES.SYSTEM_SETTINGS

// Actions
ACTIONS.CREATE
ACTIONS.READ
ACTIONS.UPDATE
ACTIONS.DELETE
ACTIONS.APPROVE
ACTIONS.PUBLISH
ACTIONS.MANAGE
```

### 3. Cross-Origin Authentication
The application handles authentication across multiple origins:

- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend API**: `http://localhost:8789` (Wrangler dev server)
- **Real-time**: `ws://localhost:1999` (PartyKit WebSocket)

CORS is configured to support credential-based authentication:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## ⚠️ Current Limitations

### 1. Type System Mismatch Between Frontend and Backend
**Issue**: The backend and frontend have different User interface definitions.

**Backend User Interface** (`functions/types/user.ts`):
```typescript
export interface User {
  id: string;
  fullName: string;
  emailAddress: string;
  createdAt: string;
  updatedAt: string;
  // ❌ No roles field
}
```

**Frontend User Interface** (`src/types/user.ts`):
```typescript
export interface User {
  id: string;
  fullName: string;
  emailAddress: string;
  emailVerified?: boolean;
  roles?: UserRole[];  // ✅ roles currently defaults to ['editor']
  createdAt: string;
  updatedAt: string;
}
```

**Status**: ✅ **RESOLVED** - Backend User interface has been updated to include roles field.

### 2. No Default Role Assignment Database Logic
**Issue**: User creation doesn't assign any roles in the database.

**Source Code**:
```typescript
// functions/persistence/userOperations.ts
const defaultRoles = JSON.stringify(['editor']); // Default to editor role

await this.sql.exec(
  `INSERT INTO users (id, full_name, email_address, password_hash, roles, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  userId, userData.fullName, userData.emailAddress, passwordHash, defaultRoles, timestamp, timestamp
);
// ✅ All new users get editor role by default
```

**Behavior**: ✅ - All new users are automatically assigned the "editor" role.

### 3. Permission System Behavior with Undefined Roles
**Behavior**: ✅ - With the user role defaulting to editor, users will currently have editor permissions.

### 4. Missing Backend Permission Enforcement
**Issue**: Backend API endpoints only check authentication, not authorization.

**Impact**: If frontend checks are bypassed, unauthorized users could access resources via direct API calls.

### 5. No Role Management Interface
**Issue**: No UI or API endpoints exist for:
- Assigning roles to users
- Managing user permissions
- Admin user management

**Impact**: No way to grant permissions to users after registration.

## 📋 Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend Permission Hooks** | ✅ **Complete** | Comprehensive permission checking |
| **Component Guards** | ✅ **Complete** | AuthMiddleware protects components |
| **Permission Service** | ✅ **Complete** | Full RBAC logic implemented |
| **User Registration** | ✅ **Complete** | Assigns editor role by default |
| **Type System Consistency** | ✅ **Complete** | Backend/Frontend User interfaces match |
| **Default Role Assignment** | ✅ **Complete** | Users get editor role by default |
| **Backend API Authorization** | ❌ **Missing** | No role validation on endpoints |
| **Role Management UI** | ❌ **Missing** | No admin interface for roles |
| **Session Management** | ✅ **Complete** | Cookie-based sessions with CORS |

## 🔧 Recommended Next Steps

1. ✅ **~~Fix Type System Mismatch~~** - COMPLETED
   - ~~Add `roles` field to backend User interface (`functions/types/user.ts`)~~ ✅
   - ~~Create database migration to add roles column~~ ✅
   - ~~Update user creation logic to assign default roles~~ ✅

2. ✅ **~~Implement Default Role Assignment~~** - COMPLETED
   - ~~Assign `editor` role to new users by default~~ ✅
   - ~~Add migration for existing users~~ ✅
   - ~~Ensure editor role~~ ✅

3. **Add Backend Permission Validation**
   - Implement middleware to check roles on API endpoints
   - Validate permissions before executing operations

4. **Create Role Management Interface**
   - Admin panel for user management
   - Role assignment/revocation functionality
   - User permission overview

5. **Add Audit Logging**
   - Track permission changes
   - Log authorization failures
   - Monitor role assignments

## 🏗️ Architecture Summary

The authorization system is **well-architected** with a clean separation of concerns:

- **Types** (`src/types/user.ts`) - Role definitions and user interfaces
- **Service** (`src/services/permissionsService.ts`) - Core permission logic
- **Hooks** (`src/hooks/usePermissions.ts`) - React integration
- **Middleware** (`src/middleware/AuthMiddleware.tsx`) - Component protection
- **Backend** (`functions/persistence/userOperations.ts`) - User management

The system supports hierarchical roles, granular permissions, and role inheritance - providing a solid foundation for enterprise-grade access control once the missing pieces are implemented.

## 🔍 Key Findings: Permission Discrepancy Analysis

**User Observation**: "All registered users are in at least editor role. I am currently the only registered user and after sign in I can perform any available action, including create and update schemas and schema versions."

**Root Cause Identified**: Type system mismatch between backend and frontend User interfaces.

**Previous Technical Reality**:
- Backend created users without any roles (`functions/types/user.ts` had no roles field)
- Frontend expected users to have roles (`src/types/user.ts` has optional roles field)
- Permission system defaulted undefined roles to empty array `[]`
- Empty array should have resulted in no permissions

**✅ RESOLUTION IMPLEMENTED**:
1. **Backend User Interface Updated**: Added `roles: UserRole[]` field to match frontend
2. **Default Role Assignment**: All new users automatically get `["editor"]` role
3. **Database Migration**: Added `roles` column with default `'["editor"]'` value
4. **Existing Users Updated**: Migration ensures all existing users have editor role
5. **Specific User Ensured**: `me@somebody.me` explicitly assigned editor role

**Current Status**: The authorization system now works as expected with all users receiving the editor role by default, providing consistent behavior between code logic and runtime execution.
