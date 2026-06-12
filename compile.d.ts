// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import type {
	Ajv2020,
	AnySchema,
	Options,
	ValidateFunction,
} from "ajv/dist/2020.js";

/**
 * Creates an AJV 2020-12 instance with the ajv-formats,
 * @silverbucket/ajv-formats-draft2019, ajv-keywords, and (when `allErrors` is
 * on, the default) ajv-errors plugins registered.
 */
export declare const instance: (options?: Options) => Ajv2020;

/** Compiles a JSON Schema into an AJV validate function. */
export declare const compile: (
	schema: AnySchema,
	options?: Options,
) => ValidateFunction;

export default compile;
