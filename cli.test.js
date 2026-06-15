import { doesNotMatch, match, ok, strictEqual, throws } from "node:assert";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { program, reportError } from "./cli.js";

const execFileAsync = promisify(execFile);
const cli = resolve(import.meta.dirname, "cli.js");
const fixture = (name) => resolve(import.meta.dirname, "__test__", name);

const run = (...args) =>
	execFileAsync("node", [cli, ...args], { cwd: import.meta.dirname });

test("cli validate (default) with --valid and valid schema", async () => {
	const { stdout } = await run(fixture("simple.schema.json"), "--valid");
	match(stdout, /is valid/);
});

test("cli validate coerces --strict false to a boolean (does not enforce)", async () => {
	// A schema with an unknown keyword fails to compile under strict mode; with
	// `--strict false` coerced to a real boolean, it compiles and is valid.
	const { stdout } = await run(
		fixture("unknown-keyword.schema.json"),
		"--strict",
		"false",
	);
	match(stdout, /is valid/);
});

test("cli validate coerces --strict true to a boolean (enforces)", async () => {
	// Coerced to boolean true, strict mode rejects the unknown keyword at compile
	// time, so the schema fails to compile and the command exits non-zero. (As a
	// raw string "true" it would merely warn — proving the coercion took effect.)
	try {
		await run(fixture("unknown-keyword.schema.json"), "--strict", "true");
		throw new Error("Expected process to exit with non-zero code");
	} catch (e) {
		strictEqual(e.code, 1);
		match(e.stderr, /schema failed to compile|unknown keyword/);
	}
});

test("cli validate of an uncompilable schema exits 1 even with no flag", async () => {
	try {
		await run(fixture("uncompilable.schema.json"));
		throw new Error("Expected process to exit with non-zero code");
	} catch (e) {
		strictEqual(e.code, 1);
		match(e.stderr, /schema failed to compile/);
	}
});

test("cli validate accepts numeric --loop-enum", async () => {
	const { stdout } = await run(
		fixture("simple.schema.json"),
		"--valid",
		"--loop-enum",
		"5",
	);
	match(stdout, /is valid/);
});

test("cli validate rejects non-numeric --loop-enum", async () => {
	try {
		await run(fixture("simple.schema.json"), "--loop-enum", "abc");
		throw new Error("Expected process to exit with non-zero code");
	} catch (e) {
		ok(e.code !== 0);
	}
});

test("cli validate passes through string option modes unchanged (--strict log)", async () => {
	// parseBoolish coerces "true"/"false" to booleans but must pass recognized
	// string modes ("log", "array", "empty") straight through to AJV.
	const { stdout } = await run(
		fixture("unknown-keyword.schema.json"),
		"--strict",
		"log",
	);
	// strict:"log" warns rather than throwing, so the schema still compiles.
	match(stdout, /is valid/);
});

test("cli validate accepts --no-messages", async () => {
	const { stdout } = await run(
		fixture("simple.schema.json"),
		"--valid",
		"--no-messages",
	);
	match(stdout, /is valid/);
});

test("cli validate with test data and --valid", async () => {
	const { stdout } = await run(
		fixture("simple.schema.json"),
		"-d",
		fixture("simple.data.json"),
		"--valid",
	);
	match(stdout, /is valid/);
});

test("cli validate with invalid data and --invalid", async () => {
	const { stdout } = await run(
		fixture("simple.schema.json"),
		"-d",
		fixture("invalid.data.json"),
		"--invalid",
	);
	match(stdout, /is invalid/);
});

test("cli validate reports every error by default (allErrors)", async () => {
	// invalid.data.json violates both `name` (string) and `age` (integer).
	const { stderr } = await run(
		fixture("simple.schema.json"),
		"-d",
		fixture("invalid.data.json"),
	);
	match(stderr, /must be string/);
	match(stderr, /must be integer/);
});

