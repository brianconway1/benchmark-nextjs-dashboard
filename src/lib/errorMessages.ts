/**
 * Convert Firebase auth error codes to user-friendly messages
 */
export function getAuthErrorMessage(error: unknown): string {
  interface FirebaseError {
    code?: string;
    message?: string;
  }
  
  const firebaseError = error as FirebaseError;
  const errorCode = firebaseError?.code || '';
  const errorMessage = firebaseError?.message || '';

  // Map Firebase error codes to friendly messages
  const errorMap: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Invalid email address. Please check your email and try again.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/email-already-in-use': 'An account with this email already exists. Please log in instead.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/invalid-verification-code': 'Invalid verification code. Please check and try again.',
    'auth/invalid-verification-id': 'Invalid verification. Please try again.',
    'auth/requires-recent-login': 'This operation requires recent authentication. Please log in again.',
    'auth/quota-exceeded': 'Service quota exceeded. Please try again later.',
    'auth/credential-already-in-use': 'This credential is already associated with a different account.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in method.',
  };

  // Check if we have a mapped message
  if (errorCode && errorMap[errorCode]) {
    return errorMap[errorCode];
  }

  // Fallback to original message or generic error
  return errorMessage || 'An error occurred. Please try again.';
}

