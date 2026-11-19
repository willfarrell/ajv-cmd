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

test("compile supports ajv-keywords keywords", () => {
	// Strict mode rejects `uniqueItemProperties` as unknown unless the
	// ajv-keywords plugin is registered.
	const validate = compile({
		type: "array",
		uniqueItemProperties: ["id"],
	});
	strictEqual(validate([{ id: 1 }, { id: 1 }]), false);
	strictEqual(validate([{ id: 1 }, { id: 2 }]), true);
});

test("compile uses the draft-07 dialect when $schema names draft-07", () => {
	// Draft-07 `dependencies` (removed in 2020-12) is enforced only by the
	// draft-07 class, and Ajv2020 rejects the draft-07 $schema outright.
	const validate = compile({
		$schema: "http://json-schema.org/draft-07/schema#",
		dependencies: { a: ["b"] },
	});
	strictEqual(validate({ a: 1 }), false);
	strictEqual(validate({ a: 1, b: 2 }), true);
});

test("compile keeps the 2020-12 dialect when $schema is absent", () => {
	// `prefixItems` is a 2020-12 keyword; the draft-07 class would reject it as
	// unknown under strict mode.
	const validate = compile({
		type: "array",
		prefixItems: [{ type: "string" }],
	});
	strictEqual(validate([1]), false);
});

test("instance keeps returning the 2020-12 dialect", () => {
	ok(instance().getSchema("https://json-schema.org/draft/2020-12/schema"));
});

test("compile default export should be compile function", async () => {
	const mod = await import("./compile.js");
	strictEqual(mod.default, mod.compile);
});
