// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile } from "node:fs/promises";
import transpile from "../ftl.js";
import { assertFile } from "./_utils.js";

export default async (input, options) => {
	await assertFile(input);

	const ftl = await readFile(input, { encoding: "utf8" });

	const js = transpile(ftl, options);
	if (options.output) {
		await writeFile(options.output, js, "utf8");
	} else {
		console.log(js);
	}
	return js;
};
