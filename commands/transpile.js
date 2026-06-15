// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { writeFile } from "node:fs/promises";
import transpile from "../transpile.js";
import { assertFile, loadRefSchemas, readJson } from "./_utils.js";

export default async (input, options = {}) => {
	await assertFile(input);

	// Work on a copy so we never mutate the caller-supplied options object.
	options = { ...options };

	const jsonSchema = await readJson(input);

	// loadRefSchemas(undefined) returns undefined, so no guard is needed.
	options.schemas = await loadRefSchemas(options.refSchemaFiles);

	const js = await transpile(jsonSchema, options);
	if (typeof options.output === "string") {
		await writeFile(options.output, js);
	} else if (options.output === true) {
		return js;
	} else {
		console.log(js);
	}
};
