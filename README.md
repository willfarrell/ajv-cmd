<div align="center">
  <h1>ajv-cmd</h1>
  <p><strong>CLI for AJV JSON Schema validation</strong></p>
<p>
  <a href="https://github.com/willfarrell/ajv-cmd/actions/workflows/test-unit.yml"><img src="https://github.com/willfarrell/ajv-cmd/actions/workflows/test-unit.yml/badge.svg" alt="GitHub Actions unit test status"></a>
  <a href="https://github.com/willfarrell/ajv-cmd/actions/workflows/test-sast.yml"><img src="https://github.com/willfarrell/ajv-cmd/actions/workflows/test-sast.yml/badge.svg" alt="GitHub Actions SAST test status"></a>
  <a href="https://github.com/willfarrell/ajv-cmd/actions/workflows/test-lint.yml"><img src="https://github.com/willfarrell/ajv-cmd/actions/workflows/test-lint.yml/badge.svg" alt="GitHub Actions lint test status"></a>
  <br/>
  <a href="https://www.npmjs.com/package/ajv-cmd"><img alt="npm version" src="https://img.shields.io/npm/v/ajv-cmd.svg"></a>
  <a href="https://packagephobia.com/result?p=ajv-cmd"><img src="https://packagephobia.com/badge?p=ajv-cmd" alt="npm install size"></a>
  <a href="https://www.npmjs.com/package/ajv-cmd"><img alt="npm weekly downloads" src="https://img.shields.io/npm/dw/ajv-cmd.svg"></a>
  <a href="https://www.npmjs.com/package/ajv-cmd#provenance">
  <img alt="npm provenance" src="https://img.shields.io/badge/provenance-Yes-brightgreen"></a>
  <br/>
  <a href="https://scorecard.dev/viewer/?uri=github.com/willfarrell/ajv-cmd"><img src="https://api.scorecard.dev/projects/github.com/willfarrell/ajv-cmd/badge" alt="Open Source Security Foundation (OpenSSF) Scorecard"></a>
  <a href="https://slsa.dev"><img src="https://slsa.dev/images/gh-badge-level3.svg" alt="SLSA 3"></a>
  <a href="https://biomejs.dev"><img alt="Checked with Biome" src="https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome"></a>
  <a href="https://conventionalcommits.org"><img alt="Conventional Commits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white"></a>
</p>
</div>

Deref, Validate, Transpile, and Test JSON-Schema (.json) files using ajv.

### Setup

```bash
$ npm install -D ajv-cmd
$ ajv --help
```

Based off of [ajv-cli](https://ajv.js.org/packages/ajv-cli.html).

## Examples

### Pre-transpile all handler schemas

```bash
#!/usr/bin/env bash

function bundle {
  ajv validate ${1} --valid \
	--strict true --coerce-types array --all-errors true --use-defaults empty
  ajv transpile ${1} \
	--strict true --coerce-types array --all-errors true --use-defaults empty \
	-o ${1%.json}.js
}

for file in handlers/*/schema.*.json; do
  if [ ! -n "$(bundle $file | grep ' is valid')" ]; then
	echo "$file failed"
	exit 1
  fi
done
```
