#!/usr/bin/env bash

function bundle {
  echo "validate ${1}"
  node cli.js validate ${1} --valid \
	--strict true --coerce-types array --all-errors true --use-defaults empty
  
  echo "transpile ${1}"
  node cli.js transpile ${1} \
	--strict true --coerce-types array --all-errors true --use-defaults empty \
		-o ${1%.json}.js
  
  #cat ${1/schema/data}
  
  echo "test ${1}"
  node --input-type=module -e "import validate from '${1%.json}.js'; import data from '${1/schema/data}' assert {type:'json'}; const valid = validate(data); console.log(valid, JSON.stringify(validate.errors))"
}

bundle ./__test__/formats.schema.json

