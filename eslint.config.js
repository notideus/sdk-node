import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'comma-dangle': ['error', 'never'],
      'brace-style': ['error', '1tbs']
    }
  },
  { ignores: ['dist', 'node_modules'] }
);
