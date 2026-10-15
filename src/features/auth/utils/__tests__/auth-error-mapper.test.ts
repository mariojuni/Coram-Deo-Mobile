import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapAuthError } from '../auth-error-mapper';
import { AppAuthError } from '../../domain/auth-error.types';

describe('auth-error-mapper', () => {
  it('returns AppAuthError directly if error is already an AppAuthError', () => {
    const original = new AppAuthError({
      code: 'AUTH-1001',
      userMessage: 'Test user message',
    });
    const result = mapAuthError(original);
    assert.strictEqual(result, original);
    assert.strictEqual(result.code, 'AUTH-1001');
  });

  it('maps invalid credential Firebase codes to AUTH-1001', () => {
    const result = mapAuthError({ code: 'auth/invalid-credential', message: 'The supplied auth credential is incorrect' });
    assert.strictEqual(result.code, 'AUTH-1001');
    assert.strictEqual(result.displayMessage, 'Invalid email, username, or password. (AUTH-1001)');
  });

  it('maps invalid email code to AUTH-1002', () => {
    const result = mapAuthError({ code: 'auth/invalid-email', message: 'Bad email' });
    assert.strictEqual(result.code, 'AUTH-1002');
    assert.strictEqual(result.displayMessage, 'Please enter a valid email address or username. (AUTH-1002)');
  });

  it('maps network errors to AUTH-2001', () => {
    const result = mapAuthError(new Error('Network request failed'));
    assert.strictEqual(result.code, 'AUTH-2001');
    assert.strictEqual(result.displayMessage, 'Unable to connect. Please check your internet connection and try again. (AUTH-2001)');
  });

  it('identifies OAuth cancellations correctly and sets isCancellation to true', () => {
    const result = mapAuthError(new Error('SIGN_IN_CANCELLED'));
    assert.strictEqual(result.code, 'AUTH-4001');
    assert.strictEqual(result.isCancellation, true);

    const appleCancel = mapAuthError({ code: '1001', message: 'ERR_REQUEST_CANCELED' });
    assert.strictEqual(appleCancel.code, 'AUTH-4001');
    assert.strictEqual(appleCancel.isCancellation, true);
  });

  it('maps account disabled to AUTH-3001', () => {
    const result = mapAuthError({ code: 'auth/user-disabled' });
    assert.strictEqual(result.code, 'AUTH-3001');
    assert.ok(result.displayMessage.includes('AUTH-3001'));
  });

  it('maps developer error / test user OAuth error to AUTH-4002', () => {
    const result = mapAuthError({ code: '10', message: 'DEVELOPER_ERROR' });
    assert.strictEqual(result.code, 'AUTH-4002');
    assert.ok(result.displayMessage.includes('AUTH-4002'));
  });

  it('maps completely unknown exceptions to safe fallback AUTH-9001 without exposing raw system info', () => {
    const weirdError = new Error('Random unexpected crash in internal library');
    const result = mapAuthError(weirdError);
    assert.strictEqual(result.code, 'AUTH-9001');
    assert.strictEqual(result.displayMessage, 'We encountered an unexpected issue while signing you in. Please try again. (AUTH-9001)');
    assert.ok(!result.userMessage.includes('Random unexpected crash'));
    assert.strictEqual(result.technicalMessage, 'Random unexpected crash in internal library');
  });
});
