import { ok, strictEqual } from "node:assert";
import { randomBytes } from "node:crypto";
import { readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import transpile from "./transpile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const simpleSchema = {
	type: "object",
	properties: {
		name: { type: "string" },
	},
	required: ["name"],
};

test("transpile should return a JavaScript string", async () => {
	const js = await transpile(simpleSchema, { allErrors: true });
	ok(typeof js === "string");
	ok(js.length > 0);
});

test("transpile should produce valid ESM code", async () => {
	const js = await transpile(simpleSchema, { allErrors: true });
	ok(js.includes("export"));
});

test("transpile should accept custom options", async () => {
	const js = await transpile(simpleSchema, { allErrors: true, strict: false });
	ok(typeof js === "string");
	ok(js.length > 0);
});

test("transpile default export should be transpile function", async () => {
	const mod = await import("./transpile.js");
	strictEqual(mod.default, mod.transpile);
});

test("transpile handles concurrent draft2019 calls without racing on the bridge", async () => {
	// Previously all concurrent calls shared a fixed-name bridge file in the
	// package dir; one call's cleanup deleted it mid-build of another, failing
	// with "Could not resolve ./formats-draft2019-bridge.cjs".
	const schema = {
		type: "object",
		properties: {
			e: { type: "string", format: "idn-email" },
			h: { type: "string", format: "idn-hostname" },
		},
	};
	const results = await Promise.all(
		Array.from({ length: 16 }, () =>
			transpile(structuredClone(schema), { allErrors: true }),
		),
	);
	strictEqual(results.length, 16);
	for (const js of results) ok(js.includes("export"));
});

test("transpile does not write into the package directory", async () => {
	const before = new Set(await readdir(__dirname));
	await transpile({ type: "string", format: "iri" }, { allErrors: true });
	const after = await readdir(__dirname);
	for (const entry of after) {
		ok(before.has(entry), `unexpected file left in package dir: ${entry}`);
	}
});

// draft2019 format tests (https://github.com/willfarrell/ajv-cmd/issues/3)
const importTranspiled = async (js) => {
	const file = join(__dirname, `__test_${randomBytes(8).toString("hex")}.mjs`);
	await writeFile(file, js, "utf8");
	try {
		return await import(file);
	} finally {
		await unlink(file);
	}
};

test("transpile format:idn-email produces working validator", async () => {
	const js = await transpile(
		{ type: "string", format: "idn-email" },
		{ allErrors: true },
	);
	const mod = await importTranspiled(js);
	strictEqual(mod.default("user@example.com"), true);
	strictEqual(mod.default("not-an-email"), false);
});

test("transpile format:idn-hostname produces working validator", async () => {
	const js = await transpile(
		{ type: "string", format: "idn-hostname" },
		{ allErrors: true },
	);
	const mod = await importTranspiled(js);
	strictEqual(mod.default("example.com"), true);
	strictEqual(mod.default("-invalid-.com"), false);
});

test("transpile format:iri produces working validator", async () => {
	const js = await transpile(
		{ type: "string", format: "iri" },
		{ allErrors: true },
	);
	const mod = await importTranspiled(js);
	strictEqual(mod.default("https://example.com/path"), true);
	strictEqual(mod.default("not a uri"), false);
});

test("transpile format:iri-reference produces working validator", async () => {
	const js = await transpile(
		{ type: "string", format: "iri-reference" },
		{ allErrors: true },
	);
	const mod = await importTranspiled(js);
	strictEqual(mod.default("/path/to/resource"), true);
	strictEqual(mod.default("notascheme://invalid"), false);
});

test("transpile format:email still works (no regression)", async () => {
	const js = await transpile(
		{ type: "string", format: "email" },
		{ allErrors: true },
	);
	const mod = await importTranspiled(js);
	strictEqual(mod.default("user@example.com"), true);
	strictEqual(mod.default("not-an-email"), false);
});

// non-draft2019 format that emits fullFormats.X — exercises the
// "leave require() untouched" branch in fixDraft2019FormatRequires
test("transpile format:uri produces working validator", async () => {
	const js = await transpile(
		{ type: "string", format: "uri" },
		{ allErrors: true },
	);
	const mod = await importTranspiled(js);
	strictEqual(mod.default("https://example.com/path"), true);
	strictEqual(mod.default("not a uri"), false);
});

// non-draft2019 format that emits fullFormats["X"] (bracket form)
test("transpile format:date-time produces working validator", async () => {
	const js = await transpile(
		{ type: "string", format: "date-time" },
		{ allErrors: true },
	);
	const mod = await importTranspiled(js);
	strictEqual(mod.default("2026-04-25T10:00:00Z"), true);
	strictEqual(mod.default("not-a-date"), false);
});
