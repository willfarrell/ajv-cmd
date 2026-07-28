// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import type { ValidateFunction } from "ajv/dist/2020.js";

/** AJV-style error object describing a SAST finding. */
export type SastError = {
	instancePath: string;
	keyword: string;
	message?: string;
	[key: string]: unknown;
};

export type AnalyzeOptions = {
	overrideMaxItems?: number;
	overrideMaxDepth?: number;
	overrideMaxProperties?: number;
	/** Suppress findings by `instancePath` or `instancePath:keyword`. */
	ignore?: string[];
	/** Skip DNS lookups for remote `$ref` URLs (disables SSRF resolution). */
	offline?: boolean;
	dnsTimeoutMs?: number;
	dnsConcurrency?: number;
	lang?: string;
	/** Hostnames considered safe when resolving remote `$ref`s. */
	safeHostnames?: Set<string>;
	[key: string]: unknown;
};

export declare const MAX_DEPTH: number;

/**
 * Returns the pre-compiled SAST validator for the draft declared by
 * `schema.$schema` (defaults to 2020-12).
 */
export declare const sast: (schema?: { $schema?: string }) => ValidateFunction;

/** Runs a full SAST analysis, returning AJV-style error objects. */
export declare const analyze: (
	schema: unknown,
	options?: AnalyzeOptions,
) => Promise<SastError[]>;

export declare const crawlSchema: (
	schema: unknown,
	maxDepth?: number,
	options?: Record<string, unknown>,
) => SastError[];

export declare const isPrivateIP: (ip: string) => boolean;

export declare const resolveSSRFRefs: (
	refs: unknown,
	options?: Record<string, unknown>,
) => Promise<SastError[]>;

export default sast;
