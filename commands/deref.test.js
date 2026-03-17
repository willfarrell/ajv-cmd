import { ok, rejects, strictEqual } from "node:assert";
import { readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import derefCmd from "./deref.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

test("cmd deref should deref schema to stdout", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await derefCmd(fixture("ref-main.schema.json"), {});
	strictEqual(mockLog.mock.calls.length, 1);
	const output = mockLog.mock.calls[0].arguments[0];
	ok(typeof output === "string");
	const parsed = JSON.parse(output);
	ok(parsed.properties.sub);
});

test("cmd deref should write output to file", async () => {
	const outputPath = fixture("_deref_output.json");
	try {
		await derefCmd(fixture("ref-main.schema.json"), { output: outputPath });
		const content = await readFile(outputPath, "utf8");
		const parsed = JSON.parse(content);
		ok(parsed.properties.sub);
	} finally {
		await unlink(outputPath).catch(() => {});
	}
});

test("cmd deref should return json when output is true", async () => {
	const result = await derefCmd(fixture("ref-main.schema.json"), {
		output: true,
	});
	ok(result);
	ok(result.properties.sub);
});

test("cmd deref should load ref schema files with mockFetch", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await derefCmd(fixture("ref-external-main.schema.json"), {
		refSchemaFiles: [fixture("ref-external-part.schema.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
});

test("cmd deref should fall back to real fetch for uncached URLs", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await derefCmd(fixture("ref-external-main.schema.json"), {
		refSchemaFiles: [fixture("simple.schema.json")],
	});
	ok(mockLog.mock.calls.length >= 1);
});

test("cmd deref should throw for non-existent file", async () => {
	await rejects(() => derefCmd(fixture("nonexistent.json"), {}), {
		code: "ENOENT",
	});
});

test("cmd deref should throw for directory path", async () => {
	await rejects(() => derefCmd(resolve(__dirname), {}), {
		message: /is not a file/,
	});
});
