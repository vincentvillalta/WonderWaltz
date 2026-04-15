import { describe, expect, it } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

describe('@anthropic-ai/sdk install', () => {
  it('instantiates with an API key', () => {
    const c = new Anthropic({ apiKey: 'test' });
    expect(c.messages).toBeDefined();
    expect(typeof c.messages.create).toBe('function');
  });

  it('exports a default class constructor', () => {
    expect(typeof Anthropic).toBe('function');
  });
});
