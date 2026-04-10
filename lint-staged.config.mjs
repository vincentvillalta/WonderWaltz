export default {
  '*.{ts,tsx,mts,cts}': ['eslint --fix', 'prettier --write'],
  '*.{js,mjs,cjs}': ['prettier --write'],
  '*.{json,yaml,yml,md}': ['prettier --write'],
};
