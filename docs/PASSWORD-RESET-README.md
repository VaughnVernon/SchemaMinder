# Password Reset Scripts

This directory contains scripts for resetting user passwords in the Domo Schema Registry.

## Prerequisites

The Wrangler dev server must be running:
```bash
npx wrangler dev --port 8789
```

## Quick Reset (Recommended)

The simplest way to reset the password for `me@somebody.me`:

```bash
node scripts/reset-password-simple.js
```

This will reset the password to: **`My Secure Dev Password 2024!`**

After running the script, you can login with:
- **Email:** me@somebody.me
- **Password:** My Secure Dev Password 2024!

## Custom Password Reset

To reset a password for any user with a custom password:

```bash
node scripts/reset-password.js <email> <new-password>
```

Examples:
```bash
# Reset password for me@somebody.me
// node scripts/reset-password.js me@somebody.me "AreYouJoking-12-2024?"

# Reset password for another user
node scripts/reset-password.js admin@company.com SecurePass456!
```

## How It Works

1. The script connects to the local Wrangler dev server (port 8789)
2. It hashes the new password using SHA-512 (same as PasswordService)
3. It sends a POST request to `/admin/reset-password` endpoint
4. The password is updated directly in the SQLite database

## Tenant/Registry Configuration

By default, the scripts use:
- **Tenant ID:** `default-tenant`
- **Registry ID:** `default-registry`

To use different tenant/registry values:

```bash
TENANT_ID=my-tenant REGISTRY_ID=my-registry node scripts/reset-password-simple.js
```

## Troubleshooting

### Error: Cannot reach Wrangler dev server

Make sure the Wrangler dev server is running:
```bash
npx wrangler dev --port 8789
```

### Error: User not found

The user must exist in the database. Check the email address is correct.

## Security Note

⚠️ **These scripts are for local development only!**

The `/admin/reset-password` endpoint should be protected or removed in production environments. Never expose this endpoint publicly without proper authentication and authorization.
