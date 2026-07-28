// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
export type DerefOptions = {
	/** Refuse to fetch remote `$ref` URLs (seeded `schemas` still resolve). */
	offline?: boolean;
	/** Schemas served from memory for remote `$ref`s matching their `$id`. */
	schemas?: Array<{ $id?: string } & Record<string, unknown>>;
};

/** Dereferences every `$ref` in the schema, returning a self-contained copy. */
export declare const deref: <T = Record<string, unknown>>(
	schema: object,
	options?: DerefOptions,
) => Promise<T>;

export default deref;