test("cli validate --all-errors false stops at the first error", async () => {
	const { stderr } = await run(
		fixture("simple.schema.json"),
		"-d",
		fixture("invalid.data.json"),
		"--all-errors",
		"false",
	);
	match(stderr, /must be string/);
	doesNotMatch(stderr, /must be integer/);
});

test("cli validate accepts the documented README invocation", async () => {
	// The README's bundle example passes exactly these flags; they must all be
	// recognized options.
	const { stdout } = await run(
		fixture("simple.schema.json"),
		"--valid",
		"--strict",
		"true",
		"--coerce-types",
		"array",
		"--all-errors",
		"true",
		"--use-defaults",
		"empty",
	);
	match(stdout, /is valid/);
});

test("cli transpile command emits an ESM validator", async () => {
	const { stdout } = await run("transpile", fixture("simple.schema.json"));
	match(stdout, /export/);
});

test("cli transpile accepts --all-errors false", async () => {
	const { stdout } = await run(
		"transpile",
		fixture("simple.schema.json"),
		"--all-errors",
		"false",
	);
	match(stdout, /export/);
});

test("cli deref command emits dereferenced JSON", async () => {
	const { stdout } = await run("deref", fixture("simple.schema.json"));
	const parsed = JSON.parse(stdout);
	ok(parsed.properties.name);
});

test("cli sast command with secure schema reports no issues", async () => {
	const { stdout } = await run("sast", fixture("secure.schema.json"));
	match(stdout, /has no issues/);
});

test("cli sast command coerces numeric --override-max-items", async () => {
	// With the string "2000" (uncoerced) the override comparison fails and the
	// large enum is still reported; coerced to a number it clears the finding.
	const { stdout } = await run(
		"sast",
		fixture("large-enum.schema.json"),
		"--override-max-items",
		"2000",
	);
	match(stdout, /has no issues/);
});

test("cli sast command with insecure schema and --fail should exit 1", async () => {
	try {
		await run("sast", fixture("insecure.schema.json"), "--fail");
		throw new Error("Expected process to exit with code 1");
	} catch (e) {
		strictEqual(e.code, 1);
	}
});

test("cli ftl command emits an ESM module", async () => {
	const { stdout } = await run("ftl", fixture("hello.ftl"), "--locale", "en");
	match(stdout, /export/);
});

test("cli missing input file errors cleanly without a stack trace", async () => {
	try {
		await run(fixture("nonexistent.json"), "--valid");
		throw new Error("Expected process to exit with non-zero code");
	} catch (e) {
		strictEqual(e.code, 1);
		// Clean message, not a raw unhandled-rejection stack trace.
		doesNotMatch(e.stderr, /\n\s+at /);
		doesNotMatch(e.stderr, /node:internal/);
	}
});

test("cli --help should print usage", async () => {
	const { stdout } = await run("--help");
	match(stdout, /Usage/);
});

// ---------------------------------------------------------------------------
// In-process tests of the commander wiring. The subprocess tests above can't be
// attributed to cli.js by per-test coverage analysis (a child process has its
// own instrumentation), so these import the program directly and assert the
// flags, descriptions, presets and arg parsers that define the CLI surface.
// ---------------------------------------------------------------------------

const REF_DESC =
	"The schema in <input> can reference any of these schemas with $ref keyword.";
const OUTPUT_JS_DESC =
	"Path to store the resulting JavaScript file. Will be in ESM.";

