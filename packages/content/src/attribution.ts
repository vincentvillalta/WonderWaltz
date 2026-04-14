import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const raw = require('../legal/attribution.en.json') as { text: string };

export const ATTRIBUTION = raw.text;
