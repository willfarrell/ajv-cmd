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
	// Pretty-printed (2-space indent), matching the sast command's output style.
	strictEqual(output, JSON.stringify(parsed, null, 2));
});

test("cmd deref should write output to file", async () => {
	const outputPath = fixture("_deref_output.json");
	try {
		await derefCmd(fixture("ref-main.schema.json"), { output: outputPath });
		const content = await readFile(outputPath, "utf8");
		const parsed = JSON.parse(content);
		ok(parsed.properties.sub);
		// Pretty-printed (2-space indent), matching the sast command's output style.
		strictEqual(content, JSON.stringify(parsed, null, 2));
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

test("cmd deref should resolve an external $ref from a -r schema (cached, no network)", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await derefCmd(fixture("ref-external-main.schema.json"), {
		refSchemaFiles: [fixture("ref-external-part.schema.json")],
	});
	strictEqual(mockLog.mock.calls.length, 1);
	// Assert the external $ref was actually inlined, not merely that something
	// was logged: the resolved part schema contributes a `value` string property.
	const parsed = JSON.parse(mockLog.mock.calls[0].arguments[0]);
	strictEqual(parsed.properties.part.properties.value.type, "string");
});

test("cmd deref should not mutate the caller options object", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const options = {
		refSchemaFiles: [fixture("ref-external-part.schema.json")],
	};
	await derefCmd(fixture("ref-external-main.schema.json"), options);
	strictEqual("schemas" in options, false);
});

test("cmd deref --offline still resolves a remote $ref seeded via -r (no network)", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	const fetchMock = t.mock.method(globalThis, "fetch", async () => {
		throw new Error("network call attempted while offline");
	});
	await derefCmd(fixture("ref-external-main.schema.json"), {
		offline: true,
		refSchemaFiles: [fixture("ref-external-part.schema.json")],
	});
	// Seeded schema resolved from the in-memory cache; the network was untouched.
	strictEqual(fetchMock.mock.calls.length, 0);
	const parsed = JSON.parse(mockLog.mock.calls[0].arguments[0]);
	strictEqual(parsed.properties.part.properties.value.type, "string");
});

test("cmd deref --offline does not fetch a remote $ref", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const fetchMock = t.mock.method(globalThis, "fetch", async () => {
		throw new Error("network call attempted while offline");
	});
	await rejects(() =>
		derefCmd(fixture("ref-external-main.schema.json"), { offline: true }),
	);
	// The HTTP resolver is disabled, so fetch must never be invoked.
	strictEqual(fetchMock.mock.calls.length, 0);
});

test("cmd deref should fall back to real fetch for uncached URLs", async (t) => {
	// simple.schema.json has no `$id`, so the cache is empty and the request for
	// the external `$ref` falls through to the underlying fetch. Mock that fetch
	// instead of hitting the network so the test is deterministic and offline.
	const partSchema = await readFile(
		fixture("ref-external-part.schema.json"),
		"utf8",
	);
	const fetchMock = t.mock.method(globalThis, "fetch", async () => ({
		status: 200,
		body: true,
		arrayBuffer: async () => new TextEncoder().encode(partSchema),
	}));
	t.mock.method(console, "log", () => {});
	await derefCmd(fixture("ref-external-main.schema.json"), {
		refSchemaFiles: [fixture("simple.schema.json")],
	});
	ok(fetchMock.mock.calls.length >= 1);
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
