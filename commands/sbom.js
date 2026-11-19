// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import sbom from "../sbom.js";
import { assertFile, CommandFailure, readJson } from "./_utils.js";

export default async (input) => {
	await assertFile(input);

	const { valid, errors } = await sbom(await readJson(input));

	if (!valid) {
		console.error(errors);
		console.log(input, "is invalid");
		throw new CommandFailure();
	}
	console.log(input, "is valid");
};
