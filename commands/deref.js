// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { writeFile } from "node:fs/promises";
import deref from "../deref.js";
import { assertFile, loadRefSchemas, readJson } from "./_utils.js";

export default async (input, options = {}) => {
	await assertFile(input);

	// Work on a copy so we never mutate the caller-supplied options object.
	options = { ...options };

	const jsonSchema = await readJson(input);

	// loadRefSchemas(undefined) returns undefined, so no guard is needed.
	options.schemas = await loadRefSchemas(options.refSchemaFiles);

	const json = await deref(jsonSchema, options);

	if (typeof options.output === "string") {
		await writeFile(options.output, JSON.stringify(json, null, 2));
	} else if (options.output === true) {
		return json;
	} else {
		console.log(JSON.stringify(json, null, 2));
	}
};
