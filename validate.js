import { instance, compile } from './compile.js'
import spec from 'ajv/dist/refs/json-schema-2020-12/schema.json' assert { type: 'json' }

const defaultOptions = {
  allErrors: true // required for `errorMessage`
}

export const validate = async (schema, options = {}) => {
  options = { ...defaultOptions, ...options }

  let validate, valid
  // Spec check
  // const ajv = new Ajv(options)
  // validate = ajv.compile(spec)
  // valid = validate(schema)
  // ajv.removeSchema()
  // if (!valid) {
  //   console.error('Schema is not spec compliant')
  //   return valid
  // }

  // Compile check
  try {
    validate = compile(schema, options)
  } catch (e) {
    console.error(e.message)
    return valid
  }

  // Data Check
  let testSuccess = true
  for (const data of options?.testData ?? []) {
    valid = validate(data)
    if (!valid) {
      console.error(validate.errors)
      testSuccess = false
    }
  }

  return testSuccess
}

export default validate
