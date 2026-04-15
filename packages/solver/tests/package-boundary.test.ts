import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Static package-boundary check — fails loudly if any solver source file
 * imports from a forbidden package. The solver is pure-TS + node:stdlib
 * only; everything else must stay on the API side of the boundary.
 *
 * See SOLV-01 and CONTEXT.md "Reusable Assets".
 */

const FORBIDDEN_PACKAGES = [
  '@nestjs/',
  'ioredis',
  'postgres',
  'drizzle-orm',
  '@wonderwaltz/db',
  '@sentry/',
  'bullmq',
  'pg',
  '@anthropic-ai/',
] as const;

const FORBIDDEN_NODE_MODULES = ['node:fs', 'node:http', 'node:https', 'node:net', 'node:dgram'];

const here = fileURLToPath(new URL('.', import.meta.url));
const SRC_DIR = join(here, '..', 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const sourceFiles = walk(SRC_DIR);

describe('solver package boundary', () => {
  it('has at least one source file to scan', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  for (const file of sourceFiles) {
    const rel = file.replace(`${join(here, '..')}/`, '');
    const src = readFileSync(file, 'utf8');
    for (const forbidden of FORBIDDEN_PACKAGES) {
      it(`${rel} does not import from forbidden package '${forbidden}'`, () => {
        expect(src).not.toMatch(new RegExp(`from\\s+['"]${escapeRegex(forbidden)}`));
        expect(src).not.toMatch(new RegExp(`import\\(['"]${escapeRegex(forbidden)}`));
        expect(src).not.toMatch(new RegExp(`require\\(['"]${escapeRegex(forbidden)}`));
      });
    }
    for (const nodeMod of FORBIDDEN_NODE_MODULES) {
      it(`${rel} does not import I/O node module '${nodeMod}'`, () => {
        expect(src).not.toMatch(new RegExp(`from\\s+['"]${escapeRegex(nodeMod)}['"]`));
      });
    }
  }
});

describe('solver package.json', () => {
  const pkgPath = join(here, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    name: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it('name is @wonderwaltz/solver', () => {
    expect(pkg.name).toBe('@wonderwaltz/solver');
  });

  it('declares zero runtime dependencies', () => {
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it('devDependencies is the minimal set (typescript, vitest, @types/node)', () => {
    const devs = Object.keys(pkg.devDependencies ?? {}).sort();
    expect(devs).toEqual(['@types/node', 'typescript', 'vitest']);
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
