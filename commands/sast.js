// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { writeFile } from "node:fs/promises";
import { analyze } from "../sast.js";
import { assertFile, loadRefSchemas, readJson } from "./_utils.js";

export default async (input, options = {}) => {
	await assertFile(input);

	// Work on a copy so we never mutate the caller-supplied options object.
	options = { ...options };

	const jsonSchema = await readJson(input);

	// loadRefSchemas(undefined) returns undefined, so no guard is needed.
	options.schemas = await loadRefSchemas(options.refSchemaFiles);
	if (options.schemas) {
		const safeHostnames = new Set();
		for (const schema of options.schemas) {
			try {
				// new URL() throws for a missing, relative, or non-string $id — those
				// schemas simply contribute no safe hostname.
				safeHostnames.add(new URL(schema.$id).hostname);
			} catch {}
		}
		options.safeHostnames = safeHostnames;
	}

	const errors = await analyze(jsonSchema, options);

	if (errors.length) {
		if (typeof options.output === "string") {
			await writeFile(options.output, JSON.stringify(errors, null, 2));
		} else if (options.output === true) {
			return errors;
		} else {
			console.log(input, "has issues", JSON.stringify(errors, null, 2));
		}
		if (options.fail) {
			process.exit(1);
		}
	} else {
		console.log(input, "has no issues");
	}
};
