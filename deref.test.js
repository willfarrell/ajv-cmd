// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { rejects, strictEqual } from "node:assert";
import test from "node:test";
import deref from "./deref.js";

const partSchema = {
	$id: "https://example.com/schemas/part",
	type: "object",
	properties: { value: { type: "string" } },
};
// Fresh each time — dereference() mutates the schema it is given in place.
const mainSchema = () => ({
	$id: "https://example.com/schemas/main",
	type: "object",
	properties: { part: { $ref: "https://example.com/schemas/part" } },
});

test("deref never touches globalThis.fetch, even mid-flight", async (t) => {
	// deref is a public library API; patching the global fetch — however briefly
	// — leaks the patch to unrelated code running concurrently in the process.
	// Seeded schemas must be served via a scoped resolver instead.
	const fetchMock = t.mock.method(globalThis, "fetch", async () => {
		throw new Error("network call attempted for a seeded schema");
	});
	const installed = globalThis.fetch;
	const pending = deref(mainSchema(), { schemas: [partSchema] });
	// Checked synchronously, before the first await inside deref resolves: the
	// global must already be untouched while the call is in flight.
	strictEqual(globalThis.fetch, installed);
	const result = await pending;
	strictEqual(globalThis.fetch, installed);
	strictEqual(fetchMock.mock.calls.length, 0);
	// The seeded $ref actually resolved from memory.
	strictEqual(result.properties.part.properties.value.type, "string");
});

test("deref concurrent calls each resolve their own seeded schemas", async (t) => {
	const fetchMock = t.mock.method(globalThis, "fetch", async () => {
		throw new Error("network call attempted for a seeded schema");
	});
	const otherPart = {
		$id: "https://example.com/schemas/other-part",
		type: "object",
		properties: { count: { type: "integer" } },
	};
	const otherMain = {
		$id: "https://example.com/schemas/other-main",
		type: "object",
		properties: { part: { $ref: "https://example.com/schemas/other-part" } },
	};
	const [a, b] = await Promise.all([
		deref(mainSchema(), { schemas: [partSchema] }),
		deref(otherMain, { schemas: [otherPart] }),
	]);
	strictEqual(a.properties.part.properties.value.type, "string");
	strictEqual(b.properties.part.properties.count.type, "integer");
	strictEqual(fetchMock.mock.calls.length, 0);
});

test("deref default export should be deref function", async () => {
	const mod = await import("./deref.js");
	strictEqual(mod.default, mod.deref);
});

test("deref --offline rejects an uncached remote $ref with a clear message", async () => {
	// Offline + an unseeded remote $ref must refuse the network with the explicit
	// "offline: refusing to fetch" message. Dies if that message string is blanked
	// or if the offlineGuard resolver stops claiming unseeded URLs.
	await rejects(
		() => deref(mainSchema(), { offline: true }),
		/offline: refusing to fetch remote \$ref/,
	);
});

test("deref --offline never arms ref-parser's HTTP abort timer", async () => {
	const activeTimers = () =>
		process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
	const before = activeTimers();
	// ref-parser's HTTP resolver arms a 60s abort timer per request that keeps
	// the event loop alive. Offline disables that resolver outright, so refusing
	// the uncached remote $ref must leave no net new Timeout resource — dies if
	// the `http: { canRead: false }` override is dropped.
	await rejects(() => deref(mainSchema(), { offline: true }), /offline/);
	strictEqual(activeTimers(), before);
});
