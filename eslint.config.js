const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', '.preview/**', 'supabase/functions/**'] },
  { files: ['*.js', 'scripts/**/*.cjs', 'tests/**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },
]);
