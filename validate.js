// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { compile } from "./compile.js";

const defaultOptions = {
	allErrors: true, // required for `errorMessage`
};

export const validate = async (schema, options = {}) => {
	options = { ...defaultOptions, ...options };

	let compiled;
	try {
		compiled = compile(schema, options);
	} catch (e) {
		console.error(e.message);
		return undefined;
	}

	let testSuccess = true;
	for (const data of options?.testData ?? []) {
		const valid = compiled(structuredClone(data));
		if (!valid) {
			console.error(compiled.errors);
			testSuccess = false;
		}
	}

	return testSuccess;
};

export default validate;
