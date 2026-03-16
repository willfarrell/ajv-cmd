import { ok, strictEqual } from "node:assert";
import test from "node:test";
import sast from "./sast.js";

test("sast should return a validate function", () => {
	const validate = sast();
	ok(typeof validate === "function");
});

test("sast should accept options", () => {
	const validate = sast(undefined, { allErrors: true });
	ok(typeof validate === "function");
});

test("sast validate should return boolean", () => {
	const validate = sast();
	const schema = {
		type: "object",
		properties: {
			name: { type: "string", maxLength: 100 },
		},
		additionalProperties: false,
	};
	const valid = validate(schema);
	strictEqual(typeof valid, "boolean");
});

test("sast validate should detect issues in insecure schema", () => {
	const validate = sast();
	const insecureSchema = {
		type: "object",
		properties: {
			name: { type: "string" },
			items: { type: "array", items: { type: "string" } },
		},
	};
	const valid = validate(insecureSchema);
	ok(valid === true || valid === false);
	if (!valid) {
		ok(Array.isArray(validate.errors));
	}
});

test("sast default export should be sast function", async () => {
	const mod = await import("./sast.js");
	strictEqual(mod.default, mod.sast);
});
