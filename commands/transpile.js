import { stat, readFile, writeFile } from 'node:fs/promises'
import transpile from '../transpile.js'

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

  if (options?.refSchemaFiles) {
    const refSchemas = []
    for (const schemaFilePath of options.refSchemaFiles) {
      const refSchemaFile = await readFile(schemaFilePath, {
        encoding: 'utf8'
      }).then((res) => JSON.parse(res))
      refSchemas.push(refSchemaFile)
    }
    options.schemas = refSchemas
  }

  const js = await transpile(jsonSchema, options)
  if (options.output) {
    await writeFile(options.output, js, 'utf8')
  } else {
    console.log(js)
  }
}
