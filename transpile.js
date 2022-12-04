import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

import { instance, compile } from './compile.js'
import standaloneCode from 'ajv/dist/standalone/index.js'
import { build } from 'esbuild'

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

  const file = join(tmpdir(), randomBytes(16).toString('hex') + '.js')
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
