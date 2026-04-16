import { describe, it, expect } from 'vitest';
import { resolveParkHours } from '../src/parkHours.js';
import type { LodgingType } from '../src/parkHours.js';

// ─── Table-driven park hours tests ─────────────────────────────────────────

describe('resolveParkHours', () => {
  const baseHours = { open: '2026-06-01T09:00:00', close: '2026-06-01T22:00:00' };
  const eehDate = '2026-06-01';
  const nonEehDate = '2026-06-02';

  it('off-property: no adjustments (9:00-22:00 stays)', () => {
    const result = resolveParkHours({
      date: eehDate,
      parkId: 'mk',
      lodgingType: 'off_property',
      baseHours,
      eehNights: [eehDate],
    });

    expect(result.open).toBe('2026-06-01T09:00:00');
    expect(result.close).toBe('2026-06-01T22:00:00');
  });

  it('moderate (on-property): Early Entry -30min (8:30-22:00)', () => {
    const result = resolveParkHours({
      date: eehDate,
      parkId: 'mk',
      lodgingType: 'moderate',
      baseHours,
      eehNights: [],
    });

    expect(result.open).toBe('2026-06-01T08:30:00');
    expect(result.close).toBe('2026-06-01T22:00:00');
  });

  it('value (on-property): Early Entry -30min (8:30-22:00)', () => {
    const result = resolveParkHours({
      date: eehDate,
      parkId: 'mk',
      lodgingType: 'value',
      baseHours,
      eehNights: [],
    });

    expect(result.open).toBe('2026-06-01T08:30:00');
    expect(result.close).toBe('2026-06-01T22:00:00');
  });

  it('deluxe on EEH night: Early Entry + Extended Evening Hours (8:30-00:00)', () => {
    const result = resolveParkHours({
      date: eehDate,
      parkId: 'mk',
      lodgingType: 'deluxe',
      baseHours,
      eehNights: [eehDate],
    });

    expect(result.open).toBe('2026-06-01T08:30:00');
    expect(result.close).toBe('2026-06-02T00:00:00');
  });

  it('deluxe on non-EEH night: Early Entry only (8:30-22:00)', () => {
    const result = resolveParkHours({
      date: nonEehDate,
      parkId: 'mk',
      lodgingType: 'deluxe',
      baseHours: { open: '2026-06-02T09:00:00', close: '2026-06-02T22:00:00' },
      eehNights: [eehDate], // Only June 1 is EEH
    });

    expect(result.open).toBe('2026-06-02T08:30:00');
    expect(result.close).toBe('2026-06-02T22:00:00');
  });

  it('deluxe_villa on EEH night: same as deluxe (8:30-00:00)', () => {
    const result = resolveParkHours({
      date: eehDate,
      parkId: 'mk',
      lodgingType: 'deluxe_villa',
      baseHours,
      eehNights: [eehDate],
    });

    expect(result.open).toBe('2026-06-01T08:30:00');
    expect(result.close).toBe('2026-06-02T00:00:00');
  });

  it('deluxe_villa on non-EEH night: Early Entry only', () => {
    const result = resolveParkHours({
      date: nonEehDate,
      parkId: 'mk',
      lodgingType: 'deluxe_villa',
      baseHours: { open: '2026-06-02T09:00:00', close: '2026-06-02T22:00:00' },
      eehNights: [],
    });

    expect(result.open).toBe('2026-06-02T08:30:00');
    expect(result.close).toBe('2026-06-02T22:00:00');
  });

  it('empty eehNights array with deluxe: no EEH extension', () => {
    const result = resolveParkHours({
      date: eehDate,
      parkId: 'mk',
      lodgingType: 'deluxe',
      baseHours,
      eehNights: [],
    });

    expect(result.open).toBe('2026-06-01T08:30:00');
    expect(result.close).toBe('2026-06-01T22:00:00');
  });

  it('produces deterministic output on repeated calls', () => {
    const input = {
      date: eehDate,
      parkId: 'mk',
      lodgingType: 'deluxe' as LodgingType,
      baseHours,
      eehNights: [eehDate],
    };

    const r1 = resolveParkHours(input);
    const r2 = resolveParkHours(input);
    expect(r1).toEqual(r2);
  });
});
