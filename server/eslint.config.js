// ESLint v9 flat config
/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      '*.log',
      'test_output.txt'
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs'
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^(err|e|error|supabase|nodemailer|healthErr|rootErr)$' }],
      'no-console': 'off'
    }
  }
];
