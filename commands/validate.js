// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import validate from "../validate.js";
import { assertFile, loadRefSchemas, readJson } from "./_utils.js";

export default async (input, options = {}) => {
	await assertFile(input);

	// Work on a copy so we never mutate the caller-supplied options object.
	options = { ...options };

	const jsonSchema = await readJson(input);

	if (options.refSchemaFiles) {
		options.schemas = await loadRefSchemas(options.refSchemaFiles);
	}

	if (options.testDataFiles) {
		options.testData = await loadRefSchemas(options.testDataFiles);
	}

	const valid = await validate(jsonSchema, options);

	// A schema that fails to compile is neither valid nor invalid data — it is a
	// hard error. Surface it and exit non-zero regardless of --valid/--invalid so
	// a broken schema can never pass silently in CI.
	if (valid === undefined) {
		console.error(input, "schema failed to compile");
		return process.exit(1);
	}

	if (valid) {
		if (options.invalid) {
			console.log(input, "is valid, failed");
			process.exit(1);
		} else {
			console.log(input, "is valid, success");
		}
	} else {
		if (options.valid) {
			console.log(input, "is invalid, failed");
			process.exit(1);
		} else {
			console.log(input, "is invalid, success");
		}
	}
};
