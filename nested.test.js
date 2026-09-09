// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import test from "node:test";
import { compile } from "./compile.js";
import nested from "./nested.js";

const body = {
	type: "object",
	required: ["age"],
	properties: { age: { type: "number" } },
};

test("nested wraps a schema in a required property", () => {
	deepStrictEqual(nested("/body", body), {
		type: "object",
		required: ["body"],
		properties: { body },
	});
});

test("nested wraps one level per pointer segment", () => {
	deepStrictEqual(nested("/detail/data", { type: "string" }), {
		type: "object",
		required: ["detail"],
		properties: {
			detail: {
				type: "object",
				required: ["data"],
				properties: { data: { type: "string" } },
			},
		},
	});
});

test("nested unescapes ~1 and ~0 in pointer segments", () => {
	deepStrictEqual(Object.keys(nested("/a~1b", { type: "string" }).properties), [
		"a/b",
	]);
	deepStrictEqual(Object.keys(nested("/a~0b", { type: "string" }).properties), [
		"a~b",
	]);
});

test("nested hoists $defs so internal $refs still resolve", () => {
	const schema = {
		$defs: { age: { type: "number" } },
		type: "object",
		required: ["age"],
		properties: { age: { $ref: "#/$defs/age" } },
	};
	const result = nested("/body", schema);
	deepStrictEqual(result.$defs, { age: { type: "number" } });
	strictEqual(result.properties.body.$defs, undefined);

	const validate = compile(result);
	strictEqual(validate({ body: { age: 42 } }), true);
	strictEqual(validate({ body: { age: "x" } }), false);
	strictEqual(validate.errors[0].instancePath, "/body/age");
	strictEqual(validate({}), false);
});

test("nested hoists draft-07 definitions", () => {
	const schema = {
		definitions: { age: { type: "number" } },
		type: "object",
		properties: { age: { $ref: "#/definitions/age" } },
	};
	const result = nested("/body", schema);
	deepStrictEqual(result.definitions, { age: { type: "number" } });
	strictEqual(result.properties.body.definitions, undefined);
	strictEqual(compile(result)({ body: { age: 42 } }), true);
});

test("nested hoists $schema", () => {
	const schema = {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: { age: { type: "number" } },
	};
	const result = nested("/body", schema);
	strictEqual(result.$schema, "https://json-schema.org/draft/2020-12/schema");
	strictEqual(result.properties.body.$schema, undefined);
});

test("nested leaves an $id schema untouched", () => {
	// An $id makes the schema its own base URI, so hoisting its $defs out would
	// break the very $refs the hoist exists to preserve.
	const schema = {
		$id: "https://example.com/schemas/body",
		$defs: { age: { type: "number" } },
		type: "object",
		properties: { age: { $ref: "#/$defs/age" } },
	};
	const result = nested("/body", schema);
	deepStrictEqual(result.properties.body, schema);
	strictEqual(result.$defs, undefined);
	strictEqual(compile(result)({ body: { age: 42 } }), true);
});

test("nested does not mutate the schema it is given", () => {
	const schema = {
		$defs: { age: { type: "number" } },
		type: "object",
		properties: { age: { $ref: "#/$defs/age" } },
	};
	const before = structuredClone(schema);
	nested("/body", schema);
	deepStrictEqual(schema, before);
});

test("nested rejects a pointer that is not a JSON Pointer to a property", () => {
	for (const pointer of ["body", "/", "", "#/body"]) {
		throws(() => nested(pointer, body), /JSON Pointer/);
	}
});
