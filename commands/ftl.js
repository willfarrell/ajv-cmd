import { stat, readFile, writeFile } from 'node:fs/promises'
import transpile from 'ajv-ftl-i18n'

const fileExists = async (filepath) => {
  const stats = await stat(filepath)
  if (!stats.isFile()) {
    throw new Error(`${filepath} is not a file`)
  }
}

const ftl = async (input, options) => {
  await fileExists(input)

  const ftl = await readFile(input, { encoding: 'utf8' })

  const js = transpile(ftl, options)
  if (options.output) {
    await writeFile(options.output, js, 'utf8')
  } else {
    console.log(js)
  }
  return js
}

export default ftl
