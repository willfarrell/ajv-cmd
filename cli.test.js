import { match, ok, strictEqual } from "node:assert";
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
	ok(stdout.includes("valid"));
});

test("cli validate with test data and --valid", async () => {
	const { stdout } = await run(
		fixture("simple.schema.json"),
		"-d",
		fixture("simple.data.json"),
		"--valid",
	);
	ok(stdout.includes("valid"));
});

test("cli validate with invalid data and --invalid", async () => {
	const { stdout } = await run(
		fixture("simple.schema.json"),
		"-d",
		fixture("invalid.data.json"),
		"--invalid",
	);
	ok(stdout.includes("invalid"));
});

test("cli transpile command", async () => {
	const { stdout } = await run("transpile", fixture("simple.schema.json"));
	ok(stdout.length > 0);
});

test("cli deref command", async () => {
	const { stdout } = await run("deref", fixture("simple.schema.json"));
	ok(stdout.length > 0);
});

test("cli sast command with secure schema", async () => {
	const { stdout } = await run("sast", fixture("secure.schema.json"));
	ok(stdout.length > 0);
});

test("cli sast command with insecure schema and --fail should exit 1", async () => {
	try {
		await run("sast", fixture("insecure.schema.json"), "--fail");
		throw new Error("Expected process to exit with code 1");
	} catch (e) {
		strictEqual(e.code, 1);
	}
});

test("cli ftl command", async () => {
	const { stdout } = await run("ftl", fixture("hello.ftl"), "--locale", "en");
	ok(stdout.length > 0);
});

test("cli missing input file should error", async () => {
	try {
		await run(fixture("nonexistent.json"), "--valid");
		throw new Error("Expected process to exit with non-zero code");
	} catch (e) {
		ok(e.code !== 0);
	}
});

test("cli --help should print usage", async () => {
	const { stdout } = await run("--help");
	match(stdout, /Usage/);
});
