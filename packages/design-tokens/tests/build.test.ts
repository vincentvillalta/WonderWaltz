/**
 * Design token build verification.
 * Run: pnpm --filter @wonderwaltz/design-tokens build && vitest run packages/design-tokens/tests/
 *
 * SC-4a: pnpm --filter @wonderwaltz/design-tokens build && test -f packages/design-tokens/generated/WWDesignTokens.swift
 * SC-4b: test -f packages/design-tokens/generated/WWTheme.kt
 * SC-4c: test -f packages/design-tokens/generated/tokens.css && grep -c "@theme"
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '..');
const GENERATED = resolve(PACKAGE_ROOT, 'generated');

beforeAll(() => {
  // Run the build before testing outputs
  execSync('node style-dictionary.config.mjs', {
    cwd: PACKAGE_ROOT,
    stdio: 'pipe',
  });
});

describe('Design token build — all four platform outputs', () => {
  it('generates WWDesignTokens.swift (Swift/iOS)', () => {
    const file = `${GENERATED}/WWDesignTokens.swift`;
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content.length).toBeGreaterThan(100);
  });

  it('WWDesignTokens.swift uses SwiftUI Color, NOT UIKit UIColor (Pitfall 5)', () => {
    const content = readFileSync(`${GENERATED}/WWDesignTokens.swift`, 'utf8');
    expect(content).not.toContain('UIColor');
    // Should contain SwiftUI Color
    expect(content).toContain('Color(');
  });

  it('generates WWTheme.kt (Compose/Android)', () => {
    const file = `${GENERATED}/WWTheme.kt`;
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toContain('object'); // compose/object format
  });

  it('generates tokens.css with @theme block for Tailwind v4 (Pitfall 6)', () => {
    const file = `${GENERATED}/tokens.css`;
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('@theme');
    // Tailwind v4 uses @theme, NOT :root — verify correct format
    expect(content).not.toMatch(/^:root\s*\{/m);
  });

  it('generates tokens.ts (TypeScript)', () => {
    const file = `${GENERATED}/tokens.ts`;
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content.length).toBeGreaterThan(50);
  });
});

interface TokenValue {
  value: string;
  type: string;
}
interface IconographyPlatform {
  library: TokenValue;
  version?: TokenValue;
  defaultWeight?: TokenValue;
}
interface TokensJson {
  color: {
    primitive: Record<string, unknown>;
    park: Record<string, TokenValue>;
    semantic: {
      light: { background: TokenValue };
      dark: { background: TokenValue };
    };
  };
  font: {
    family: { display: TokenValue; ui: TokenValue };
  };
  iconography: {
    web: IconographyPlatform;
    native: IconographyPlatform;
    minTapTarget: TokenValue;
  };
}

describe('tokens.json structural validation', () => {
  it('has two-tier color structure (primitive + semantic)', () => {
    const tokens = JSON.parse(
      readFileSync(resolve(PACKAGE_ROOT, 'tokens.json'), 'utf8'),
    ) as TokensJson;
    expect(tokens.color.primitive).toBeDefined();
    expect(tokens.color.semantic).toBeDefined();
  });

  it('has dark mode variants in semantic tokens', () => {
    const tokens = JSON.parse(
      readFileSync(resolve(PACKAGE_ROOT, 'tokens.json'), 'utf8'),
    ) as TokensJson;
    // New brand structure: color.semantic.light / color.semantic.dark (Plan 01-09)
    expect(tokens.color.semantic.light).toBeDefined();
    expect(tokens.color.semantic.dark).toBeDefined();
    expect(tokens.color.semantic.light.background).toBeDefined();
    expect(tokens.color.semantic.dark.background).toBeDefined();
  });

  it('iconography library is specified (DSGN-07)', () => {
    const tokens = JSON.parse(
      readFileSync(resolve(PACKAGE_ROOT, 'tokens.json'), 'utf8'),
    ) as TokensJson;
    expect(tokens.iconography).toBeDefined();
    // Plan 01-09: web uses Lucide, native uses Phosphor — both are acceptable
    const webLib = tokens.iconography.web.library.value;
    const nativeLib = tokens.iconography.native.library.value;
    expect(['lucide-react', 'lucide']).toContain(webLib);
    expect(['phosphor']).toContain(nativeLib);
  });
});
