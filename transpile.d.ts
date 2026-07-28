// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import type { AnySchema, Options } from "ajv/dist/2020.js";

/**
 * Compiles the schema to standalone validation code and bundles it (esbuild)
 * into a single self-contained ESM module, returned as source text.
 */
export declare const transpile: (
	schema: AnySchema,
	options?: Options,
) => Promise<string>;

export default transpile;
