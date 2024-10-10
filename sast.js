import { createRequire } from 'node:module'
import Ajv from 'ajv/dist/2020.js'
//import sastSchema from 'sast-json-schema/index.json' with { type: 'json' }

const defaultOptions = {
  strictTypes: false,
  allErrors: true
}

const sastSchema = createRequire(import.meta.url)(
  './node_modules/sast-json-schema/index.json'
)
export const sast = (schema, options = {}) => {
  options = { ...defaultOptions, ...options }

  const ajv = new Ajv(options)
  const validate = ajv.compile(sastSchema)

  return validate
}

export default sast
