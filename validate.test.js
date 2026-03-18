import { deepStrictEqual, strictEqual } from "node:assert";
import test from "node:test";
import validate from "./validate.js";

const simpleSchema = {
	type: "object",
	properties: { name: { type: "string" } },
	required: ["name"],
};

test("validate should return true for a valid schema with no test data", async () => {
	const result = await validate(simpleSchema);
	strictEqual(result, true);
});

test("validate should return true when test data is valid", async () => {
	const result = await validate(simpleSchema, {
		testData: [{ name: "Alice" }],
	});
	strictEqual(result, true);
});

test("validate should return false when test data is invalid", async (t) => {
	t.mock.method(console, "error", () => {});
	const result = await validate(simpleSchema, {
		testData: [{ name: 123 }],
	});
	strictEqual(result, false);
});

test("validate should return undefined when schema fails to compile", async (t) => {
	t.mock.method(console, "error", () => {});
	const badSchema = { type: "invalid_type_that_does_not_exist" };
	const result = await validate(badSchema, { strict: true });
	strictEqual(result, undefined);
});

test("validate should return false when any test data item is invalid", async (t) => {
	t.mock.method(console, "error", () => {});
	const result = await validate(simpleSchema, {
		testData: [{ name: "Valid" }, { name: 123 }],
	});
	strictEqual(result, false);
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

test("validate default export should be test function", async () => {
	const mod = await import("./validate.js");
	strictEqual(mod.default, mod.test);
});
