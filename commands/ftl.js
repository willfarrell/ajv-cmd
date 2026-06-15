// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile } from "node:fs/promises";
import transpile from "../ftl.js";
import { assertFile } from "./_utils.js";

export default async (input, options = {}) => {
	await assertFile(input);

	// Work on a copy so we never mutate the caller-supplied options object.
	options = { ...options };

	const ftl = await readFile(input, { encoding: "utf8" });

	const js = transpile(ftl, options);
	if (typeof options.output === "string") {
		await writeFile(options.output, js);
	} else if (options.output === true) {
		return js;
	} else {
		console.log(js);
	}
};
