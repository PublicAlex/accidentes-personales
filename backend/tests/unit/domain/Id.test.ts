import { describe, expect, it } from 'vitest';
import { isUuid } from '../../../src/domain/shared/Id.js';

describe('isUuid', () => {
  it.each([
    '123e4567-e89b-12d3-a456-426614174000',
    '123E4567-E89B-12D3-A456-426614174000',
  ])('acepta %s', (v) => expect(isUuid(v)).toBe(true));

  it.each(['', 'abc', '123e4567e89b12d3a456426614174000', '123e4567-e89b-12d3-a456-42661417400g', null, undefined, 5])(
    'rechaza %s',
    (v) => expect(isUuid(v)).toBe(false),
  );
});
