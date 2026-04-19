// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { lookup } from "node:dns/promises";
import Ajv from "ajv/dist/2020.js";
import { isSafePattern } from "redos-detector";
import schema201909 from "sast-json-schema/2019-09.json" with { type: "json" };
import schema202012 from "sast-json-schema/2020-12.json" with { type: "json" };
import schemaDraft04 from "sast-json-schema/draft-04.json" with {
	type: "json",
};
import schemaDraft06 from "sast-json-schema/draft-06.json" with {
	type: "json",
};
import schemaDraft07 from "sast-json-schema/draft-07.json" with {
	type: "json",
};

const defaultOptions = {
	strictTypes: false,
	allErrors: true,
};

const DEFAULT_VERSION = "2020-12";

// Pre-compiled SAST meta-schema validators, keyed by draft version. Compiled
// once at module load so every sast() / analyze() call reuses the same
// validator.
const builtSchemas = new Map(
	[
		["2020-12", schema202012],
		["2019-09", schema201909],
		["draft-07", schemaDraft07],
		["draft-06", schemaDraft06],
		["draft-04", schemaDraft04],
	].map(([version, metaSchema]) => [
		version,
		new Ajv(defaultOptions).compile(metaSchema),
	]),
);

// Maps a user schema's $schema URL to the matching draft version. Accepts
// both http/https and the optional trailing "#" fragment.
const schemaVersion = (url) => {
	if (!url) return DEFAULT_VERSION;
	for (const version of builtSchemas.keys()) {
		if (url.includes(version)) return version;
	}
	return undefined;
};

export const MAX_DEPTH = 32;

// Returns the pre-compiled SAST validator for the draft declared by
// `schema.$schema`. Defaults to 2020-12 when $schema is absent.
export const sast = (schema, _options = {}) => {
	const version = schemaVersion(schema?.$schema);
	const validate = builtSchemas.get(version);
	if (!validate) {
		throw new Error(`Unsupported $schema: ${schema?.$schema}`);
	}
	return validate;
};

export default sast;

// Runs a full SAST analysis on `schema`. Returns an array of AJV-style error
// objects. Never touches the filesystem, never prints, never exits the process.
export const analyze = async (schema, options = {}) => {
	const maxDepth =
		options.overrideMaxDepth != null
			? Number(options.overrideMaxDepth)
			: MAX_DEPTH;

	const crawl = crawlSchema(schema, maxDepth);

	if (crawl.depthExceeded) {
		return [
			{
				instancePath: "",
				schemaPath: "#/depth",
				keyword: "depth",
				params: { depth: crawl.depth, limit: maxDepth },
				message: `must NOT have depth greater than ${maxDepth}`,
			},
		];
	}

	let errors = [];
	const validate = sast(schema, options);
	validate(schema, options);
	if (validate.errors) errors.push(...validate.errors);
	errors.push(...crawl.errors);

	const ssrfErrors = await resolveSSRFRefs(crawl.refs);
	errors.push(...ssrfErrors);

	if (options.overrideMaxItems != null && errors.length) {
		const limit = Number(options.overrideMaxItems);
		errors = errors.filter((err) => {
			if (err.schemaPath === "#/definitions/safeArrayItemsLimits/maxItems") {
				const arr = resolveInstancePath(schema, err.instancePath);
				return !Array.isArray(arr) || arr.length > limit;
			}
			return true;
		});
	}
	if (options.overrideMaxProperties != null && errors.length) {
		const limit = Number(options.overrideMaxProperties);
		errors = errors.filter((err) => {
			if (
				err.schemaPath ===
				"#/definitions/safeObjectPropertiesLimits/maxProperties"
			) {
				const obj = resolveInstancePath(schema, err.instancePath);
				if (typeof obj !== "object" || obj === null) return true;
				return Object.keys(obj).length > limit;
			}
			return true;
		});
	}
	if (Array.isArray(options.ignore) && options.ignore.length && errors.length) {
		const ignore = new Set(options.ignore);
		errors = errors.filter((err) => {
			const pathKey = err.instancePath;
			const keywordKey = `${err.instancePath}:${err.keyword}`;
			if (ignore.has(pathKey)) {
				console.log(
					`ignored ${err.keyword} at ${err.instancePath} (matched --ignore ${pathKey})`,
				);
				return false;
			}
			if (ignore.has(keywordKey)) {
				console.log(
					`ignored ${err.keyword} at ${err.instancePath} (matched --ignore ${keywordKey})`,
				);
				return false;
			}
			return true;
		});
	}

	return errors;
};

