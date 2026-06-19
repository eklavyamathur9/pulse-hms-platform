import { describe, it, expect } from 'vitest';
import { sortQueue } from '../lib/utils';

describe('sortQueue', () => {
  it('returns empty array for empty input', () => {
    expect(sortQueue([])).toEqual([]);
  });

  it('prioritizes high pain_level (>=8) patients first', () => {
    const input = [
      { pain_level: 3, name: 'Low' },
      { pain_level: 9, name: 'High' },
      { pain_level: 5, name: 'Medium' },
    ];
    const sorted = sortQueue(input);
    expect(sorted[0].name).toBe('High');
    expect(sorted[1].name).toBe('Low');
    expect(sorted[2].name).toBe('Medium');
  });

  it('keeps order among same-priority patients', () => {
    const input = [
      { pain_level: 2, name: 'A' },
      { pain_level: 2, name: 'B' },
    ];
    const sorted = sortQueue(input);
    expect(sorted[0].name).toBe('A');
    expect(sorted[1].name).toBe('B');
  });

  it('handles all high pain_level patients', () => {
    const input = [
      { pain_level: 8, name: 'A' },
      { pain_level: 10, name: 'B' },
      { pain_level: 9, name: 'C' },
    ];
    const sorted = sortQueue(input);
    expect(sorted[0].name).toBe('A');
    expect(sorted[1].name).toBe('B');
    expect(sorted[2].name).toBe('C');
  });
});
