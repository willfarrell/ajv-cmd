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
	strictEqual(mockLog.mock.calls[0].arguments[1], "is valid");
});

test("cmd validate should validate with --valid and valid schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await validateCmd(fixture("simple.schema.json"), { valid: true });
	strictEqual(mockLog.mock.calls.length, 1);
	strictEqual(mockLog.mock.calls[0].arguments[1], "is valid");
});

test("cmd validate should exit(1) with --invalid and valid schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	await validateCmd(fixture("simple.schema.json"), { invalid: true });
	strictEqual(mockExit.mock.calls.length, 1);
	strictEqual(mockExit.mock.calls[0].arguments[0], 1);
	strictEqual(mockLog.mock.calls[0].arguments[1], "is valid, expected invalid");
});

test("cmd validate should report invalid when test data fails", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const mockError = t.mock.method(console, "error", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		testDataFiles: [fixture("invalid.data.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
	strictEqual(mockLog.mock.calls[0].arguments[1], "is invalid");
	// Printing validation errors is the command's job now that the library
	// returns them instead of logging.
	strictEqual(mockError.mock.calls.length, 1);
	const printed = mockError.mock.calls[0].arguments[0];
	ok(Array.isArray(printed));
	strictEqual(printed[0].instancePath, "/name");
});

test("cmd validate should exit(1) with --valid and invalid test data", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const _mockError = t.mock.method(console, "error", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		valid: true,
		testDataFiles: [fixture("invalid.data.json")],
	});
	strictEqual(mockExit.mock.calls.length, 1);
	strictEqual(mockExit.mock.calls[0].arguments[0], 1);
	strictEqual(mockLog.mock.calls[0].arguments[1], "is invalid, expected valid");
});

test("cmd validate should succeed with --invalid and invalid test data", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const _mockError = t.mock.method(console, "error", () => {});
	await validateCmd(fixture("simple.schema.json"), {
		invalid: true,
		testDataFiles: [fixture("invalid.data.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
	strictEqual(mockLog.mock.calls[0].arguments[1], "is invalid");
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
	strictEqual(mockLog.mock.calls[0].arguments[1], "is valid");
});

test("cmd validate should exit(1) for an uncompilable schema regardless of flags", async (t) => {
	const mockError = t.mock.method(console, "error", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	await validateCmd(fixture("uncompilable.schema.json"), {});
	strictEqual(mockExit.mock.calls.length, 1);
	strictEqual(mockExit.mock.calls[0].arguments[0], 1);
	ok(
		mockError.mock.calls.some(
			(c) => c.arguments[1] === "schema failed to compile",
		),
	);
	// The compile error itself must surface too, not just the summary line.
	ok(
		mockError.mock.calls.some(
			(c) =>
				typeof c.arguments[0] === "string" &&
				/schema is invalid/.test(c.arguments[0]),
		),
	);
});

test("cmd validate uses -r ref schemas to resolve an external $ref", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	// ref-external-main $refs https://example.com/schemas/part, which only
	// resolves when the part schema is loaded via refSchemaFiles. Skip that load
	// and the schema fails to compile and the command exits 1 — so this dies if
	// the `if (options.refSchemaFiles)` block is dropped.
	await validateCmd(fixture("ref-external-main.schema.json"), {
		valid: true,
		refSchemaFiles: [fixture("ref-external-part.schema.json")],
	});
	strictEqual(mockExit.mock.calls.length, 0);
	strictEqual(mockLog.mock.calls[0].arguments[1], "is valid");
});

test("cmd validate should exit(1) for an uncompilable schema even with --invalid", async (t) => {
	const _mockError = t.mock.method(console, "error", () => {});
	const mockExit = t.mock.method(process, "exit", () => {});
	await validateCmd(fixture("uncompilable.schema.json"), { invalid: true });
	strictEqual(mockExit.mock.calls.length, 1);
	strictEqual(mockExit.mock.calls[0].arguments[0], 1);
});

test("cmd validate should not mutate the caller options object", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const options = { refSchemaFiles: [fixture("ref-main.schema.json")] };
	await validateCmd(fixture("simple.schema.json"), options);
	strictEqual("schemas" in options, false);
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
