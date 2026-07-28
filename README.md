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

## Setup

```bash
$ npm install -D ajv-cmd
$ ajv --help
```

Based off of [ajv-cli](https://ajv.js.org/packages/ajv-cli.html). Installs two
bin aliases: `ajv` (drop-in familiarity) and `ajv-cmd` (unambiguous when
`ajv-cli` is also installed).

## Commands

### `ajv validate <input>` (default command)

Compile a JSON-Schema and optionally validate data files against it. Exits
non-zero when the schema fails to compile, when `--valid` is set and the data
is invalid, or when `--invalid` is set and the data is valid.

```bash
$ ajv validate schema.json --valid -d data.json
$ ajv schema.json --valid    # validate is the default command
```

| Option | Description |
| --- | --- |
| `-r, --ref-schema-files <files...>` | Schemas resolvable via `$ref` |
| `-d, --test-data-files <files...>` | Data files to validate against the schema |
| `--valid` / `--invalid` | Exit 1 unless the data is valid / invalid |
| `--strict [mode]` | `true`/`false`/`log` |
| `--use-defaults [mode]` | Replace missing properties/items from `default` (`true`/`false`/`empty`) |
| `--coerce-types [mode]` | Change data types to match `type` (`true`/`false`/`array`) |
| `--all-errors [bool]` | Report all errors instead of stopping at the first (default `true`) |
| `--no-messages` | Exclude human-readable messages from errors |
| `--loop-enum <n>` | Max enum size compiled to an expression rather than a loop |

### `ajv transpile <input>`

Compile a schema to a standalone, dependency-free ESM validator module
(via AJV standalone + esbuild).

```bash
$ ajv transpile schema.json -o schema.js
```

Takes the same compilation options as `validate`, plus `-o, --output <file>`
(prints to stdout when omitted).

### `ajv deref <input>`

Dereference every `$ref` in a schema into a self-contained document.

```bash
$ ajv deref schema.json -r shared.schema.json -o schema.deref.json
$ ajv deref schema.json --offline   # never touch the network
```

`--offline` refuses remote `$ref` URLs while still resolving schemas seeded
with `-r` (matched by `$id`).

### `ajv sast <input>`

Audit a schema for security issues (DoS-prone patterns, SSRF-able `$ref`
hosts, deserialization vectors, …) using
[sast-json-schema](https://www.npmjs.com/package/sast-json-schema).

```bash
$ ajv sast schema.json --fail
$ ajv sast schema.json --lang js --ignore '/properties/id:maxLength'
```

| Option | Description |
| --- | --- |
| `-f, --fail` | Exit 1 when issues are found |
| `--ignore <rules...>` | Suppress findings by `instancePath` or `instancePath:keyword` |
| `--override-max-items <n>` / `--override-max-depth <n>` / `--override-max-properties <n>` | Relax the default limits |
| `--offline` | Skip DNS lookups for remote `$ref` URLs |
| `--dns-timeout-ms <n>` / `--dns-concurrency <n>` | Tune SSRF resolution |
| `--lang <lang>` | Target language for deserialization-vector checks (default: union of all) |
| `-o, --output <file>` | Write the JSON issues report to a file |

### `ajv ftl <input>`

Transpile a [Fluent](https://projectfluent.org) (`.ftl`) localization file to
an ESM module for use with custom `errorMessage` keywords.

```bash
$ ajv ftl messages.ftl --locale en-CA en -o messages.js
```

## Library API

Every command is also exposed as a typed ESM module (TypeScript declarations
included):

```js
import { compile, deref, transpile, validate } from "ajv-cmd";

const { valid, errors } = await validate(schema, { testData: [data] });
const js = await transpile(schema, { coerceTypes: "array" });
const bundled = await deref(schema, { offline: true, schemas: [shared] });
```

`validate()` returns `{ valid, errors }` — `valid` is `true`/`false` for data
validation and `undefined` when the schema itself failed to compile; it never
prints. The SAST analyzer uses top-level await, so it lives on its own subpath
rather than the main barrel:

```js
import { analyze } from "ajv-cmd/sast";

const issues = await analyze(schema, { lang: "js" });
```

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
