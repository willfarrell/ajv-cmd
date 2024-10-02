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

  if (options?.refSchemaFiles) {
    const refSchemas = []
    for (const schemaFilePath of options.refSchemaFiles) {
      const refSchemaFile = await readFile(schemaFilePath, {
        encoding: 'utf8'
      }).then((res) => JSON.parse(res))
      refSchemas.push(refSchemaFile)
    }
    mockFetch(refSchemas)
  }

  const json = await dereference(jsonSchema)

  if (typeof options.output === 'string') {
    await writeFile(options.output, JSON.stringify(json), 'utf8')
  } else if (options.output === true) {
    return json
  } else {
    console.log(JSON.stringify(json))
  }
}

const mockFetch = (schemas) => {
  const _fetch = fetch

  const cache = {}
  const enc = new TextEncoder()
  for (let i = schemas.length; i--; ) {
    const schema = schemas[i]
    if (schema.$id) {
      cache[schema.$id] = enc.encode(JSON.stringify(schema))
    }
  }

  globalThis.fetch = async (...args) => {
    if (cache[args[0].href]) {
      return Promise.resolve({
        status: 200,
        body: true,
        arrayBuffer: async () => cache[args[0].href]
      })
    }

    return _fetch(...args)
  }
}
