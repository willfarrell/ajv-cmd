import Ajv from 'ajv/dist/2020.js'
//import sastSchema from 'sast-json-schema/index.json' with { type: 'json' }
// const sastSchema = await import('sast-json-schema/index.json', {
//   assert: {
//     type: 'json'
//   }
// })
import { readFileSync } from 'node:fs'

const __dirname = import.meta.dirname

const defaultOptions = {
  strictTypes: false,
  allErrors: true
}

const sastSchema = JSON.parse(
  readFileSync(__dirname + '/node_modules/sast-json-schema/index.json')
)
export const sast = (schema, options = {}) => {
  options = { ...defaultOptions, ...options }

  const ajv = new Ajv(options)
  const validate = ajv.compile(sastSchema)

  return validate
}

export default sast
