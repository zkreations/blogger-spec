import process from 'node:process'
import { compile } from './compiler.js'

export * from './compiler.js'

export const buildSpec = compile

if (process.argv[1] && (process.argv[1].endsWith('build.ts') || process.argv[1].endsWith('build.js'))) {
  try {
    const targetArg = process.argv[2]
    compile(targetArg)
  }
  catch (err: any) {
    console.error(`\n[FAIL] Build error: ${err.message}`)
    process.exit(1)
  }
}
