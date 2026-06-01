// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { compile } from "./compile.js";

const defaultOptions = {
	allErrors: true, // required for `errorMessage`
};

// structuredClone shields the caller's data from in-place mutation by
// coerceTypes/useDefaults, but throws DataCloneError for values it cannot clone
// (functions, class instances with internal slots, …). Fall back to validating
// the value as-is in that case rather than crashing the whole run.
const safeClone = (data) => {
	try {
		return structuredClone(data);
	} catch {
		return data;
	}
};

export const validate = async (schema, options = {}) => {
	options = { ...defaultOptions, ...options };

	let compiled;
	try {
		compiled = compile(schema, options);
	} catch (e) {
		console.error(e.message);
		// `undefined` (schema failed to compile) is intentionally distinct from
		// `false` (data invalid) so callers can tell a broken schema apart from a
		// failed validation.
		return undefined;
	}

	let testSuccess = true;
	for (const data of options?.testData ?? []) {
		const valid = compiled(safeClone(data));
		if (!valid) {
			console.error(compiled.errors);
			testSuccess = false;
		}
	}

	return testSuccess;
};

export default validate;
