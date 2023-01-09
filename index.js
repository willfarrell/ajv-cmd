import {
  instance as instanceImport,
  compile as compileImport
} from './compile.js'
import ftlImport from './ftl.js'
import transpileImport from './transpile.js'
import validateImport from './validate.js'

export const instance = instanceImport
export const compile = compileImport
export const transpile = transpileImport
export const validate = validateImport
export const ftl = ftlImport

export default {
  instance,
  compile,
  ftl,
  transpile,
  validate
}
