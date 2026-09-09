#!/usr/bin/env bash
set -euo pipefail

bundle() {
  local schema="$1"
  local data="${schema/schema/data}"
  local out="${schema%.json}.js"

  echo "validate ${schema}"
  node cli.js validate "${schema}" --valid \
    --strict true --coerce-types array --all-errors true --use-defaults empty

  echo "sast ${schema}"
  # Redact the issues array to keep the console clean; keep the summary line.
  node cli.js sast "${schema}" | awk '/ has issues /{sub(/ \[.*/, " [redacted]"); print; exit} {print}'

  echo "transpile ${schema}"
  node cli.js transpile "${schema}" \
    --strict true --coerce-types array --all-errors true --use-defaults empty \
    -o "${out}"

  echo "test ${schema}"
  node --input-type=module -e "
    import validate from '${out}';
    import data from '${data}' with { type: 'json' };
    const valid = validate(data);
    const errors = validate.errors ?? [];
    console.log(valid, JSON.stringify(errors));
    // The fixture's \`errorMessage\` field intentionally violates type:null to
    // exercise the custom 'ftl' errorMessage, so the validator MUST reject and
    // surface that message. Assert it instead of just printing.
    if (valid !== false) {
      console.error('FAIL: expected the transpiled validator to reject the fixture');
      process.exit(1);
    }
    if (!errors.some((e) => e.message === 'ftl')) {
      console.error('FAIL: expected the custom \"ftl\" errorMessage');
      process.exit(1);
    }
  "

  rm -f "${out}"
}

bundle ./__test__/formats.schema.json

# --nested: the same schema compiled to validate at /body inside a wrapper.
nested() {
  local schema="./__test__/simple.schema.json"
  local out="./__test__/simple.nested.js"

  echo "transpile ${schema} --nested /body"
  node cli.js transpile "${schema}" --nested /body -o "${out}"

  node --input-type=module -e "
    import validate from '${out}';
    if (validate({ body: { name: 'middy' } }) !== true) {
      console.error('FAIL: expected the nested payload to validate');
      process.exit(1);
    }
    // The wrapper property is required, so the un-nested payload must fail.
    if (validate({ name: 'middy' }) !== false) {
      console.error('FAIL: expected the un-nested payload to be rejected');
      process.exit(1);
    }
    validate({ body: { name: 1 } });
    if (validate.errors[0].instancePath !== '/body/name') {
      console.error('FAIL: expected errors to report the nested instancePath');
      process.exit(1);
    }
    console.log('nested ok');
  "

  rm -f "${out}"
}

nested
