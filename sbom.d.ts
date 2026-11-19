// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import type { ErrorObject } from "ajv";

export type SbomResult = {
	/** `true` when the document satisfies its format's official schema. */
	valid: boolean;
	/** AJV error objects for the document, empty when valid. */
	errors: ErrorObject[];
};

/**
 * Detects the SBOM format of a parsed document and validates it against that
 * format's official schema, downloaded at call time. Supports SPDX 2.3.
 * Rejects when the format is unsupported or the schema download fails.
 */
export declare const sbom: (document: unknown) => Promise<SbomResult>;

export default sbom;
