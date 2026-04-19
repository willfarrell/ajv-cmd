// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { writeFile } from "node:fs/promises";
import deref from "../deref.js";
import { assertFile, loadRefSchemas, readJson } from "./_utils.js";

export default async (input, options) => {
	await assertFile(input);

	const jsonSchema = await readJson(input);

	if (options?.refSchemaFiles) {
		options.schemas = await loadRefSchemas(options.refSchemaFiles);
	}

	const json = await deref(jsonSchema, options);

	if (typeof options.output === "string") {
		await writeFile(options.output, JSON.stringify(json), "utf8");
	} else if (options.output === true) {
		return json;
	} else {
		console.log(JSON.stringify(json));
	}
};
