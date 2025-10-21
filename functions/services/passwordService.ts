/**
 * Password hashing and validation service using SHA-512
 */

import { PasswordRequirements, PasswordValidationResult, DEFAULT_PASSWORD_REQUIREMENTS } from '../types/auth';

export class PasswordService {
  /**
   * Hash a password using SHA-512 with a random salt
   */
  static async hashPassword(password: string): Promise<string> {
    // Generate a random salt
    const saltArray = new Uint8Array(32);
    crypto.getRandomValues(saltArray);
    const salt = Array.from(saltArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Create password + salt combination
    const passwordWithSalt = password + salt;
    
    // Hash using SHA-512
    const encoder = new TextEncoder();
    const data = encoder.encode(passwordWithSalt);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    
    // Convert to hex string
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Return salt:hash format for storage
    return `${salt}:${hashHex}`;
  }

  /**
   * Verify a password against a stored hash
   */
  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      // Split salt and hash
      const [salt, expectedHash] = storedHash.split(':');
      if (!salt || !expectedHash) {
        return false;
      }
      
      // Hash the provided password with the stored salt
      const passwordWithSalt = password + salt;
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordWithSalt);
      const hashBuffer = await crypto.subtle.digest('SHA-512', data);
      
      // Convert to hex string
      const hashArray = new Uint8Array(hashBuffer);
      const computedHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
      
      // Compare hashes using constant-time comparison
      return this.constantTimeCompare(computedHash, expectedHash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password against requirements
   */
  static validatePassword(
    password: string, 
    requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
  ): PasswordValidationResult {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }

    // Check alphabetic requirement
    if (requirements.requireAlphabetic && !/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain alphabetic characters');
    }

    // Check digit requirement
    const digitCount = (password.match(/\d/g) || []).length;
    if (digitCount < requirements.minDigits) {
      errors.push(`Password must contain at least ${requirements.minDigits} digit${requirements.minDigits > 1 ? 's' : ''}`);
    }

    // Check space requirement
    const spaceCount = (password.match(/ /g) || []).length;
    if (spaceCount < requirements.minSpaces) {
      errors.push(`Password must contain at least ${requirements.minSpaces} space${requirements.minSpaces > 1 ? 's' : ''}`);
    }

    // Check special character requirement
    const specialCharCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/g) || []).length;
    if (specialCharCount < requirements.minSpecialChars) {
      errors.push(`Password must contain at least ${requirements.minSpecialChars} special character${requirements.minSpecialChars > 1 ? 's' : ''}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a secure random session token
   */
  static generateSessionToken(): string {
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    return Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}