import { ok, strictEqual } from "node:assert";
import test from "node:test";
import transpile from "./transpile.js";

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
