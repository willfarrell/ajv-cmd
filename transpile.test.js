import { ok, strictEqual } from "node:assert";
import { randomBytes } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
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
