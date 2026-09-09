// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT

/**
 * Wraps a schema so it validates at `pointer` within a larger document, one
 * `type: "object"` level per pointer segment, each one `required`.
 *
 *
 * @example
 * nested("/body", bodySchema) // { type: "object", required: ["body"], properties: { body: bodySchema } }
 */
export declare const nested: (pointer: string, schema: object) => object;

export default nested;
