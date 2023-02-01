import { stat, readFile, writeFile } from 'node:fs/promises'
import { dereference } from '@apidevtools/json-schema-ref-parser'

const fileExists = async (filepath) => {
  const stats = await stat(filepath)
  if (!stats.isFile()) {
    throw new Error(`${filepath} is not a file`)
  }
}

export default async (input, options) => {
  await fileExists(input)

  const jsonSchema = await readFile(input, { encoding: 'utf8' }).then((res) =>
    JSON.parse(res)
  )

  const json = await dereference(jsonSchema)

  if (options.output) {
    await writeFile(options.output, JSON.stringify(json), 'utf8')
  } else {
    console.log(JSON.stringify(json))
  }
}
