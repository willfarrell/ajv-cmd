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
		properties: { body: { ...body, $id: "ajv-cmd:nested:/body" } },
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
				properties: {
					data: { type: "string", $id: "ajv-cmd:nested:/detail/data" },
				},
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

test("nested keeps internal $refs resolving against the schema itself", () => {
	const schema = {
		$defs: { age: { type: "number" } },
		type: "object",
		required: ["age"],
		properties: { age: { $ref: "#/$defs/age" } },
	};
	const result = nested("/body", schema);
	// The definitions stay where the author put them; the `$id` is what keeps
	// `#/$defs/age` pointing at them.
	deepStrictEqual(result.properties.body.$defs, { age: { type: "number" } });
	strictEqual(result.$defs, undefined);

	const validate = compile(result);
	strictEqual(validate({ body: { age: 42 } }), true);
	strictEqual(validate({ body: { age: "x" } }), false);
	strictEqual(validate.errors[0].instancePath, "/body/age");
	strictEqual(validate({}), false);
});

test("nested keeps draft-07 definitions resolving", () => {
	const schema = {
		definitions: { age: { type: "number" } },
		type: "object",
		properties: { age: { $ref: "#/definitions/age" } },
	};
	const validate = compile(nested("/body", schema));
	strictEqual(validate({ body: { age: 42 } }), true);
	strictEqual(validate({ body: { age: "x" } }), false);
});

test("nested keeps a self-recursive $ref pointing at the schema, not the wrapper", () => {
	// Without an `$id` on the nested schema, `#` would resolve to the wrapper, so
	// a recursive schema would demand the wrapper shape of every child: correct
	// data rejected, wrapper-shaped data accepted, with no error either way.
	const tree = {
		type: "object",
		required: ["name"],
		properties: {
			name: { type: "string" },
			children: { type: "array", items: { $ref: "#" } },
		},
	};
	const validate = compile(nested("/body", tree));
	strictEqual(
		validate({ body: { name: "a", children: [{ name: "b" }] } }),
		true,
	);
	strictEqual(
		validate({ body: { name: "a", children: [{ body: { name: "b" } }] } }),
		false,
	);
});

test("nested keeps $schema with the schema it belongs to", () => {
	const schema = {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: { age: { type: "number" } },
	};
	const result = nested("/body", schema);
	strictEqual(
		result.properties.body.$schema,
		"https://json-schema.org/draft/2020-12/schema",
	);
	strictEqual(result.$schema, undefined);
	strictEqual(compile(result)({ body: { age: 42 } }), true);
});

test("nested leaves a schema that already has an $id untouched", () => {
	const schema = {
		$id: "https://example.com/schemas/body",
		$defs: { age: { type: "number" } },
		type: "object",
		properties: { age: { $ref: "#/$defs/age" } },
	};
	const result = nested("/body", schema);
	deepStrictEqual(result.properties.body, schema);
	strictEqual(compile(result)({ body: { age: 42 } }), true);
});

test("nested wraps a boolean schema as-is", () => {
	// `true` and `false` are valid schemas. Spreading them would produce `{}`,
	// turning a reject-everything schema into an accept-everything one.
	deepStrictEqual(nested("/body", false), {
		type: "object",
		required: ["body"],
		properties: { body: false },
	});
	const rejectAll = compile(nested("/body", false));
	strictEqual(rejectAll({ body: 1 }), false);
	strictEqual(rejectAll({ body: {} }), false);
	strictEqual(compile(nested("/body", true))({ body: 1 }), true);
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
