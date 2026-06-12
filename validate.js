// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { compile } from "./compile.js";

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

// Returns `{ valid, errors }` and never writes to the console — printing is the
// CLI layer's job (commands/validate.js), not the library's.
// The `allErrors: true` default (required for `errorMessage`) is applied by
// compile.js, so options pass through untouched here.
export const validate = async (schema, options = {}) => {
	let compiled;
	try {
		compiled = compile(schema, options);
	} catch (e) {
		// `valid: undefined` (schema failed to compile) is intentionally distinct
		// from `valid: false` (data invalid) so callers can tell a broken schema
		// apart from a failed validation.
		return { valid: undefined, errors: [e] };
	}

	const errors = [];
	// `?.` matters: an explicit null bypasses the parameter default above.
	for (const data of options?.testData ?? []) {
		const valid = compiled(safeClone(data));
		if (!valid) {
			errors.push(...compiled.errors);
		}
	}

	return { valid: errors.length === 0, errors };
};

export default validate;
