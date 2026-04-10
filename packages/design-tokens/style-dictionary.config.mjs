import StyleDictionary from 'style-dictionary';
import { mkdirSync } from 'fs';

// Ensure generated/ directory exists
mkdirSync('generated', { recursive: true });

// Register custom Tailwind v4 format
StyleDictionary.registerFormat({
  name: 'css/tailwind-v4',
  format: ({ dictionary }) => {
    const vars = dictionary.allTokens
      .map((token) => `  --${token.name}: ${token.$value ?? token.value};`)
      .join('\n');
    return `@theme {\n${vars}\n}\n`;
  },
});

const sd = new StyleDictionary({
  source: ['tokens.json'],
  platforms: {
    swift: {
      // Override UIColorSwift with ColorSwiftUI — required for SwiftUI (Pitfall 5)
      transforms: [
        'attribute/cti',
        'name/camel',
        'color/ColorSwiftUI',
        'content/swift/literal',
        'asset/swift/literal',
        'size/swift/remToCGFloat',
      ],
      buildPath: 'generated/',
      files: [
        {
          destination: 'WWDesignTokens.swift',
          format: 'ios-swift/class.swift',
          className: 'WWDesignTokens',
          options: { outputReferences: false },
        },
      ],
    },
    compose: {
      transformGroup: 'compose',
      buildPath: 'generated/',
      files: [
        {
          destination: 'WWTheme.kt',
          format: 'compose/object',
          className: 'WWThemeTokens',
          packageName: 'com.wonderwaltz.design',
        },
      ],
    },
    css: {
      transformGroup: 'css',
      buildPath: 'generated/',
      files: [
        {
          // Tailwind v4 format — wraps vars in @theme {} (Pitfall 6 fix)
          destination: 'tokens.css',
          format: 'css/tailwind-v4',
        },
      ],
    },
    typescript: {
      transformGroup: 'js',
      buildPath: 'generated/',
      files: [
        {
          destination: 'tokens.ts',
          format: 'javascript/es6',
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
console.log('Design token build complete.');
