import { stat, readFile, writeFile } from 'node:fs/promises'
import validate from '../validate.js'

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

  if (options?.testDataFiles) {
    const testDataFiles = []
    for (const testDataFilePath of options.testDataFiles) {
      const testDataFile = await readFile(testDataFilePath, {
        encoding: 'utf8'
      }).then((res) => JSON.parse(res))
      testDataFiles.push(testDataFile)
    }
    options.testData = testDataFiles
  }

  const valid = await validate(jsonSchema, options)
  if (valid) {
    if (options.invalid) {
      console.log(input, 'is valid, failed')
      process.exit(1)
    } else {
      console.log(input, 'is valid, success')
    }
  } else {
    if (options.valid) {
      console.log(input, 'is invalid, failed')
      process.exit(1)
    } else {
      console.log(input, 'is invalid, success')
    }
  }
}
