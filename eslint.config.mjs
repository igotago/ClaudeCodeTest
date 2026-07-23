import html from 'eslint-plugin-html';
import globals from 'globals';

const dataJsGlobals = {
  formatCurrency: 'readonly',
  getVendors: 'readonly',
  addVendor: 'readonly',
  updateVendor: 'readonly',
  deleteVendor: 'readonly',
  getInventory: 'readonly',
  getInventoryByVendor: 'readonly',
  addInventoryItem: 'readonly',
  updateInventoryItem: 'readonly',
  deleteInventoryItem: 'readonly',
  checkout: 'readonly',
  getSettings: 'readonly',
  saveSettings: 'readonly',
};

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
  {
    files: ['antique-mall/**/*.html'],
    plugins: { html },
    languageOptions: {
      globals: { ...globals.browser, ...dataJsGlobals },
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
  {
    files: ['antique-mall/**/*.js'],
    ignores: ['antique-mall/server/**'],
    languageOptions: {
      globals: globals.browser,
      sourceType: 'script',
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
  {
    files: ['antique-mall/server/**/*.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
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
