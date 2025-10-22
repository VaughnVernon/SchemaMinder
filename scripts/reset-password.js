#!/usr/bin/env node

/**
 * Password Reset Script for Kalele Domo Schema Minder
 *
 * This script resets a user's password in the SQLite database of a Durable Object.
 * It connects to the local Wrangler dev environment or can be adapted for production.
 *
 * Usage:
 *   node scripts/reset-password.js <email> <new-password>
 *
 * Example:
 *   node scripts/reset-password.js me@somebody.me AreYouJoking-12-2024?
 */

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node scripts/reset-password.js <email> <new-password>');
  console.error('Example: node scripts/reset-password.js me@somebody.me AreYouJoking-12-2024?');
  process.exit(1);
}

const [email, newPassword] = args;
const tenantId = process.env.TENANT_ID || 'default-tenant';
const registryId = process.env.REGISTRY_ID || 'default-registry';
const apiUrl = process.env.API_URL || 'http://localhost:8789';

console.log('Password Reset Script');
console.log('====================');
console.log(`Email: ${email}`);
console.log(`Tenant: ${tenantId}`);
console.log(`Registry: ${registryId}`);
console.log(`API URL: ${apiUrl}`);
console.log('');

// SHA-512 password hashing function (matches PasswordService)
async function hashPassword(password) {
  const crypto = require('crypto');

  // Generate a random salt (32 bytes = 64 hex characters)
  const salt = crypto.randomBytes(32).toString('hex');

  // Create password + salt combination
  const passwordWithSalt = password + salt;

  // Hash using SHA-512
  const hash = crypto.createHash('sha512');
  hash.update(passwordWithSalt);
  const hashHex = hash.digest('hex');

  // Return salt:hash format for storage
  return `${salt}:${hashHex}`;
}

// Main function
async function resetPassword() {
  try {
    console.log('Step 1: Hashing new password...');
    const passwordHash = await hashPassword(newPassword);
    console.log('✓ Password hashed successfully');
    console.log('');

    console.log('Step 2: Sending password reset request to API...');
    const response = await fetch(`${apiUrl}/schema-registry/api/${tenantId}/${registryId}/admin/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailAddress: email,
        passwordHash: passwordHash
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('✗ Failed to reset password');
      console.error(`Status: ${response.status}`);
      console.error(`Error: ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✓ Password reset successfully!');
      console.log('');
      console.log(`User ${email} can now login with the new password.`);
    } else {
      console.error('✗ Password reset failed');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('✗ Error resetting password:', error.message);
    console.error('');
    console.error('Make sure the Wrangler dev server is running:');
    console.error('  npx wrangler dev --port 8789');
    process.exit(1);
  }
}

resetPassword();
