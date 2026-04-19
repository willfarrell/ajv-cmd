// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { writeFile } from "node:fs/promises";
import transpile from "../transpile.js";
import { assertFile, loadRefSchemas, readJson } from "./_utils.js";

export default async (input, options) => {
	await assertFile(input);

	const jsonSchema = await readJson(input);

	if (options?.refSchemaFiles) {
		options.schemas = await loadRefSchemas(options.refSchemaFiles);
	}

	const js = await transpile(jsonSchema, options);
	if (options.output) {
		await writeFile(options.output, js, "utf8");
	} else {
		console.log(js);
	}
};