// Single-pass crawler that records: max depth, range/length inconsistencies,
// ReDoS patterns, and remote $ref URLs (for later SSRF resolution).
// Depth semantics: each object-valued key counts as one level, so a schema
// `{properties: {a: {properties: {b: {...}}}}}` reaches depth 5 (root,
// properties, a, properties, b). With MAX_DEPTH=32 this corresponds to roughly
// 16 levels of real schema nesting.
export const crawlSchema = (obj, maxDepth = MAX_DEPTH) => {
	const result = { depth: 0, depthExceeded: false, errors: [], refs: [] };
	if (typeof obj !== "object" || obj === null) return result;

	result.depth = 1;
	const stack = [[obj, "", 1]];

	while (stack.length > 0) {
		const [current, path, currentDepth] = stack.pop();

		if (
			Object.hasOwn(current, "minLength") &&
			Object.hasOwn(current, "maxLength") &&
			current.minLength > current.maxLength
		) {
			result.errors.push({
				instancePath: path,
				schemaPath: "#/minLength",
				keyword: "minLength",
				params: {
					minLength: current.minLength,
					maxLength: current.maxLength,
				},
				message: "minLength must be less than or equal to maxLength",
			});
		}

		{
			const hasMin = Object.hasOwn(current, "minimum");
			const hasExMin = Object.hasOwn(current, "exclusiveMinimum");
			const hasMax = Object.hasOwn(current, "maximum");
			const hasExMax = Object.hasOwn(current, "exclusiveMaximum");
			if ((hasMin || hasExMin) && (hasMax || hasExMax)) {
				const effectiveMin =
					hasMin && hasExMin
						? Math.max(current.minimum, current.exclusiveMinimum)
						: hasMin
							? current.minimum
							: current.exclusiveMinimum;
				const effectiveMax =
					hasMax && hasExMax
						? Math.min(current.maximum, current.exclusiveMaximum)
						: hasMax
							? current.maximum
							: current.exclusiveMaximum;
				if (!(effectiveMin < effectiveMax)) {
					result.errors.push({
						instancePath: path,
						schemaPath: "#/minimum",
						keyword: "minimum",
						params: {
							...(hasMin && { minimum: current.minimum }),
							...(hasExMin && {
								exclusiveMinimum: current.exclusiveMinimum,
							}),
							...(hasMax && { maximum: current.maximum }),
							...(hasExMax && {
								exclusiveMaximum: current.exclusiveMaximum,
							}),
						},
						message: "minimum must be less than maximum",
					});
				}
			}
		}

		if (
			Object.hasOwn(current, "minItems") &&
			Object.hasOwn(current, "maxItems") &&
			current.minItems > current.maxItems
		) {
			result.errors.push({
				instancePath: path,
				schemaPath: "#/minItems",
				keyword: "minItems",
				params: {
					minItems: current.minItems,
					maxItems: current.maxItems,
				},
				message: "minItems must be less than or equal to maxItems",
			});
		}

		if (
			Object.hasOwn(current, "minContains") &&
			Object.hasOwn(current, "maxContains") &&
			current.minContains > current.maxContains
		) {
			result.errors.push({
				instancePath: path,
				schemaPath: "#/minContains",
				keyword: "minContains",
				params: {
					minContains: current.minContains,
					maxContains: current.maxContains,
				},
				message: "minContains must be less than or equal to maxContains",
			});
		}

		if (
			Object.hasOwn(current, "pattern") &&
			typeof current.pattern === "string"
		) {
			const patternResult = isSafePattern(current.pattern);
			if (!patternResult.safe) {
				result.errors.push({
					instancePath: `${path}/pattern`,
					schemaPath: "#/redos",
					keyword: "pattern",
					params: { pattern: current.pattern },
					message: "pattern is vulnerable to ReDoS",
				});
			}
		}

		if (
			Object.hasOwn(current, "$ref") &&
			typeof current.$ref === "string" &&
			!current.$ref.startsWith("#")
		) {
			try {
				const url = new URL(current.$ref);
				result.refs.push({
					hostname: url.hostname,
					ref: current.$ref,
					path: `${path}/$ref`,
				});
			} catch {
				// not a valid URL, skip
			}
		}

		for (const key in current) {
			if (Object.hasOwn(current, key)) {
				const value = current[key];
				if (typeof value === "object" && value !== null) {
					const newDepth = currentDepth + 1;
					if (newDepth > result.depth) result.depth = newDepth;
					if (result.depth > maxDepth) {
						result.depthExceeded = true;
						return result;
					}
					stack.push([value, `${path}/${key}`, newDepth]);
				}
			}
		}
	}

	return result;
};

