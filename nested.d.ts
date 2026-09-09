// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT

/**
 * Wraps a schema so it validates at `pointer` within a larger document, one
 * `type: "object"` level per pointer segment, each one `required`.
 *
 * `$schema`, `$defs`, and `definitions` are hoisted to the new root, since
 * internal `#/$defs/...` refs resolve from there. A schema with an `$id` is its
 * own base URI, so it is nested verbatim instead.
 *
 * @example
 * nested("/body", bodySchema) // { type: "object", required: ["body"], properties: { body: bodySchema } }
 */
export declare const nested: (pointer: string, schema: object) => object;

export default nested;
