// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { strictEqual } from "node:assert";
import test from "node:test";
import { loadRefSchemas } from "./_utils.js";

test("loadRefSchemas returns undefined when paths is undefined", async () => {
	strictEqual(await loadRefSchemas(undefined), undefined);
});

test("loadRefSchemas returns undefined when paths is empty", async () => {
	strictEqual(await loadRefSchemas([]), undefined);
});
