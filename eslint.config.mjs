import html from 'eslint-plugin-html';
import globals from 'globals';

export default [
  {
    files: ['*.html'],
    plugins: { html },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2021,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'semi': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
];
