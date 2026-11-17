import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts', '!src/tooling/**'],
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  unbundle: true,
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: [/^node:/],
  },
})
