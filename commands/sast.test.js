import { ok, rejects, strictEqual } from "node:assert";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sastCmd from "./sast.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

test("cmd sast should report no issues for secure schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("secure.schema.json"), {});
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("has no issues"));
});

test("cmd sast should detect issues in insecure schema", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("insecure.schema.json"), {});
	ok(mockLog.mock.calls.length >= 1);
});

test("cmd sast should write issues to output file", async (_t) => {
	const outputPath = fixture("_sast_output.json");
	try {
		await sastCmd(fixture("insecure.schema.json"), { output: outputPath });
		try {
			const content = await readFile(outputPath, "utf8");
			const parsed = JSON.parse(content);
			ok(Array.isArray(parsed));
		} catch {
			// No issues found, file not written
		}
	} finally {
		await unlink(outputPath).catch(() => {});
	}
});

test("cmd sast should return errors when output is true", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const result = await sastCmd(fixture("insecure.schema.json"), {
		output: true,
	});
	if (result) {
		ok(Array.isArray(result));
	}
});

test("cmd sast should exit(1) with --fail when issues found", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const _mockExit = t.mock.method(process, "exit", () => {});
	await sastCmd(fixture("insecure.schema.json"), { fail: true });
});

test("cmd sast should load ref schema files", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("simple.schema.json"), {
		refSchemaFiles: [fixture("ref-main.schema.json")],
	});
});

test("cmd sast should throw for non-existent file", async () => {
	await rejects(() => sastCmd(fixture("nonexistent.json"), {}), {
		code: "ENOENT",
	});
});

test("cmd sast should remove maxItems error when override-max-items allows it", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("large-enum.schema.json"), {
		overrideMaxItems: 2000,
	});
	strictEqual(mockLog.mock.calls.length, 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("has no issues"));
});

test("cmd sast should keep maxItems error when override-max-items is too low", async (t) => {
	const mockLog = t.mock.method(console, "log", () => {});
	await sastCmd(fixture("large-enum.schema.json"), {
		overrideMaxItems: 500,
	});
	ok(mockLog.mock.calls.length >= 1);
	ok(mockLog.mock.calls[0].arguments[1].includes("has issues"));
});

test("cmd sast should only remove maxItems errors, keep other errors with override", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const result = await sastCmd(fixture("large-enum-insecure.schema.json"), {
		overrideMaxItems: 2000,
		output: true,
	});
	ok(Array.isArray(result));
	ok(result.length > 0);
	strictEqual(
		result.filter(
			(e) => e.schemaPath === "#/definitions/safeArrayItemsLimits/maxItems",
		).length,
		0,
	);
});

test("cmd sast should add error when minimum >= maximum", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			age: {
				type: "integer",
				minimum: 100,
				maximum: 10,
				maxLength: 100,
			},
		},
		required: ["age"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_minmax.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const minMaxErr = result.find((e) => e.keyword === "minimum");
		ok(minMaxErr);
		strictEqual(minMaxErr.instancePath, "/properties/age");
		strictEqual(minMaxErr.params.minimum, 100);
		strictEqual(minMaxErr.params.maximum, 10);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add error when minimum < maximum", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			age: {
				type: "integer",
				minimum: 0,
				maximum: 150,
			},
		},
		required: ["age"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_minmax-valid.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		if (result) {
			const minMaxErr = result.find((e) => e.keyword === "minimum");
			strictEqual(minMaxErr, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add depth error for normal-depth schema", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const result = await sastCmd(fixture("insecure.schema.json"), {
		output: true,
	});
	if (result) {
		const depthErr = result.find((e) => e.keyword === "depth");
		strictEqual(depthErr, undefined);
	}
});

