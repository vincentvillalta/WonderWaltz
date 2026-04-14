import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

describe('DATA-05 attribution content file', () => {
  it('exists at packages/content/legal/attribution.en.json', () => {
    // This will throw if file does not exist
    const content = readFileSync(join(__dirname, '..', 'legal', 'attribution.en.json'), 'utf-8');
    expect(content).toBeTruthy();
  });

  it('contains the exact attribution text "Data source: queue-times.com"', () => {
    const content = readFileSync(join(__dirname, '..', 'legal', 'attribution.en.json'), 'utf-8');
    const parsed = JSON.parse(content) as { text: string };
    expect(parsed.text).toBe('Data source: queue-times.com');
  });

  it('exports ATTRIBUTION constant matching the JSON text field', async () => {
    const { ATTRIBUTION } = await import('./attribution.js');
    expect(ATTRIBUTION).toBe('Data source: queue-times.com');
  });
});
