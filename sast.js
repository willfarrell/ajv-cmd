import Ajv from 'ajv/dist/2020.js'
import sastSchema from 'sast-json-schema/index.json' with { type: 'json' } 

const defaultOptions = {
  strictTypes: false,
  allErrors: true
}

let schema
export const sast =  (schema, options = {}) => {
  options = { ...defaultOptions, ...options }

  const ajv = new Ajv(options)
  const validate = ajv.compile(sastSchema)

  return validate
}

export default sast
