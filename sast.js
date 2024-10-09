const defaultOptions = {
  strictTypes: false,
  allErrors: true
}

let schema
export const sast = async (schema, options = {}) => {
  options = { ...defaultOptions, ...options }

  //schema ??= await fetch('https://raw.githubusercontent.com/willfarrell/sast-json-schema/main/index.json'

  const ajv = new Ajv(options)
  const compile = ajv.compile(schema)

  let validate, valid

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

export default sast
