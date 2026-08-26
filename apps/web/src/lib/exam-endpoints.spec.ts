import { describe, expect, it } from 'vitest';
import { getExamMetadataEndpoint } from './exam-endpoints.js';

describe('exam metadata endpoint', () => {
  it('uses the canonical PATCH exam route', () => {
    expect(getExamMetadataEndpoint('exam-123')).toBe('/exams/exam-123');
  });
});
