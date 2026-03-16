import test from "node:test";
import fc from "fast-check";
import { compile, instance } from "./compile.js";
import sast from "./sast.js";
import validate from "./validate.js";

const catchError = (input, e) => {
	const expectedErrors = [
		"strict mode",
		"schema is invalid",
		"already registered",
		"not equal",
		"must be",
		"unknown format",
		"no schema with key",
		"can't resolve",
		"is required",
		"Expected",
		"Unexpected",
		"keyword",
		"duplicate",
	];
	for (const expected of expectedErrors) {
		if (e.message?.includes(expected)) {
			return;
		}
	}
	console.error(input, e);
	throw e;
};

test("fuzz compile w/ random schemas", async () => {
	await fc.assert(
		fc.asyncProperty(
			fc.record({
				type: fc.constantFrom(
					"object",
					"array",
					"string",
					"number",
					"integer",
					"boolean",
					"null",
				),
			}),
			async (schema) => {
				try {
					compile(schema);
				} catch (e) {
					catchError(schema, e);
				}
			},
		),
		{
			numRuns: 1_000,
			verbose: 2,
			examples: [],
		},
	);
});

test("fuzz validate w/ random data against schema", async () => {
	const schema = {
		type: "object",
		properties: {
			name: { type: "string" },
			count: { type: "integer" },
		},
	};
	const fn = compile(schema, { allErrors: true });

	await fc.assert(
		fc.asyncProperty(fc.anything(), async (data) => {
			try {
				const valid = fn(data);
				if (typeof valid !== "boolean") {
					throw new Error(`Expected boolean, got ${typeof valid}`);
				}
			} catch (e) {
				catchError(data, e);
			}
		}),
		{
			numRuns: 1_000,
			verbose: 2,
			examples: [],
		},
	);
});

test("fuzz validate.test w/ random test data", async (t) => {
	t.mock.method(console, "error", () => {});
	const schema = {
		type: "object",
		properties: {
			value: { type: "string" },
		},
		required: ["value"],
	};

	await fc.assert(
		fc.asyncProperty(
			fc.array(fc.anything(), { minLength: 0, maxLength: 5 }),
			async (testData) => {
				try {
					const result = await validate(schema, { testData });
					if (typeof result !== "boolean") {
						throw new Error(`Expected boolean, got ${typeof result}`);
					}
				} catch (e) {
					catchError(testData, e);
				}
			},
		),
		{
			numRuns: 1_000,
			verbose: 2,
			examples: [],
		},
	);
});

test("fuzz sast w/ random schemas", async () => {
	await fc.assert(
		fc.asyncProperty(
			fc.record({
				type: fc.constantFrom(
					"object",
					"array",
					"string",
					"number",
					"integer",
					"boolean",
					"null",
				),
				properties: fc.option(
					fc.dictionary(
						fc.string({ minLength: 1, maxLength: 20 }),
						fc.record({
							type: fc.constantFrom(
								"string",
								"number",
								"integer",
								"boolean",
								"null",
							),
						}),
					),
					{ nil: undefined },
				),
			}),
			async (schema) => {
				try {
					const fn = sast();
					const valid = fn(schema);
					if (typeof valid !== "boolean") {
						throw new Error(`Expected boolean, got ${typeof valid}`);
					}
				} catch (e) {
					catchError(schema, e);
				}
			},
		),
		{
			numRuns: 1_000,
			verbose: 2,
			examples: [],
		},
	);
});

test("fuzz instance w/ random options", async () => {
	await fc.assert(
		fc.asyncProperty(
			fc.record({
				allErrors: fc.option(fc.boolean(), { nil: undefined }),
				strict: fc.option(fc.constantFrom(true, false, "log"), {
					nil: undefined,
				}),
				coerceTypes: fc.option(fc.constantFrom(true, false, "array"), {
					nil: undefined,
				}),
			}),
			async (options) => {
				try {
					const ajv = instance(options);
					if (typeof ajv.compile !== "function") {
						throw new Error("Expected ajv instance");
					}
				} catch (e) {
					catchError(options, e);
				}
			},
		),
		{
			numRuns: 1_000,
			verbose: 2,
			examples: [],
		},
	);
});
