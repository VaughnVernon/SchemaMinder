#!/usr/bin/env node

/**
 * Simple Password Reset Script for local development
 *
 * This directly resets the password for me@somebody.me to a default password
 *
 * Usage: node scripts/reset-password-simple.js
 */

const email = 'me@somebody.me';
const newPassword = 'AreYouJoking-12-2024?';
const tenantId = 'default-tenant';
const registryId = 'default-registry';
const apiUrl = 'http://localhost:8789';

console.log('Schema Minder - Password Reset');
console.log('=====================================');
console.log(`Resetting password for: ${email}`);
console.log(`New password will be: ${newPassword}`);
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
    console.log('Step 1: Checking if Wrangler dev server is running...');

    // Test if API is reachable
    try {
      const testResponse = await fetch(`${apiUrl}/schema-registry/api/${tenantId}/${registryId}/registry/info`);
      if (!testResponse.ok) {
        throw new Error('API not responding correctly');
      }
      console.log('✓ Wrangler dev server is running');
    } catch (error) {
      console.error('✗ Cannot reach Wrangler dev server');
      console.error('');
      console.error('Please start the Wrangler dev server first:');
      console.error('  npx wrangler dev --port 8789');
      console.error('');
      process.exit(1);
    }

    console.log('');
    console.log('Step 2: Hashing new password...');
    const passwordHash = await hashPassword(newPassword);
    console.log('✓ Password hashed successfully');
    console.log('');

    console.log('Step 3: Sending password reset request...');
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
      console.log('═══════════════════════════════════════');
      console.log('  LOGIN CREDENTIALS');
      console.log('═══════════════════════════════════════');
      console.log(`  Email:    ${email}`);
      console.log(`  Password: ${newPassword}`);
      console.log('═══════════════════════════════════════');
      console.log('');
      console.log('You can now login to the Schema Minder!');
    } else {
      console.error('✗ Password reset failed');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('✗ Error resetting password:', error.message);
    process.exit(1);
  }
}

resetPassword();
