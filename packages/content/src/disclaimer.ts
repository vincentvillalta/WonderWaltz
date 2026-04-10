import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const raw = require('../legal/disclaimer.en.json') as { text: string; shortText: string };

export const DISCLAIMER = raw.text;
export const DISCLAIMER_SHORT = raw.shortText;
