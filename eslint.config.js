const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const nextTypescript = require('eslint-config-next/typescript');

module.exports = [
  {
    ignores: ['.kilo/**', '.next/**', 'out/**', 'build/**', 'public/sw.js'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.config.{js,ts,mjs,cjs}', 'tailwind.config.ts', 'postcss.config.*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
