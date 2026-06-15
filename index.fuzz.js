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
			let valid;
			try {
				valid = fn(data);
			} catch (e) {
				catchError(data, e);
				return;
			}
			// Invariant check OUTSIDE the try: a failure here is a real bug and
			// must not be swallowed by catchError's allowlist.
			if (typeof valid !== "boolean") {
				throw new Error(`Expected boolean, got ${typeof valid}`);
			}
		}),
		{
			numRuns: 1_000,
			verbose: 2,
			examples: [],
		},
	);
});

test("fuzz validate.test w/ random test data", async () => {
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
				let result;
				try {
					result = await validate(schema, { testData });
				} catch (e) {
					catchError(testData, e);
					return;
				}
				if (typeof result?.valid !== "boolean") {
					throw new Error(
						`Expected boolean valid, got ${typeof result?.valid}`,
					);
				}
				if (!Array.isArray(result.errors)) {
					throw new Error(`Expected errors array, got ${typeof result.errors}`);
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
				let valid;
				try {
					const fn = sast();
					valid = fn(schema);
				} catch (e) {
					catchError(schema, e);
					return;
				}
				if (typeof valid !== "boolean") {
					throw new Error(`Expected boolean, got ${typeof valid}`);
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
				let ajv;
				try {
					ajv = instance(options);
				} catch (e) {
					catchError(options, e);
					return;
				}
				if (typeof ajv.compile !== "function") {
					throw new Error("Expected ajv instance");
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