const EXPECTED = {
	name: "ajv",
	description:
		"Validate, transpile, dereference, and audit JSON-Schema files using AJV",
	commands: {
		validate: {
			isDefault: true,
			arg: { name: "input", desc: "Path to the JSON-Schema file to validate" },
			options: [
				{
					flags: "--valid",
					desc: "When not valid throw exit(1)",
					preset: true,
				},
				{
					flags: "--invalid",
					desc: "When not invalid throw exit(1)",
					preset: true,
				},
				{ flags: "-r, --ref-schema-files <refSchemaFiles...>", desc: REF_DESC },
				{ flags: "--strict [strict]", desc: "true/false/log", preset: true },
				{
					flags: "--use-defaults [useDefaults]",
					desc: "replace missing properties/items with the values from default keyword",
					preset: true,
				},
				{
					flags: "--coerce-types [coerceTypes]",
					desc: "change type of data to match type keyword",
					preset: true,
				},
				{
					flags: "--all-errors [allErrors]",
					desc: "report all errors instead of stopping at the first (true/false, default true)",
					preset: true,
				},
				{
					flags: "--no-messages",
					desc: "exclude human-readable text messages from errors",
				},
				{
					flags: "--loop-enum <loopEnum>",
					desc: "max size of enum to compile to expression (rather than to loop)",
				},
				{
					flags: "-d, --test-data-files <testDataFiles...>",
					desc: "The data files to validate against.",
				},
			],
		},
		transpile: {
			arg: {
				name: "input",
				desc: "Path to the JSON-Schema file to transpile",
			},
			options: [
				{ flags: "-r, --ref-schema-files <refSchemaFiles...>", desc: REF_DESC },
				{ flags: "--strict [strict]", desc: "true/false/log", preset: true },
				{
					flags: "--use-defaults [useDefaults]",
					desc: "replace missing properties/items with the values from default keyword",
					preset: true,
				},
				{
					flags: "--coerce-types [coerceTypes]",
					desc: "change type of data to match type keyword",
					preset: true,
				},
				{
					flags: "--all-errors [allErrors]",
					desc: "report all errors instead of stopping at the first (true/false, default true)",
					preset: true,
				},
				{
					flags: "--no-messages",
					desc: "exclude human-readable text messages from errors",
				},
				{
					flags: "--loop-enum <loopEnum>",
					desc: "max size of enum to compile to expression (rather than to loop)",
				},
				{ flags: "-o, --output <output>", desc: OUTPUT_JS_DESC },
			],
		},
		deref: {
			arg: {
				name: "input",
				desc: "Path to the JSON-Schema file to deref relative $ref",
			},
			options: [
				{ flags: "-r, --ref-schema-files <refSchemaFiles...>", desc: REF_DESC },
				{
					flags: "--offline",
					desc: "Do not fetch remote $ref URLs over the network (resolve local/-r schemas only).",
					preset: true,
				},
				{
					flags: "-o, --output <output>",
					desc: "Path to store the resulting JSON-Schema file.",
				},
			],
		},
		sast: {
			arg: {
				name: "input",
				desc: "Path to the JSON-Schema file to audit for security",
			},
			options: [
				{ flags: "-r, --ref-schema-files <refSchemaFiles...>", desc: REF_DESC },
				{
					flags: "-f, --fail",
					desc: "When issues found throw exit(1)",
					preset: true,
				},
				{
					flags: "--override-max-items <overrideMaxItems>",
					desc: "Override the max items limit (default 1024). Removes maxItems errors when the array size is within this limit. Values <= 1024 are a no-op.",
				},
				{
					flags: "--override-max-depth <overrideMaxDepth>",
					desc: "Override the max schema depth limit (default 32).",
				},
				{
					flags: "--override-max-properties <overrideMaxProperties>",
					desc: "Override the max properties limit (default 1024). Removes maxProperties errors when the property count is within this limit. Values <= 1024 are a no-op.",
				},
				{
					flags: "--ignore <ignore...>",
					desc: "Suppress errors by `instancePath` or `instancePath:keyword` (exact match).",
				},
				{
					flags: "--offline",
					desc: "Skip DNS lookups for remote $ref URLs (disables SSRF resolution).",
					preset: true,
				},
				{
					flags: "--dns-timeout-ms <dnsTimeoutMs>",
					desc: "Per-hostname DNS lookup timeout in ms for SSRF checks (default 5000).",
				},
				{
					flags: "--dns-concurrency <dnsConcurrency>",
					desc: "Max concurrent DNS lookups for SSRF checks (default 10).",
				},
				{
					flags: "--lang <lang>",
					desc: 'Target language for deserialization-vector checks. One of: js, py, rb, rs, java, kotlin, clojure, cs, vb, fsharp, php, objc, swift, ex, lua, default. (default: "default" — union of all languages)',
					defaultValue: "default",
				},
				{
					flags: "-o, --output <output>",
					desc: "Path to store the resulting JSON issues file.",
				},
			],
		},
		ftl: {
			arg: { name: "input", desc: "Path to the Fluent file to transpile" },
			options: [
				{
					flags: "--locale <locale...>",
					desc: "What locale(s) to be used. Multiple can be set to allow for fallback. i.e. en-CA",
					mandatory: true,
				},
				{ flags: "-o, --output <output>", desc: OUTPUT_JS_DESC },
			],
		},
	},
};

