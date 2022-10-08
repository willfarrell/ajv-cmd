import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

import { instance, compile } from './compile.js'
import standaloneCode from 'ajv/dist/standalone/index.js'
import { build } from 'esbuild'

const __dirname = dirname(fileURLToPath(import.meta.url))

const defaultOptions = {
  code: {
    esm: true,
    source: true // required to create string of code
  }
}

export const transpile = async (schema, options = {}) => {
  options = { ...defaultOptions, ...options }

  const ajv = instance(options)
  const validate = compile(schema, options)
  let js = standaloneCode(ajv, validate)

  const file = join(__dirname, randomBytes(16).toString('hex') + '.js')
  await writeFile(file, js, 'utf8')

  await build({
    entryPoints: [file],
    platform: 'node',
    format: 'esm',
    bundle: true,
    minify: true,
    legalComments: 'none',
    allowOverwrite: true,
    outfile: file
  })

  js = await readFile(file, { encoding: 'utf8' })
  await unlink(file)

  return js
}

export default transpile
