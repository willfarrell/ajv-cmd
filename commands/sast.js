// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { writeFile } from "node:fs/promises";
import { analyze } from "../sast.js";
import { assertFile, loadRefSchemas, readJson } from "./_utils.js";

export default async (input, options) => {
	await assertFile(input);

	const jsonSchema = await readJson(input);

	if (options?.refSchemaFiles) {
		options.schemas = await loadRefSchemas(options.refSchemaFiles);
	}

	const errors = await analyze(jsonSchema, options);

	if (errors.length) {
		if (typeof options.output === "string") {
			await writeFile(options.output, JSON.stringify(errors, null, 2), "utf8");
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
