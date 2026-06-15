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

test("instance should support allErrors false (skips ajv-errors)", () => {
	// ajv-errors throws at registration when allErrors is false, so opting out
	// of allErrors must skip the plugin rather than crash instance creation.
	const ajv = instance({ allErrors: false });
	ok(typeof ajv.compile === "function");
});

test("compile with allErrors false stops at the first error", () => {
	const schema = {
		type: "object",
		properties: {
			name: { type: "string" },
			age: { type: "integer" },
		},
	};
	const validate = compile(schema, { allErrors: false });
	strictEqual(validate({ name: 1, age: "x" }), false);
	strictEqual(validate.errors.length, 1);
});

test("compile supports the errorMessage keyword by default", () => {
	// ajv-errors must be registered whenever allErrors is on (the default),
	// otherwise `errorMessage` is an unknown keyword under strict mode and the
	// custom message is never produced.
	const schema = {
		type: "object",
		properties: { name: { type: "string", errorMessage: "custom message" } },
	};
	const validate = compile(schema, { strict: true });
	strictEqual(validate({ name: 1 }), false);
	ok(validate.errors.some((e) => e.message === "custom message"));
});

test("compile should honor caller-supplied keywords", () => {
	// Without honoring `keywords`, strict mode throws "unknown keyword".
	const validate = compile(
		{ type: "object", properties: { a: { type: "string", myKeyword: true } } },
		{ keywords: [{ keyword: "myKeyword", validate: () => true }] },
	);
	strictEqual(typeof validate, "function");
});

test("compile default export should be compile function", async () => {
	const mod = await import("./compile.js");
	strictEqual(mod.default, mod.compile);
});
