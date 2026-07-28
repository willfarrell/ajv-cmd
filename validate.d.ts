// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import type { AnySchema, ErrorObject, Options } from "ajv/dist/2020.js";

export type ValidateOptions = Options & {
	/** Data values to validate against the compiled schema. */
	testData?: unknown[];
};

export type ValidateResult = {
	/**
	 * `true` when the schema compiled and all test data passed, `false` when any
	 * test data failed, `undefined` when the schema itself failed to compile.
	 */
	valid: boolean | undefined;
	/**
	 * AJV error objects aggregated across all failing test data items, or the
	 * single thrown `Error` when the schema failed to compile.
	 */
	errors: Array<ErrorObject | Error>;
};

export declare const validate: (
	schema: AnySchema,
	options?: ValidateOptions,
) => Promise<ValidateResult>;

export default validate;
