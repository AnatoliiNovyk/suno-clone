import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // These were all switched off, which is how a dead `onClose` prop and an
      // unread `error` sat in the codebase unnoticed. Underscore-prefixed names
      // remain the escape hatch for genuinely unused bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // Deliberately off, not overlooked. Both come from the React Compiler
      // rule set and object to the app's data-fetching shape rather than to a
      // defect: `set-state-in-effect` fires on all 17 fetch-on-mount effects
      // (load list -> setLoading/setRows), and `immutability` on the single
      // `window.location.href = checkoutUrl` redirect. Satisfying them means
      // adopting a data-fetching library, which is a design decision to take
      // on its own terms — turning them into ignored noise instead would just
      // recreate the problem these two lines used to hide.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
)
