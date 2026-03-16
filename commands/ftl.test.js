import { ok, rejects, strictEqual } from "node:assert";
import { readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ftlCmd from "./ftl.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

test("cmd ftl should transpile ftl to stdout", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const result = await ftlCmd(fixture("hello.ftl"), { locale: ["en"] });
	strictEqual(mockLog.mock.calls.length, 1);
	ok(typeof result === "string");
});

test("cmd ftl should write output to file", async () => {
	const outputPath = fixture("_ftl_output.js");
	try {
		const result = await ftlCmd(fixture("hello.ftl"), {
			locale: ["en"],
			output: outputPath,
		});
		const content = await readFile(outputPath, "utf8");
		ok(content.length > 0);
		ok(typeof result === "string");
	} finally {
		await unlink(outputPath).catch(() => {});
	}
});

test("cmd ftl should throw for non-existent file", async () => {
	await rejects(() => ftlCmd(fixture("nonexistent.ftl"), { locale: ["en"] }), {
		code: "ENOENT",
	});
});

test("cmd ftl should throw for directory path", async () => {
	await rejects(() => ftlCmd(resolve(__dirname), { locale: ["en"] }), {
		message: /is not a file/,
	});
});
