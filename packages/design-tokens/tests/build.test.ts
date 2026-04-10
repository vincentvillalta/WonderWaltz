import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const GENERATED = resolve(import.meta.dirname, '../generated');

describe('Design token build outputs', () => {
  it('generates WWDesignTokens.swift', () => {
    expect(existsSync(`${GENERATED}/WWDesignTokens.swift`)).toBe(true);
  });

  it('generates WWTheme.kt', () => {
    expect(existsSync(`${GENERATED}/WWTheme.kt`)).toBe(true);
  });

  it('generates tokens.css with @theme block', () => {
    expect(existsSync(`${GENERATED}/tokens.css`)).toBe(true);
    const css = readFileSync(`${GENERATED}/tokens.css`, 'utf8');
    expect(css).toContain('@theme');
  });

  it('generates tokens.ts', () => {
    expect(existsSync(`${GENERATED}/tokens.ts`)).toBe(true);
  });

  it('Swift output contains Color (SwiftUI), not UIColor (UIKit)', () => {
    const swift = readFileSync(`${GENERATED}/WWDesignTokens.swift`, 'utf8');
    expect(swift).not.toContain('UIColor');
  });
});
