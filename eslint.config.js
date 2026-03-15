import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        ignores: ['node_modules/**'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021
            },
            ecmaVersion: 'latest',
            sourceType: 'module'
        },
        rules: {
            // Errors
            'no-unused-vars': ['error', { vars: 'all', args: 'after-used', caughtErrors: 'none', varsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-console': 'off',

            // Code quality
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-duplicate-imports': 'error',

            // Style
            'semi': ['error', 'always'],
            'quotes': ['error', 'single'],
            'indent': ['error', 4],
        }
    },
    {
        // Relax rules for test files
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            'no-unused-vars': 'warn'
        }
    }
];