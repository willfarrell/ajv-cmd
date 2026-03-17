import { ok, rejects, strictEqual } from "node:assert";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import validateCmd from "./validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

test("cmd validate should validate a valid schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await validateCmd(fixture("simple.schema.json"), {});
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("valid"));
});

test("cmd validate should validate with --valid and valid schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await validateCmd(fixture("simple.schema.json"), { valid: true });
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("valid, success"));
});

test("cmd validate should exit(1) with --invalid and valid schema", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	await validateCmd(fixture("simple.schema.json"), { invalid: true });
	strictEqual(mockExit.mock.calls.length, 1);
	strictEqual(mockExit.mock.calls[0].arguments[0], 1);
});

test("cmd validate should report invalid when test data fails", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const _mockError = t.mock.method(console, "error", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		testDataFiles: [fixture("invalid.data.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("invalid"));
});

test("cmd validate should exit(1) with --valid and invalid test data", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const _mockError = t.mock.method(console, "error", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		valid: true,
		testDataFiles: [fixture("invalid.data.json")],
	});
	strictEqual(mockExit.mock.calls.length, 1);
	strictEqual(mockExit.mock.calls[0].arguments[0], 1);
});

test("cmd validate should succeed with --invalid and invalid test data", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const _mockError = t.mock.method(console, "error", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		invalid: true,
		testDataFiles: [fixture("invalid.data.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("invalid, success"));
});

test("cmd validate should load ref schema files", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		refSchemaFiles: [fixture("ref-main.schema.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
});

test("cmd validate should validate with test data files", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		testDataFiles: [fixture("simple.data.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("valid, success"));
});

test("cmd validate should throw for non-existent file", async () => {
	await rejects(() => validateCmd(fixture("nonexistent.json"), {}), {
		code: "ENOENT",
	});
});

test("cmd validate should throw for directory path", async () => {
	await rejects(() => validateCmd(resolve(__dirname), {}), {
		message: /is not a file/,
	});
});
