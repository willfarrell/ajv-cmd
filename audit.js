// TODO craft into JSON-Schema Spec
export const audit = (schema, path = []) => {
  let issues = []
  if (typeof schema !== 'object') {
    return issues
  }
  switch (schema.type) {
    case 'array':
      if (!Object.hasOwn(schema, 'maxItems')) {
        issues.push({
          message: 'Array missing `maxItems`',
          path: path.join('.')
        })
      }
      if (!Object.hasOwn(schema, 'uniqueItems')) {
        issues.push({
          message: 'Array missing `uniqueItems`',
          path: path.join('.')
        })
      }

      if (!Object.hasOwn(schema, 'items')) {
        issues.push({
          message: 'Array missing `items`',
          path: path.join('.')
        })
      } else {
        issues = issues.concat(audit(schema.items, [...path, 'items']))
      }

      break
    case 'integer':
    case 'number':
      if (Object.hasOwn(schema, 'enum')) {
        if (!schema.enum.length) {
          issues.push({
            message: 'Number missing values in `enum`',
            path: path.join('.')
          })
        }
      } else {
        if (
          !Object.hasOwn(schema, 'minimum') &&
          !Object.hasOwn(schema, 'exclusiveMinimum')
        ) {
          issues.push({
            message:
              'Number missing `minimum` or `exclusiveMinimum`, should no be >= -9223372036854776000',
            path: path.join('.')
          })
        }
        if (
          !Object.hasOwn(schema, 'maximum') &&
          !Object.hasOwn(schema, 'exclusiveMaximum')
        ) {
          issues.push({
            message:
              'Number missing `maximum` or `exclusiveMaximum`, should not be <= 9223372036854776000',
            path: path.join('.')
          })
        }
        // TODO add in range check
      }
      break
    case 'string':
      if (Object.hasOwn(schema, 'enum')) {
        if (!schema.enum.length) {
          issues.push({
            message: 'String missing values in `enum`',
            path: path.join('.')
          })
        }
      } else if (Object.hasOwn(schema, 'pattern')) {
        if (!checkRegExpStartWith(schema.pattern)) {
          issues.push({
            message: 'String RegExp missing `^` at the start of `pattern`',
            path: path.join('.')
          })
        }
        if (!checkRegExpEndWith(schema.pattern)) {
          issues.push({
            message: 'String RegExp missing `$` at the end of `pattern`',
            path: path.join('.')
          })
        }
      } else if (
        !Object.hasOwn(schema, 'enum') &&
        !Object.hasOwn(schema, 'format') &&
        !Object.hasOwn(schema, 'pattern')
      ) {
        if (!Object.hasOwn(schema, 'maxLength')) {
          issues.push({
            message: 'String missing `maxLength`',
            path: path.join('.')
          })
        }
      }
      break
    case 'object':
      if (schema.additionalProperties === true) {
        if (!Object.hasOwn(schema, 'maxProperties')) {
          issues.push({
            message:
              'Object missing `maxProperties` when `additionalProperties: true`',
            path: path.join('.')
          })
        }
      }

      if (
        !Object.hasOwn(schema, 'allOf') &&
        !Object.hasOwn(schema, 'anyOf') &&
        !Object.hasOwn(schema, 'oneOf') &&
        !Object.hasOwn(schema, 'additionalProperties') &&
        !Object.hasOwn(schema, 'unevaluatedProperties')
      ) {
        issues.push({
          message:
            'Object missing `additionalProperties` (recommended) or `unevaluatedProperties`',
          path: path.join('.')
        })
      }
      if (
        !Object.hasOwn(schema, 'required') &&
        !Object.hasOwn(schema, 'unevaluatedProperties')
      ) {
        issues.push({
          message: 'Object missing `required`',
          path: path.join('.')
        })
      }
      if (
        !Object.hasOwn(schema, 'unevaluatedProperties') &&
        !Object.hasOwn(schema, 'properties') &&
        !Object.hasOwn(schema, 'patternProperties') &&
        !Object.hasOwn(schema, 'maxProperties') &&
        !Object.hasOwn(schema, 'propertyNames')
      ) {
        issues.push({
          message:
            'Object missing `properties` (recommended), and/or `patternProperties`, and/or `propertyNames`, and/or `maxProperties`',
          path: path.join('.')
        })
      }
      if (Object.hasOwn(schema, 'propertyNames')) {
        if (!checkRegExpStartWith(schema.propertyNames.pattern)) {
          issues.push({
            message:
              'propertyNames RegExp missing `^` at the start of `pattern`',
            path: path.join('.')
          })
        }
        if (!checkRegExpEndWith(schema.propertyNames.pattern)) {
          issues.push({
            message: 'propertyNames RegExp missing `$` at the end of `pattern`',
            path: path.join('.')
          })
        }
      }
      if (Object.hasOwn(schema, 'properties')) {
        for (const property in schema.properties) {
          issues = issues.concat(
            audit(schema.properties[property], [
              ...path,
              'properties',
              property
            ])
          )
        }
      }
      if (Object.hasOwn(schema, 'patternProperties')) {
        for (const property in schema.patternProperties) {
          if (!checkRegExpStartWith(property)) {
            issues.push({
              message: 'RegExp missing `^` at the start of `patternProperties`',
              path: path.join('.')
            })
          }
          if (!checkRegExpEndWith(property)) {
            issues.push({
              message: 'RegExp missing `$` at the end of `patternProperties`',
              path: path.join('.')
            })
          }
          issues = issues.concat(
            audit(schema.patternProperties[property], [
              ...path,
              'patternProperties',
              property
            ])
          )
        }
      }

      break
    default:
      if (
        !Object.hasOwn(schema, 'if') &&
        !Object.hasOwn(schema, 'allOf') &&
        !Object.hasOwn(schema, 'anyOf') &&
        !Object.hasOwn(schema, 'oneOf')
      ) {
        issues.push({
          message: 'missing `type`',
          path: path.join('.')
        })
      }
  }

  if (Object.hasOwn(schema, 'allOf')) {
    for (let i = 0, l = schema.allOf.length; i < l; i++) {
      issues = issues.concat(
        audit(schema.allOf[i], [...path, 'allOf', `[${i}]`])
      )
    }
  }
  if (Object.hasOwn(schema, 'anyOf')) {
    for (let i = 0, l = schema.anyOf.length; i < l; i++) {
      issues = issues.concat(
        audit(schema.anyOf[i], [...path, 'anyOf', `[${i}]`])
      )
    }
  }
  if (Object.hasOwn(schema, 'oneOf')) {
    for (let i = 0, l = schema.oneOf.length; i < l; i++) {
      issues = issues.concat(
        audit(schema.oneOf[i], [...path, 'oneOf', `[${i}]`])
      )
    }
  }

  return issues
}

const checkRegExpStartWith = (pattern) =>
  pattern.substring(0, 1) === '^' || pattern.substring(0, 2) === '(^'
const checkRegExpEndWith = (pattern) =>
  pattern.substring(pattern.length - 1) === '$' ||
  pattern.substring(pattern.length - 2) === '$)'

export default audit
