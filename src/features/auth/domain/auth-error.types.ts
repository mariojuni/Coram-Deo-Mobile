export type AuthErrorCode =
  // 1000s: Credentials & Input
  | 'AUTH-1001' // Invalid email/username or password
  | 'AUTH-1002' // Invalid email format
  | 'AUTH-1003' // Username not found
  | 'AUTH-1004' // Weak password
  | 'AUTH-1005' // Email already registered
  | 'AUTH-1006' // Username already taken
  // 2000s: Network & Connectivity
  | 'AUTH-2001' // Network request failed / offline
  | 'AUTH-2002' // Request timeout
  // 3000s: Account & Policy
  | 'AUTH-3001' // User account disabled
  | 'AUTH-3002' // Account exists with different credential
  | 'AUTH-3003' // Admin-restricted operation
  | 'AUTH-3004' // Too many attempts / temporarily locked
  | 'AUTH-3005' // Permission denied (Firestore rules/lookup)
  // 4000s: Third-Party OAuth (Google / Apple)
  | 'AUTH-4001' // Sign-in was cancelled by user
  | 'AUTH-4002' // OAuth configuration / developer error (e.g. SHA-1 or test user)
  | 'AUTH-4003' // Auth provider not enabled in Firebase
  | 'AUTH-4004' // Missing OAuth token / credential
  // 9000s: Generic & System Fallback
  | 'AUTH-9001'; // Unexpected system error (safe fallback)

export interface AppAuthErrorDetails {
  code: AuthErrorCode;
  userMessage: string;
  technicalMessage?: string;
  isCancellation?: boolean;
}

export class AppAuthError extends Error {
  readonly code: AuthErrorCode;
  readonly userMessage: string;
  readonly technicalMessage?: string;
  readonly isCancellation: boolean;
  readonly originalError?: unknown;

  constructor(details: AppAuthErrorDetails, originalError?: unknown) {
    super(`[${details.code}] ${details.userMessage}`);
    this.name = 'AppAuthError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.technicalMessage = details.technicalMessage;
    this.isCancellation = Boolean(details.isCancellation);
    this.originalError = originalError;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppAuthError.prototype);
  }

  /**
   * Formatted string suitable for UI display containing user message and error reference code.
   */
  get displayMessage(): string {
    return `${this.userMessage} (${this.code})`;
  }
}
