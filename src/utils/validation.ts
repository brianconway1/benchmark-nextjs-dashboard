/**
 * Email validation utility
 * Validates email format using a comprehensive regex pattern
 * 
 * @param email - The email string to validate
 * @returns true if the email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Comprehensive email regex pattern
  // Matches: user@domain.com, user.name@domain.co.uk, etc.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Additional check: email should not be too long (RFC 5321 limit is 320 characters)
  if (email.length > 320) {
    return false;
  }

  // Check for basic structure: must have @ and at least one dot after @
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;
  
  // Local part (before @) should be 1-64 characters (RFC 5321)
  if (!localPart || localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Domain part should have at least one dot
  if (!domain || !domain.includes('.')) {
    return false;
  }

  // Final regex check
  return emailRegex.test(email.trim());
}

/**
 * Get email validation error message
 * 
 * @param email - The email string to validate
 * @returns Error message if invalid, null if valid
 */
export function getEmailValidationError(email: string): string | null {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}

