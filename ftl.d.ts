// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT

/**
 * Transpiles Fluent (.ftl) source into an ESM module of message functions
 * (re-export of `transpile` from ajv-ftl-i18n).
 */
declare const transpile: (
	ftl: string,
	options?: { locale?: string[] } & Record<string, unknown>,
) => string;

export default transpile;
