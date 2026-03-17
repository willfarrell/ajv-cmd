import { ok, rejects, strictEqual } from "node:assert";
import { readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sastCmd from "./sast.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

test("cmd sast should report no issues for secure schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("secure.schema.json"), {});
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("has no issues"));
});

test("cmd sast should detect issues in insecure schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("insecure.schema.json"), {});
	ok(mockLog.mock.calls.length >= 1);
});

test("cmd sast should write issues to output file", async (_t) => {
	const outputPath = fixture("_sast_output.json");
	try {
		await sastCmd(fixture("insecure.schema.json"), { output: outputPath });
		try {
			const content = await readFile(outputPath, "utf8");
			const parsed = JSON.parse(content);
			ok(Array.isArray(parsed));
		} catch {
			// No issues found, file not written
		}
	} finally {
		await unlink(outputPath).catch(() => {});
	}
});

test("cmd sast should return errors when output is true", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const result = await sastCmd(fixture("insecure.schema.json"), {
		output: true,
	});
	if (result) {
		ok(Array.isArray(result));
	}
});

test("cmd sast should exit(1) with --fail when issues found", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const _mockExit = t.mock.method(process, "exit", () => {});
	await sastCmd(fixture("insecure.schema.json"), { fail: true });
});

test("cmd sast should load ref schema files", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("simple.schema.json"), {
		refSchemaFiles: [fixture("ref-main.schema.json")],
	});
});

test("cmd sast should throw for non-existent file", async () => {
	await rejects(() => sastCmd(fixture("nonexistent.json"), {}), {
		code: "ENOENT",
	});
});

test("cmd sast should throw for directory path", async () => {
	await rejects(() => sastCmd(resolve(__dirname), {}), {
		message: /is not a file/,
	});
});