test("cli program name and description are wired", () => {
	strictEqual(program.name(), EXPECTED.name);
	strictEqual(program.description(), EXPECTED.description);
});

test("cli registers exactly the expected commands", () => {
	strictEqual(
		program.commands.map((c) => c.name()).join(","),
		Object.keys(EXPECTED.commands).join(","),
	);
});

test("cli validate is the default command", () => {
	strictEqual(program._defaultCommandName, "validate");
});

for (const [name, spec] of Object.entries(EXPECTED.commands)) {
	test(`cli ${name} command argument and options are wired`, () => {
		const cmd = program.commands.find((c) => c.name() === name);
		ok(cmd, `command ${name} should exist`);

		// <input> argument name + description
		const arg = cmd.registeredArguments[0];
		strictEqual(arg.name(), spec.arg.name);
		strictEqual(arg.description, spec.arg.desc);

		// every option's flags + description + preset/default/mandatory
		strictEqual(
			cmd.options.map((o) => o.flags).join("\n"),
			spec.options.map((o) => o.flags).join("\n"),
		);
		for (const expected of spec.options) {
			const opt = cmd.options.find((o) => o.flags === expected.flags);
			ok(opt, `${name} should have option ${expected.flags}`);
			strictEqual(opt.description, expected.desc);
			strictEqual(opt.presetArg, expected.preset ?? undefined);
			strictEqual(opt.defaultValue, expected.defaultValue ?? undefined);
			strictEqual(opt.mandatory, expected.mandatory ?? false);
		}
	});
}

// parseBoolish (wired on --strict) coerces boolean-ish strings but passes other
// recognized string modes straight through.
const boolishParser = () =>
	program.commands
		.find((c) => c.name() === "validate")
		.options.find((o) => o.flags === "--strict [strict]").parseArg;

test("cli --strict parser coerces 'true'/'false' and passes modes through", () => {
	const parse = boolishParser();
	strictEqual(parse("true"), true);
	strictEqual(parse("false"), false);
	strictEqual(parse("log"), "log");
});

// parseNumeric (wired on --loop-enum) coerces to a number or throws.
const numericParser = () =>
	program.commands
		.find((c) => c.name() === "validate")
		.options.find((o) => o.flags === "--loop-enum <loopEnum>").parseArg;

test("cli --loop-enum parser coerces numbers and rejects non-numbers", () => {
	const parse = numericParser();
	strictEqual(parse("5"), 5);
	strictEqual(parse("0"), 0);
	throws(() => parse("abc"), /Expected a number, received "abc"/);
});

test("cli reportError prints the message and exits 1", (t) => {
	const mockError = t.mock.method(console, "error", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	reportError(new Error("boom"));
	strictEqual(mockError.mock.calls.length, 1);
	strictEqual(mockError.mock.calls[0].arguments[0], "boom");
	strictEqual(mockExit.mock.calls.length, 1);
	strictEqual(mockExit.mock.calls[0].arguments[0], 1);
});
