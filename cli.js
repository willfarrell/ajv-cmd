#!/usr/bin/env -S node --disable-warning=DEP0040
// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
// --disable-warning=DEP0040 suppresses: [DEP0040] DeprecationWarning: The `punycode` module is deprecated.

import { createRequire } from "node:module";
import { Command, Option } from "commander";

const { version } = createRequire(import.meta.url)("./package.json");

// Run one command over every input, loading its module only once the action
// actually fires. Statically importing all five made every invocation — `--help`
// included — pay for all of them, and commands/sast.js alone costs ~220ms at
// import time because sast-json-schema compiles five draft meta-schema
// validators at module load.
//
// `suffix` is the extension a batch writes beside each input; commands with no
// output file (validate) pass none.
const lazy = (specifier, suffix) => async (inputs, options) => {
	const { CommandFailure, expandInputs, mirrorOutput } = await import(
		"./commands/_utils.js"
	);
	const run = (await import(specifier)).default;
	const files = await expandInputs(inputs);
	const batch = files.length > 1;

	// One -o path cannot receive N outputs; a batch writes beside each input.
	if (batch && typeof options.output === "string") {
		throw new Error(
			`--output takes a single input, received ${files.length}; omit it to write beside each input`,
		);
	}

	let failed = false;
	for (const file of files) {
		try {
			await run(
				file,
				batch && suffix
					? { ...options, output: mirrorOutput(file, suffix) }
					: options,
			);
		} catch (error) {
			// A CommandFailure has already printed its own message; anything else
			// (missing file, bad JSON, unresolved $ref) still needs reporting. Either
			// way the run continues so one bad file cannot hide the rest.
			if (!(error instanceof CommandFailure)) {
				console.error(error.message);
			}
			failed = true;
		}
	}

	if (failed) {
		process.exit(1);
	}
};

const validate = lazy("./commands/validate.js");
const transpile = lazy("./commands/transpile.js", ".js");
const deref = lazy("./commands/deref.js", ".deref.json");
const sast = lazy("./commands/sast.js", ".sast.json");
const ftl = lazy("./commands/ftl.js", ".js");

// AJV options such as `strict` accept `true | false | "log"`. Commander passes
// option arguments through as strings, so coerce the boolean-ish values to real
// booleans while leaving recognized string modes (e.g. "log", "array", "empty")
// untouched.
const parseBoolish = (value) => {
	if (value === "true") return true;
	if (value === "false") return false;
	return value;
};

const parseNumeric = (value) => {
	const number = Number(value);
	if (Number.isNaN(number)) {
		throw new Error(`Expected a number, received "${value}"`);
	}
	return number;
};

const program = new Command()
	.name("ajv")
	.version(version)
	.description(
		"Validate, transpile, dereference, and audit JSON-Schema files using AJV",
	);

program
	.command("validate", { isDefault: true })
	.argument(
		"<input...>",
		"Paths or glob patterns of JSON-Schema files to validate",
	)
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
	.addOption(
		new Option("--strict [strict]", "true/false/log")
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--use-defaults [useDefaults]",
			"replace missing properties/items with the values from default keyword",
		)
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--coerce-types [coerceTypes]",
			"change type of data to match type keyword",
		)
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--all-errors [allErrors]",
			"report all errors instead of stopping at the first (true/false, default true)",
		)
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--no-messages",
			"exclude human-readable text messages from errors",
		),
	)
	.addOption(
		new Option(
			"--loop-enum <loopEnum>",
			"max size of enum to compile to expression (rather than to loop)",
		).argParser(parseNumeric),
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
	.argument(
		"<input...>",
		"Paths or glob patterns of JSON-Schema files to transpile",
	)
	// Docs: https://ajv.js.org/packages/ajv-cli.html
	.addOption(
		new Option(
			"-r, --ref-schema-files <refSchemaFiles...>",
			"The schema in <input> can reference any of these schemas with $ref keyword.",
		),
	)
	.addOption(
		new Option("--strict [strict]", "true/false/log")
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--use-defaults [useDefaults]",
			"replace missing properties/items with the values from default keyword",
		)
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--coerce-types [coerceTypes]",
			"change type of data to match type keyword",
		)
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--all-errors [allErrors]",
			"report all errors instead of stopping at the first (true/false, default true)",
		)
			.preset(true)
			.argParser(parseBoolish),
	)
	.addOption(
		new Option(
			"--no-messages",
			"exclude human-readable text messages from errors",
		),
	)
	.addOption(
		new Option(
			"--loop-enum <loopEnum>",
			"max size of enum to compile to expression (rather than to loop)",
		).argParser(parseNumeric),
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
	.argument(
		"<input...>",
		"Paths or glob patterns of JSON-Schema files to deref relative $ref",
	)
	.addOption(
		new Option(
			"-r, --ref-schema-files <refSchemaFiles...>",
			"The schema in <input> can reference any of these schemas with $ref keyword.",
		),
	)
	.addOption(
		new Option(
			"--offline",
			"Do not fetch remote $ref URLs over the network (resolve local/-r schemas only).",
		).preset(true),
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
	.argument(
		"<input...>",
		"Paths or glob patterns of JSON-Schema files to audit for security",
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
		).argParser(parseNumeric),
	)
	.addOption(
		new Option(
			"--override-max-depth <overrideMaxDepth>",
			"Override the max schema depth limit (default 32).",
		).argParser(parseNumeric),
	)
	.addOption(
		new Option(
			"--override-max-properties <overrideMaxProperties>",
			"Override the max properties limit (default 1024). Removes maxProperties errors when the property count is within this limit. Values <= 1024 are a no-op.",
		).argParser(parseNumeric),
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
		).argParser(parseNumeric),
	)
	.addOption(
		new Option(
			"--dns-concurrency <dnsConcurrency>",
			"Max concurrent DNS lookups for SSRF checks (default 10).",
		).argParser(parseNumeric),
	)
	.addOption(
		new Option(
			"--lang <lang>",
			'Target language for deserialization-vector checks. One of: js, py, rb, rs, java, kotlin, clojure, cs, vb, fsharp, php, objc, swift, ex, lua, default. (default: "default" — union of all languages)',
		).default("default"),
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
	.argument("<input...>", "Paths or glob patterns of Fluent files to transpile")
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

// Surface command errors (missing files, invalid JSON, unresolved $refs, …) as
// a clean message + non-zero exit instead of an unhandled-rejection stack trace.
const reportError = (error) => {
	console.error(error.message);
	process.exit(1);
};

export { program, reportError };

// Only auto-run when invoked as the CLI entry point — `import.meta.main` is true
// solely for the entry module, so importing cli.js in tests does not parse argv.
// The subprocess CLI tests execute this block end-to-end.
if (import.meta.main) {
	program.parseAsync().catch(reportError);
}
