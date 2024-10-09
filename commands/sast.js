import { stat, readFile, writeFile } from 'node:fs/promises'
import sast from '../sast.js'

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

  const validate = sast(jsonSchema, options)
  const valid = validate(jsonSchema, options)
  if (!valid) {
    if (options.output) {
      JSON.stringify(validate.errors, null, 2)
    }
  }
  if (validate.errors.length) {
    if (typeof options.output === 'string') {
      await writeFile(
        options.output,
        JSON.stringify(validate.errors, null, 2),
        'utf8'
      )
    } else if (options.output === true) {
      return issues
    } else {
      console.log(input, 'has issues', JSON.stringify(validate.errors))
    }
    if (options.fail) {
      process.exit(1)
    }
  } else {
    console.log(input, 'has no issues')
  }
}
