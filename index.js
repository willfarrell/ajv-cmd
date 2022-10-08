import {
  instance as instanceImport,
  compile as compileImport
} from './compile.js'
import transpileImport from './transpile.js'
import validateImport from './validate.js'

export const instance = instanceImport
export const compile = compileImport
export const transpile = transpileImport
export const validate = validateImport

export default {
  instance,
  compile,
  transpile,
  validate
}
