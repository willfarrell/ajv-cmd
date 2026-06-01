import { doesNotMatch, match, ok, strictEqual } from "node:assert";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

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

test("cli transpile command emits an ESM validator", async () => {
	const { stdout } = await run("transpile", fixture("simple.schema.json"));
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
