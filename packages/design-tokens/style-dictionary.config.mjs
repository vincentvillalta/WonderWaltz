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
      // Note: size/swift/remToCGFloat intentionally omitted — it multiplies px values by 16
      // (designed for rem-to-pt conversion, not px-to-CGFloat passthrough)
      transforms: [
        'attribute/cti',
        'name/camel',
        'color/ColorSwiftUI',
        'content/swift/literal',
        'asset/swift/literal',
      ],
      buildPath: 'generated/',
      files: [
        {
          destination: 'WWDesignTokens.swift',
          format: 'ios-swift/class.swift',
          options: {
            // import must be explicit in options — the format helper defaults to UIKit
            // when no transformGroup is set (Pitfall 5 fix: use SwiftUI instead)
            import: ['SwiftUI'],
            className: 'WWDesignTokens',
            outputReferences: false,
          },
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
          options: {
            // className and packageName must be inside options in Style Dictionary 4
            className: 'WWThemeTokens',
            packageName: 'com.wonderwaltz.design',
          },
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
