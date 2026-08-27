import { describe, expect, it } from 'vitest';
import { sanitizeProviderText } from './provider-validation.js';

describe('provider validation runtime boundary', () => {
  it('sanitizes provider markup through the production CommonJS import', () => {
    expect(sanitizeProviderText('<b>猫</b><script>alert(1)</script>')).toBe('猫');
  });
});
