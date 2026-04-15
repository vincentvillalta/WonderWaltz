import { describe, it, expect } from 'vitest';
import { classifyConfidence } from '../../src/forecast/confidence.js';

/**
 * Pure-function table test for the confidence classifier (FC-03).
 * Thresholds (CONTEXT.md Area 2):
 *   high   : weeks >= 8 AND samples > 50
 *   medium : weeks >= 4 AND samples > 20
 *   low    : otherwise
 */
describe('classifyConfidence', () => {
  const cases: Array<[number, number, 'high' | 'medium' | 'low', string]> = [
    [100, 10, 'high', 'above both thresholds'],
    [51, 8, 'high', 'exactly meeting high'],
    [50, 8, 'medium', 'samples at boundary (50) → medium'],
    [100, 7.9, 'medium', 'weeks just below 8'],
    [30, 5, 'medium', 'above medium thresholds'],
    [21, 4, 'medium', 'exactly meeting medium'],
    [20, 4, 'low', 'samples at boundary (20) → low'],
    [100, 3.9, 'low', 'weeks just below 4'],
    [3, 10, 'low', 'few samples, plenty of weeks'],
    [100, 0, 'low', 'no history at all'],
    [0, 0, 'low', 'empty bucket'],
  ];

  for (const [samples, weeksOfHistory, expected, label] of cases) {
    it(`samples=${samples}, weeks=${weeksOfHistory} → ${expected} (${label})`, () => {
      expect(classifyConfidence({ samples, weeksOfHistory })).toBe(expected);
    });
  }
});
