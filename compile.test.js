import { ok, strictEqual } from "node:assert";
import test from "node:test";
import { compile, instance } from "./compile.js";

const simpleSchema = {
	type: "object",
	properties: { name: { type: "string" } },
};

test("instance should return an Ajv instance", () => {
	const ajv = instance({ allErrors: true });
	ok(ajv);
	ok(typeof ajv.compile === "function");
	ok(typeof ajv.validate === "function");
});

test("instance should accept custom options", () => {
	const ajv = instance({ allErrors: true, strict: false });
	ok(ajv);
});

test("compile should return a validate function", () => {
	const validate = compile(simpleSchema, { allErrors: true });
	ok(typeof validate === "function");
});

test("compile should validate data correctly", () => {
	const validate = compile(simpleSchema, { allErrors: true });
	strictEqual(validate({ name: "test" }), true);
});

test("compile should reject invalid data", () => {
	const schema = { ...simpleSchema, required: ["name"] };
	const validate = compile(schema, { allErrors: true });
	strictEqual(validate({}), false);
	ok(validate.errors.length > 0);
});

test("compile should accept custom options", () => {
	const validate = compile(simpleSchema, { allErrors: true, strict: false });
	ok(typeof validate === "function");
});

test("compile default export should be compile function", async () => {
	const mod = await import("./compile.js");
	strictEqual(mod.default, mod.compile);
});
