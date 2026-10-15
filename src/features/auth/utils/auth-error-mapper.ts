import { AppAuthError, AuthErrorCode } from '../domain/auth-error.types';

/**
 * Normalizes any error thrown during authentication into a typed AppAuthError.
 * Ensures users are never presented with cryptic, raw SDK dumps or vague "Unknown error" messages.
 */
export function mapAuthError(error: unknown): AppAuthError {
  if (error instanceof AppAuthError) {
    return error;
  }

  const rawError = error as any;
  const errorCode: string = String(rawError?.code || '').trim();
  const rawMessage: string = String(rawError?.message || error || '').trim();
  const lowerMsg = rawMessage.toLowerCase();

  // 1. User Cancellations (Google / Apple)
  if (
    lowerMsg.includes('sign_in_cancelled') ||
    lowerMsg.includes('err_request_canceled') ||
    lowerMsg.includes('user cancelled') ||
    lowerMsg.includes('user canceled') ||
    lowerMsg.includes('operation was canceled') ||
    errorCode === '12501' || // Google Play Services SIGN_IN_CANCELLED
    errorCode === '1001' // Apple Sign In Cancelled
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-4001',
        userMessage: 'Sign-in was canceled.',
        technicalMessage: rawMessage,
        isCancellation: true,
      },
      error
    );
  }

  // 2. Network & Connectivity Issues
  if (
    errorCode === 'auth/network-request-failed' ||
    lowerMsg.includes('network_error') ||
    lowerMsg.includes('network-request-failed') ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('offline')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-2001',
        userMessage: 'Unable to connect. Please check your internet connection and try again.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 3. Invalid Credentials & Lookup
  if (
    errorCode === 'auth/invalid-credential' ||
    errorCode === 'auth/user-not-found' ||
    errorCode === 'auth/wrong-password' ||
    lowerMsg.includes('invalid email/username or password') ||
    lowerMsg.includes('invalid-credential')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-1001',
        userMessage: 'Invalid email, username, or password.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 4. Invalid Email Format
  if (
    errorCode === 'auth/invalid-email' ||
    lowerMsg.includes('valid email address')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-1002',
        userMessage: 'Please enter a valid email address or username.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 5. Username Not Found
  if (lowerMsg.includes('no account found with username')) {
    return new AppAuthError(
      {
        code: 'AUTH-1003',
        userMessage: rawMessage, // e.g. "No account found with username 'foo'."
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 6. Weak Password
  if (errorCode === 'auth/weak-password' || lowerMsg.includes('weak-password')) {
    return new AppAuthError(
      {
        code: 'AUTH-1004',
        userMessage: 'Password should be at least 6 characters long.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 7. Email Already in Use
  if (
    errorCode === 'auth/email-already-in-use' ||
    lowerMsg.includes('email-already-in-use') ||
    lowerMsg.includes('email is already in use')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-1005',
        userMessage: 'An account with this email address already exists.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 8. Username Already Taken
  if (lowerMsg.includes('already taken') && lowerMsg.includes('username')) {
    return new AppAuthError(
      {
        code: 'AUTH-1006',
        userMessage: rawMessage,
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 9. Account Disabled
  if (errorCode === 'auth/user-disabled' || lowerMsg.includes('user-disabled')) {
    return new AppAuthError(
      {
        code: 'AUTH-3001',
        userMessage: 'This account has been disabled. Please contact your church administrator.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 10. Account Exists with Different Credential
  if (
    errorCode === 'auth/account-exists-with-different-credential' ||
    lowerMsg.includes('account-exists-with-different-credential')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-3002',
        userMessage: 'An account already exists with this email address using a different sign-in method.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 11. Admin Restricted Operation
  if (
    errorCode === 'auth/admin-restricted-operation' ||
    lowerMsg.includes('admin-restricted-operation')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-3003',
        userMessage: 'Account registration is currently restricted in Firebase. Please contact your administrator.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 12. Rate Limiting / Too Many Attempts
  if (
    errorCode === 'auth/too-many-requests' ||
    lowerMsg.includes('too-many-requests')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-3004',
        userMessage: 'Too many unsuccessful attempts. Access is temporarily restricted. Please try again later or reset your password.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 13. Firestore Permission Denied (e.g. username lookup rule issue)
  if (
    errorCode === 'permission-denied' ||
    lowerMsg.includes('permission-denied') ||
    lowerMsg.includes('missing firestore permissions')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-3005',
        userMessage: 'Access permission restricted during lookup. Please sign in using your registered email address.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 14. Google OAuth Configuration / Developer Error
  if (
    errorCode === '10' ||
    errorCode === 'auth/developer-error' ||
    lowerMsg.includes('developer_error')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-4002',
        userMessage: 'Google Sign-In is temporarily unavailable due to a configuration check. Please sign in with your email or contact support.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 15. Provider Not Allowed / Enabled
  if (
    errorCode === 'auth/operation-not-allowed' ||
    lowerMsg.includes('operation-not-allowed')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-4003',
        userMessage: 'This sign-in method is currently disabled. Please contact your church administrator.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 16. Missing Token / Credential
  if (
    lowerMsg.includes('no id token found') ||
    lowerMsg.includes('no identity token') ||
    lowerMsg.includes('id token was null')
  ) {
    return new AppAuthError(
      {
        code: 'AUTH-4004',
        userMessage: 'Unable to verify sign-in credentials from provider. Please try again.',
        technicalMessage: rawMessage,
      },
      error
    );
  }

  // 17. Generic & Safe Fallback (No raw stack traces or "Unknown error" exposed)
  return new AppAuthError(
    {
      code: 'AUTH-9001',
      userMessage: 'We encountered an unexpected issue while signing you in. Please try again.',
      technicalMessage: rawMessage || 'Unhandled authentication exception',
    },
    error
  );
}
