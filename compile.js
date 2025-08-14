import Ajv from 'ajv/dist/2020.js'
import ajvFormats from 'ajv-formats'
import ajvFormatsDraft2019 from '@silverbucket/ajv-formats-draft2019'
import ajvKeywords from 'ajv-keywords'
import ajvErrors from 'ajv-errors'

const defaultOptions = {}

export const instance = (options = {}) => {
  options = { ...defaultOptions, ...options, keywords: [] }

  const ajv = new Ajv(options)
  ajvFormats(ajv)
  ajvFormatsDraft2019(ajv)
  ajvKeywords(ajv)
  ajvErrors(ajv)
  return ajv
}

export const compile = (schema, options = {}) => {
  options = { ...defaultOptions, ...options, keywords: [] }
  const ajv = instance(options)
  return ajv.compile(schema)
}

export default compile
