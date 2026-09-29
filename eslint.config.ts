import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfigWithVueTs(
  { name: 'kgb/arquivos', files: ['**/*.{ts,mts,vue}'] },
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/generated/**',
    '**/.turbo/**',
    '.superpowers/**',
    'docs/**',
    'apps/prestador/ios/**',
    'apps/prestador/android/**',
    'packages/api-client/src/schema.d.ts',
    'tools/visual/.saida/**',
  ]),
  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  { ...pluginVitest.configs.recommended, files: ['**/*.test.ts'] },
  { name: 'kgb/regras', rules: { 'vue/multi-word-component-names': 'off' } },
  skipFormatting,
)
