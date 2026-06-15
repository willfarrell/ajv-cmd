// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { rejects, strictEqual } from "node:assert";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadRefSchemas, readJson } from "./_utils.js";

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
