import { stat, readFile, writeFile } from 'node:fs/promises'
import deref from './deref.js'
import audit from '../audit.js'

const fileExists = async (filepath) => {
  const stats = await stat(filepath)
  if (!stats.isFile()) {
    throw new Error(`${filepath} is not a file`)
  }
}

export default async (input, options) => {
  const jsonSchema = await deref(input, { ...options, output: true })

  const issues = audit(jsonSchema)

  if (issues.length) {
    if (typeof options.output === 'string') {
      await writeFile(options.output, JSON.stringify(issues), 'utf8')
    } else if (options.output === true) {
      return issues
    } else {
      console.log(input, 'has issues', JSON.stringify(issues))
    }
    if (options.fail) {
      process.exit(1)
    }
  } else {
    console.log(input, 'has no issues')
  }
}
