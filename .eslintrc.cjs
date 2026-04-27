module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  extends: ['eslint:recommended'],
  rules: {
    // We turn the noisy rules from 'error' down to 'warn' instead of off,
    // so npm run lint surfaces them but CI does not block on legacy
    // patterns we have not paid down yet. New code should still come in
    // clean (a teammate sees the warning at PR review).
    'no-unused-vars': ['warn', {
      // Allow common conventions: leading underscore = intentional skip,
      // and unused fn args after a used one (e.g. Express err, req, res, next).
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrors: 'none'
    }],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    // 'no-undef' stays at the eslint:recommended default ('error') — leaving
    // it off was hiding genuine reference bugs.
    'no-useless-escape': 'warn',
    'no-control-regex': 'off'
  },
  // Frontend (Vite) source: enable browser globals via env above; backend
  // source uses node globals. The script files in /scripts and /tests are
  // always Node, so we don't need overrides for now.
  overrides: [
    {
      // Service workers run in a different global scope (clients, caches,
      // skipWaiting…). Tell ESLint about it instead of riddling the SW
      // file with /* global */ comments.
      files: ['public/sw.js'],
      env: { serviceworker: true, browser: true, node: false },
    },
    {
      // Smoke / migration scripts sometimes use \`while (true)\` with an
      // explicit \`break\` for budget-bounded loops. That's deliberate.
      files: ['scripts/**/*.js'],
      rules: { 'no-constant-condition': 'off' },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'public/blog/',
    'coverage/',
    'uploads/'
  ]
};
