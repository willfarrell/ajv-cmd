import { deepStrictEqual, match, ok, strictEqual } from "node:assert";
import test from "node:test";
import validate from "./validate.js";

const simpleSchema = {
	type: "object",
	properties: { name: { type: "string" } },
	required: ["name"],
};

test("validate should return valid true for a valid schema with no test data", async () => {
	const { valid, errors } = await validate(simpleSchema);
	strictEqual(valid, true);
	deepStrictEqual(errors, []);
});

test("validate should return valid true when test data is valid", async () => {
	const { valid, errors } = await validate(simpleSchema, {
		testData: [{ name: "Alice" }],
	});
	strictEqual(valid, true);
	deepStrictEqual(errors, []);
});

test("validate should return valid false with errors when test data is invalid", async () => {
	const { valid, errors } = await validate(simpleSchema, {
		testData: [{ name: 123 }],
	});
	strictEqual(valid, false);
	strictEqual(errors.length, 1);
	strictEqual(errors[0].instancePath, "/name");
	strictEqual(errors[0].message, "must be string");
});

test("validate should return valid undefined with the error when schema fails to compile", async () => {
	const badSchema = { type: "invalid_type_that_does_not_exist" };
	const { valid, errors } = await validate(badSchema, { strict: true });
	strictEqual(valid, undefined);
	strictEqual(errors.length, 1);
	ok(errors[0] instanceof Error);
	match(errors[0].message, /schema is invalid/);
});

test("validate should aggregate errors across test data items", async () => {
	const { valid, errors } = await validate(simpleSchema, {
		testData: [{ name: "Valid" }, { name: 123 }, {}],
	});
	strictEqual(valid, false);
	// One type error from the second item, one required error from the third —
	// failures must accumulate, not overwrite each other.
	strictEqual(errors.length, 2);
	strictEqual(errors[0].keyword, "type");
	strictEqual(errors[1].keyword, "required");
});

test("validate should not write to the console (library API)", async (t) => {
	const mockError = t.mock.method(console, "error", () => {});
	const mockLog = t.mock.method(console, "log", () => {});
	await validate(simpleSchema, { testData: [{ name: 123 }] });
	await validate({ type: "invalid_type_that_does_not_exist" });
	strictEqual(mockError.mock.calls.length, 0);
	strictEqual(mockLog.mock.calls.length, 0);
});

test("validate should not mutate test data", async () => {
	const schema = {
		type: "object",
		properties: { value: {} },
	};
	const testData = [{ value: "v" }];
	const original = structuredClone(testData);
	await validate(schema, { testData });
	deepStrictEqual(testData, original);
});

test("validate should not throw on non-cloneable test data", async () => {
	const schema = { type: "object", properties: { value: {} } };
	// A function is not structuredClone-able; validate() must fall back instead
	// of throwing DataCloneError.
	const { valid } = await validate(schema, {
		testData: [{ value: () => {} }],
	});
	// The data is valid, so the fallback must hand the original value to the
	// validator and return valid true. If safeClone's catch were a no-op it
	// would validate undefined instead, which fails the schema — so this asserts
	// the fallback returns the data, not merely that it didn't throw.
	strictEqual(valid, true);
});

test("validate should tolerate null options", async () => {
	// A caller passing an explicit null bypasses the `options = {}` parameter
	// default, so the testData access must be optional-chained.
	const { valid, errors } = await validate(simpleSchema, null);
	strictEqual(valid, true);
	deepStrictEqual(errors, []);
});

test("validate default export should be validate function", async () => {
	const mod = await import("./validate.js");
	strictEqual(mod.default, mod.validate);
});
