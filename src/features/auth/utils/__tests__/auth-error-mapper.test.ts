import { mapAuthError } from '../auth-error-mapper';
import { AppAuthError } from '../../domain/auth-error.types';

describe('auth-error-mapper', () => {
  it('returns AppAuthError directly if error is already an AppAuthError', () => {
    const original = new AppAuthError({
      code: 'AUTH-1001',
      userMessage: 'Test user message',
    });
    const result = mapAuthError(original);
    expect(result).toBe(original);
    expect(result.code).toBe('AUTH-1001');
  });

  it('maps invalid credential Firebase codes to AUTH-1001', () => {
    const result = mapAuthError({ code: 'auth/invalid-credential', message: 'The supplied auth credential is incorrect' });
    expect(result.code).toBe('AUTH-1001');
    expect(result.displayMessage).toBe('Invalid email, username, or password. (AUTH-1001)');
  });

  it('maps invalid email code to AUTH-1002', () => {
    const result = mapAuthError({ code: 'auth/invalid-email', message: 'Bad email' });
    expect(result.code).toBe('AUTH-1002');
    expect(result.displayMessage).toBe('Please enter a valid email address or username. (AUTH-1002)');
  });

  it('maps network errors to AUTH-2001', () => {
    const result = mapAuthError(new Error('Network request failed'));
    expect(result.code).toBe('AUTH-2001');
    expect(result.displayMessage).toBe('Unable to connect. Please check your internet connection and try again. (AUTH-2001)');
  });

  it('identifies OAuth cancellations correctly and sets isCancellation to true', () => {
    const result = mapAuthError(new Error('SIGN_IN_CANCELLED'));
    expect(result.code).toBe('AUTH-4001');
    expect(result.isCancellation).toBe(true);

    const appleCancel = mapAuthError({ code: '1001', message: 'ERR_REQUEST_CANCELED' });
    expect(appleCancel.code).toBe('AUTH-4001');
    expect(appleCancel.isCancellation).toBe(true);
  });

  it('maps account disabled to AUTH-3001', () => {
    const result = mapAuthError({ code: 'auth/user-disabled' });
    expect(result.code).toBe('AUTH-3001');
    expect(result.displayMessage).toContain('AUTH-3001');
  });

  it('maps developer error / test user OAuth error to AUTH-4002', () => {
    const result = mapAuthError({ code: '10', message: 'DEVELOPER_ERROR' });
    expect(result.code).toBe('AUTH-4002');
    expect(result.displayMessage).toContain('AUTH-4002');
  });

  it('maps completely unknown exceptions to safe fallback AUTH-9001 without exposing raw system info', () => {
    const weirdError = new Error('Random unexpected crash in internal library');
    const result = mapAuthError(weirdError);
    expect(result.code).toBe('AUTH-9001');
    expect(result.displayMessage).toBe('We encountered an unexpected issue while signing you in. Please try again. (AUTH-9001)');
    expect(result.userMessage).not.toContain('Random unexpected crash');
    expect(result.technicalMessage).toBe('Random unexpected crash in internal library');
  });
});
