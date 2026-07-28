// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { deepStrictEqual, ok, rejects, strictEqual, throws } from "node:assert";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	expandInputs,
	loadRefSchemas,
	mirrorOutput,
	readJson,
} from "./_utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

test("loadRefSchemas returns undefined when paths is undefined", async () => {
	strictEqual(await loadRefSchemas(undefined), undefined);
});

test("loadRefSchemas returns undefined when paths is empty", async () => {
	strictEqual(await loadRefSchemas([]), undefined);
});

test("readJson includes the file path when parsing fails", async () => {
	// hello.ftl is not valid JSON, so JSON.parse throws.
	await rejects(() => readJson(fixture("hello.ftl")), {
		message: /Failed to parse JSON in .*hello\.ftl/,
	});
});

test("expandInputs passes literal paths through untouched", async () => {
	const input = fixture("simple.schema.json");
	deepStrictEqual(await expandInputs([input]), [input]);
});

test("expandInputs expands a glob pattern", async () => {
	const matched = await expandInputs([fixture("ref-*.schema.json")]);
	strictEqual(matched.length, 3);
	ok(matched.every((f) => f.includes("ref-")));
});

test("expandInputs throws when a pattern matches nothing", async () => {
	// A silent empty result would let CI pass having validated no files at all.
	await rejects(() => expandInputs([fixture("no-such-*.json")]), {
		message: /No files matched .*no-such-\*\.json/,
	});
});

test("expandInputs de-duplicates overlapping inputs", async () => {
	const one = fixture("simple.schema.json");
	const matched = await expandInputs([fixture("simple.*.json"), one]);
	strictEqual(
		matched.filter((f) => f.endsWith("simple.schema.json")).length,
		1,
	);
});

test("expandInputs prefers a real file over reading it as a pattern", async () => {
	// A filename containing glob metacharacters must not resolve to a different
	// file: glob("weird[1].json") would otherwise match "weird1.json".
	const dir = await mkdtemp(join(tmpdir(), "ajv-glob-"));
	try {
		const literal = join(dir, "weird[1].json");
		await writeFile(literal, "{}");
		await writeFile(join(dir, "weird1.json"), "{}");
		deepStrictEqual(await expandInputs([literal]), [literal]);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("mirrorOutput writes beside the input with the given suffix", () => {
	strictEqual(
		mirrorOutput(join("dir", "foo.schema.json"), ".js"),
		join("dir", "foo.schema.js"),
	);
	strictEqual(
		mirrorOutput(join("dir", "foo.schema.json"), ".deref.json"),
		join("dir", "foo.schema.deref.json"),
	);
});

test("mirrorOutput refuses to overwrite the input it read", () => {
	// `ajv transpile foo.js` mirrors back onto foo.js — that would destroy the
	// source rather than emit a bundle.
	throws(() => mirrorOutput("foo.js", ".js"), {
		message: /Refusing to overwrite foo\.js/,
	});
});
