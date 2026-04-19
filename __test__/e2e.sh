#!/usr/bin/env bash
set -euo pipefail

bundle() {
  local schema="$1"
  local data="${schema/schema/data}"
  local out="${schema%.json}.js"

  echo "validate ${schema}"
  node cli.js validate "${schema}" --valid \
    --strict true --coerce-types array --all-errors --use-defaults empty

  echo "sast ${schema}"
  node cli.js sast "${schema}"

  echo "transpile ${schema}"
  node cli.js transpile "${schema}" \
    --strict true --coerce-types array --all-errors --use-defaults empty \
    -o "${out}"

  echo "test ${schema}"
  node --input-type=module -e "
    import validate from '${out}';
    import data from '${data}' with { type: 'json' };
    const valid = validate(data);
    console.log(valid, JSON.stringify(validate.errors));
  "

  rm -f "${out}"
}

bundle ./__test__/formats.schema.json
