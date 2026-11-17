import antfu from '@antfu/eslint-config'

export function createEslintConfig(options = {}) {
  return antfu({
    ...options,
    ignores: [
      '**/dist/**',
      '**/*.generated.ts',
      '**/.turbo/**',
      '**/.workbench/**',
      '**/fixtures/index.json',
      ...(options.ignores ?? []),
    ],
  })
}

export default createEslintConfig()