// RFC 1918 + loopback + link-local + CGN + TEST-NETs + multicast + reserved.
// Used to block $ref URLs whose hostname resolves to an internal/private IP.
export const isPrivateIP = (ip) => {
	const parts = ip.split(".").map(Number);
	if (
		parts.length === 4 &&
		parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 255)
	) {
		const [a, b] = parts;
		if (a === 0) return true; // 0.0.0.0/8 "this" network
		if (a === 10) return true; // 10.0.0.0/8 private
		if (a === 127) return true; // 127.0.0.0/8 loopback
		if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGN
		if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
		if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
		if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24 IETF
		if (a === 192 && b === 0 && parts[2] === 2) return true; // 192.0.2.0/24 TEST-NET-1
		if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
		if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
		if (a === 198 && b === 51 && parts[2] === 100) return true; // 198.51.100.0/24 TEST-NET-2
		if (a === 203 && b === 0 && parts[2] === 113) return true; // 203.0.113.0/24 TEST-NET-3
		if (a >= 224 && a <= 239) return true; // 224.0.0.0/4 multicast
		if (a >= 240) return true; // 240.0.0.0/4 reserved + 255.255.255.255 broadcast
	}

	const lower = ip.toLowerCase();
	if (lower === "::1" || lower === "::") return true;
	if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
	if (lower.startsWith("fe80")) return true; // link-local
	if (lower.startsWith("ff")) return true; // multicast
	if (lower.startsWith("::ffff:")) {
		return isPrivateIP(lower.slice(7)); // IPv4-mapped IPv6
	}
	return false;
};

export const resolveSSRFRefs = async (refs) => {
	const hostnameMap = new Map();
	for (const entry of refs) {
		if (!hostnameMap.has(entry.hostname)) {
			hostnameMap.set(entry.hostname, []);
		}
		hostnameMap.get(entry.hostname).push(entry);
	}
	const results = await Promise.all(
		[...hostnameMap.entries()].map(async ([hostname, entries]) => {
			try {
				const { address } = await lookup(hostname);
				if (!isPrivateIP(address)) return [];
				return entries.map(({ ref, path }) => ({
					instancePath: path,
					schemaPath: "#/ssrf",
					keyword: "ssrf",
					params: { ref, hostname, resolvedIP: address },
					message: `$ref hostname "${hostname}" resolves to private IP ${address}`,
				}));
			} catch {
				return entries.map(({ ref, path }) => ({
					instancePath: path,
					schemaPath: "#/ssrf",
					keyword: "ssrf",
					params: { ref, hostname },
					message: `$ref hostname "${hostname}" does not resolve`,
				}));
			}
		}),
	);
	return results.flat();
};

const resolveInstancePath = (obj, pointer) => {
	if (typeof obj !== "object" || obj === null) return undefined;
	if (!pointer) return obj;
	const parts = pointer.split("/").slice(1);
	let current = obj;
	for (const part of parts) {
		if (typeof current !== "object" || current === null) return undefined;
		if (!Object.hasOwn(current, part)) return undefined;
		current = current[part];
	}
	return current;
};
