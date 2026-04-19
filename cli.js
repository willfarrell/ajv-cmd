#!/usr/bin/env -S node --disable-warning=DEP0040
// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
// --disable-warning=DEP0040 suppresses: [DEP0040] DeprecationWarning: The `punycode` module is deprecated.

import { createRequire } from "node:module";
import { Command, Option } from "commander";
import deref from "./commands/deref.js";
import ftl from "./commands/ftl.js";
import sast from "./commands/sast.js";
import transpile from "./commands/transpile.js";
import validate from "./commands/validate.js";

const { version } = createRequire(import.meta.url)("./package.json");

const program = new Command()
	.name("ajv")
	.version(version)
	.description(
		"Validate, transpile, dereference, and audit JSON-Schema files using AJV",
	);

program
	.command("validate", { isDefault: true })
	.argument("<input>", "Path to the JSON-Schema file to validate")
	.addOption(new Option("--valid", "When not valid throw exit(1)").preset(true))
	.addOption(
		new Option("--invalid", "When not invalid throw exit(1)").preset(true),
	)
	.addOption(
		new Option(
			"-r, --ref-schema-files <refSchemaFiles...>",
			"The schema in <input> can reference any of these schemas with $ref keyword.",
		),
	)
	.addOption(new Option("--strict [strict]", "true/false/log").preset(true))
	.addOption(
		new Option("--all-errors", "collect all validation errors").preset(true),
	)
	.addOption(
		new Option(
			"--use-defaults [useDefaults]",
			"replace missing properties/items with the values from default keyword",
		).preset(true),
	)
	.addOption(
		new Option(
			"--coerce-types [coerceTypes]",
			"change type of data to match type keyword",
		).preset(true),
	)
	.addOption(
		new Option("--messages", "do not include text messages in errors").preset(
			true,
		),
	)
	.addOption(
		new Option(
			"--loop-enum <loopEnum>",
			"max size of enum to compile to expression (rather than to loop)",
		),
	)
	.addOption(
		new Option(
			"-d, --test-data-files <testDataFiles...>",
			"The data files to validate against.",
		),
	)
	.action(validate);

program
	.command("transpile")
	.argument("<input>", "Path to the JSON-Schema file to transpile")
	// Docs: https://ajv.js.org/packages/ajv-cli.html
	.addOption(
		new Option(
			"-r, --ref-schema-files <refSchemaFiles...>",
			"The schema in <input> can reference any of these schemas with $ref keyword.",
		),
	)
	.addOption(new Option("--strict [strict]", "true/false/log").preset(true))
	.addOption(
		new Option("--all-errors", "collect all validation errors").preset(true),
	)
	.addOption(
		new Option(
			"--use-defaults [useDefaults]",
			"replace missing properties/items with the values from default keyword",
		).preset(true),
	)
	.addOption(
		new Option(
			"--coerce-types [coerceTypes]",
			"change type of data to match type keyword",
		).preset(true),
	)
	.addOption(
		new Option("--messages", "do not include text messages in errors").preset(
			true,
		),
	)
	.addOption(
		new Option(
			"--loop-enum <loopEnum>",
			"max size of enum to compile to expression (rather than to loop)",
		),
	)
	.addOption(
		new Option(
			"-o, --output <output>",
			"Path to store the resulting JavaScript file. Will be in ESM.",
		),
	)
	.action(transpile);

program
	.command("deref")
	.argument("<input>", "Path to the JSON-Schema file to deref relative $ref")
	.addOption(
		new Option(
			"-r, --ref-schema-files <refSchemaFiles...>",
			"The schema in <input> can reference any of these schemas with $ref keyword.",
		),
	)
	.addOption(
		new Option(
			"-o, --output <output>",
			"Path to store the resulting JSON-Schema file.",
		),
	)
	.action(deref);

program
	.command("sast")
	.argument("<input>", "Path to the JSON-Schema file to audit for security")
	.addOption(
		new Option("--all-errors", "collect all validation errors").preset(true),
	)
	.addOption(
		new Option(
			"-r, --ref-schema-files <refSchemaFiles...>",
			"The schema in <input> can reference any of these schemas with $ref keyword.",
		),
	)
	.addOption(
		new Option("-f, --fail", "When issues found throw exit(1)").preset(true),
	)
	.addOption(
		new Option(
			"--override-max-items <overrideMaxItems>",
			"Override the max items limit (default 1024). Removes maxItems errors when the array size is within this limit. Values <= 1024 are a no-op.",
		),
	)
	.addOption(
		new Option(
			"--override-max-depth <overrideMaxDepth>",
			"Override the max schema depth limit (default 32).",
		),
	)
	.addOption(
		new Option(
			"--override-max-properties <overrideMaxProperties>",
			"Override the max properties limit (default 1024). Removes maxProperties errors when the property count is within this limit. Values <= 1024 are a no-op.",
		),
	)
	.addOption(
		new Option(
			"--ignore <ignore...>",
			"Suppress errors by `instancePath` or `instancePath:keyword` (exact match).",
		),
	)
	.addOption(
		new Option(
			"--offline",
			"Skip DNS lookups for remote $ref URLs (disables SSRF resolution).",
		).preset(true),
	)
	.addOption(
		new Option(
			"--dns-timeout-ms <dnsTimeoutMs>",
			"Per-hostname DNS lookup timeout in ms for SSRF checks (default 5000).",
		),
	)
	.addOption(
		new Option(
			"--dns-concurrency <dnsConcurrency>",
			"Max concurrent DNS lookups for SSRF checks (default 10).",
		),
	)
	.addOption(
		new Option(
			"-o, --output <output>",
			"Path to store the resulting JSON issues file.",
		),
	)
	.action(sast);

program
	.command("ftl")
	.argument("<input>", "Path to the Fluent file to transpile")
	.requiredOption(
		"--locale <locale...>",
		"What locale(s) to be used. Multiple can be set to allow for fallback. i.e. en-CA",
	)
	.addOption(
		new Option(
			"-o, --output <output>",
			"Path to store the resulting JavaScript file. Will be in ESM.",
		),
	)
	.action(ftl);

program.parse();