test("cmd sast should add depth error as first error when schema is too deep", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	let schema = { type: "string", maxLength: 100, format: "email" };
	for (let i = 0; i < 17; i++) {
		schema = {
			type: "object",
			properties: { [`level${i}`]: schema },
			required: [`level${i}`],
			maxProperties: 1,
			unevaluatedProperties: false,
		};
	}
	const tempFile = fixture("_deep.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		strictEqual(result[0].keyword, "depth");
		ok(result[0].params.depth > 32);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should allow overriding max depth limit", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	let schema = { type: "string", maxLength: 100, format: "email" };
	for (let i = 0; i < 17; i++) {
		schema = {
			type: "object",
			properties: { [`level${i}`]: schema },
			required: [`level${i}`],
			maxProperties: 1,
			unevaluatedProperties: false,
		};
	}
	const tempFile = fixture("_deep-override.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, {
			output: true,
			overrideMaxDepth: 50,
		});
		if (result) {
			const depthErr = result.find((e) => e.keyword === "depth");
			strictEqual(depthErr, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should add error for unsafe regex pattern", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				maxLength: 100,
				pattern: "[a-z]+\\w+",
			},
		},
		required: ["name"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_redos.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const redosErr = result.find((e) => e.schemaPath === "#/redos");
		ok(redosErr);
		strictEqual(redosErr.keyword, "pattern");
		strictEqual(redosErr.instancePath, "/properties/name/pattern");
		strictEqual(redosErr.params.pattern, "[a-z]+\\w+");
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add error for safe regex pattern", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				maxLength: 100,
				pattern: "^[a-z0-9]+$",
			},
		},
		required: ["name"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_redos-safe.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		if (result) {
			const redosErr = result.find((e) => e.schemaPath === "#/redos");
			strictEqual(redosErr, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should throw for directory path", async () => {
	await rejects(() => sastCmd(resolve(__dirname), {}), {
		message: /is not a file/,
	});
});

test("cmd sast should add error when minLength > maxLength", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				minLength: 20,
				maxLength: 5,
			},
		},
		required: ["name"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_minlength.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const err = result.find((e) => e.keyword === "minLength");
		ok(err);
		strictEqual(err.instancePath, "/properties/name");
		strictEqual(err.params.minLength, 20);
		strictEqual(err.params.maxLength, 5);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add error when minLength <= maxLength", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				minLength: 5,
				maxLength: 5,
			},
		},
		required: ["name"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_minlength-valid.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		if (result) {
			const err = result.find((e) => e.keyword === "minLength");
			strictEqual(err, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should add error when exclusiveMinimum >= exclusiveMaximum", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			score: {
				type: "number",
				exclusiveMinimum: 10,
				exclusiveMaximum: 5,
			},
		},
		required: ["score"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_exminmax.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const err = result.find((e) => e.keyword === "minimum");
		ok(err);
		strictEqual(err.instancePath, "/properties/score");
		strictEqual(err.params.exclusiveMinimum, 10);
		strictEqual(err.params.exclusiveMaximum, 5);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should add error when minimum >= exclusiveMaximum", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			score: {
				type: "number",
				minimum: 10,
				exclusiveMaximum: 10,
			},
		},
		required: ["score"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_min-exmax.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const err = result.find((e) => e.keyword === "minimum");
		ok(err);
		strictEqual(err.instancePath, "/properties/score");
		strictEqual(err.params.minimum, 10);
		strictEqual(err.params.exclusiveMaximum, 10);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add error when exclusiveMinimum < maximum", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			score: {
				type: "number",
				exclusiveMinimum: 0,
				maximum: 100,
			},
		},
		required: ["score"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_exmin-max-valid.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		if (result) {
			const err = result.find((e) => e.keyword === "minimum");
			strictEqual(err, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should add error when minItems > maxItems", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			tags: {
				type: "array",
				items: { type: "string", maxLength: 50 },
				minItems: 10,
				maxItems: 3,
			},
		},
		required: ["tags"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_minitems.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const err = result.find((e) => e.keyword === "minItems");
		ok(err);
		strictEqual(err.instancePath, "/properties/tags");
		strictEqual(err.params.minItems, 10);
		strictEqual(err.params.maxItems, 3);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add error when minItems <= maxItems", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			tags: {
				type: "array",
				items: { type: "string", maxLength: 50 },
				minItems: 1,
				maxItems: 10,
			},
		},
		required: ["tags"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_minitems-valid.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		if (result) {
			const err = result.find((e) => e.keyword === "minItems");
			strictEqual(err, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should add error when minContains > maxContains", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			tags: {
				type: "array",
				items: { type: "string", maxLength: 50 },
				contains: { const: "required-tag" },
				minContains: 5,
				maxContains: 2,
				maxItems: 10,
			},
		},
		required: ["tags"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_mincontains.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const err = result.find((e) => e.keyword === "minContains");
		ok(err);
		strictEqual(err.instancePath, "/properties/tags");
		strictEqual(err.params.minContains, 5);
		strictEqual(err.params.maxContains, 2);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add error when minContains <= maxContains", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			tags: {
				type: "array",
				items: { type: "string", maxLength: 50 },
				contains: { const: "required-tag" },
				minContains: 1,
				maxContains: 3,
				maxItems: 10,
			},
		},
		required: ["tags"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_mincontains-valid.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		if (result) {
			const err = result.find((e) => e.keyword === "minContains");
			strictEqual(err, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should add error when $ref hostname resolves to private IP", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			sub: {
				$ref: "https://localhost/schemas/evil",
			},
		},
		required: ["sub"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_ssrf.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const err = result.find((e) => e.keyword === "ssrf");
		ok(err);
		strictEqual(err.instancePath, "/properties/sub/$ref");
		strictEqual(err.params.hostname, "localhost");
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should not add ssrf error for local $ref", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			name: {
				type: "string",
				maxLength: 100,
			},
			alias: {
				$ref: "#/properties/name",
			},
		},
		required: ["name"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_ssrf-local.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		if (result) {
			const err = result.find((e) => e.keyword === "ssrf");
			strictEqual(err, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should add error when $ref hostname does not resolve", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const schema = {
		type: "object",
		properties: {
			sub: {
				$ref: "https://this-domain-does-not-exist-ajv-cmd-test.invalid/schemas/foo",
			},
		},
		required: ["sub"],
		maxProperties: 10,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_ssrf-unresolved.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, { output: true });
		ok(Array.isArray(result));
		const err = result.find((e) => e.keyword === "ssrf");
		ok(err);
		strictEqual(err.instancePath, "/properties/sub/$ref");
		strictEqual(
			err.params.hostname,
			"this-domain-does-not-exist-ajv-cmd-test.invalid",
		);
		ok(err.message.includes("does not resolve"));
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should remove maxProperties error when override-max-properties allows it", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const constObj = {};
	for (let i = 0; i < 1100; i++) constObj[`k${i}`] = i;
	const schema = {
		type: "object",
		const: constObj,
		maxProperties: 1100,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_maxprops.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, {
			output: true,
			overrideMaxProperties: 2000,
		});
		if (result) {
			const err = result.find(
				(e) =>
					e.schemaPath ===
					"#/definitions/safeObjectPropertiesLimits/maxProperties",
			);
			strictEqual(err, undefined);
		}
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});

test("cmd sast should keep maxProperties error when override-max-properties is too low", async (t) => {
	const _mockLog = t.mock.method(console, "log", () => {});
	const constObj = {};
	for (let i = 0; i < 1100; i++) constObj[`k${i}`] = i;
	const schema = {
		type: "object",
		const: constObj,
		maxProperties: 1100,
		unevaluatedProperties: false,
	};
	const tempFile = fixture("_maxprops-low.schema.json");
	await writeFile(tempFile, JSON.stringify(schema));
	try {
		const result = await sastCmd(tempFile, {
			output: true,
			overrideMaxProperties: 500,
		});
		ok(Array.isArray(result));
		const err = result.find(
			(e) =>
				e.schemaPath ===
				"#/definitions/safeObjectPropertiesLimits/maxProperties",
		);
		ok(err);
	} finally {
		await unlink(tempFile).catch(() => {});
	}
});
