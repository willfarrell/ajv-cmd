import { ok, rejects, strictEqual } from "node:assert";
import { readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import transpileCmd from "./transpile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

test("cmd transpile should transpile schema to stdout", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await transpileCmd(fixture("simple.schema.json"), { allErrors: true });
	strictEqual(mockLog.mock.calls.length, 1);
	ok(typeof mockLog.mock.calls[0].arguments[0] === "string");
});

test("cmd transpile should write output to file", async () => {
	const outputPath = fixture("_transpile_output.js");
	try {
		await transpileCmd(fixture("simple.schema.json"), {
			output: outputPath,
			allErrors: true,
		});
		const content = await readFile(outputPath, "utf8");
		ok(content.includes("export"));
	} finally {
		await unlink(outputPath).catch(() => {});
	}
});

test("cmd transpile should load ref schema files", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await transpileCmd(fixture("simple.schema.json"), {
		refSchemaFiles: [fixture("ref-main.schema.json")],
		allErrors: true,
	});
	strictEqual(mockLog.mock.calls.length, 1);
});

test("cmd transpile should throw for non-existent file", async () => {
	await rejects(() => transpileCmd(fixture("nonexistent.json"), {}), {
		code: "ENOENT",
	});
});

test("cmd transpile should throw for directory path", async () => {
	await rejects(() => transpileCmd(resolve(__dirname), {}), {
		message: /is not a file/,
	});
});
