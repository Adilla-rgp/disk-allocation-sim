import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022 },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/App.tsx', 'src/main.tsx'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Regra de arquitetura: o core é TypeScript puro, sem React e sem DOM.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'O core não pode depender de React.',
            },
            { group: ['**/ui/**'], message: 'O core não pode importar a interface.' },
          ],
        },
      ],
    },
  },
  {
    files: ['cli/**/*.ts', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
