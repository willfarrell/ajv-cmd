// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { lookup } from "node:dns/promises";
import { readFile, stat, writeFile } from "node:fs/promises";
import { isSafePattern } from "redos-detector";
import sast from "../sast.js";

const fileExists = async (filepath) => {
	const stats = await stat(filepath);
	if (!stats.isFile()) {
		throw new Error(`${filepath} is not a file`);
	}
};

export default async (input, options) => {
	await fileExists(input);

	const jsonSchema = await readFile(input, { encoding: "utf8" }).then((res) =>
		JSON.parse(res),
	);

	if (options?.refSchemaFiles) {
		const refSchemas = [];
		for (const schemaFilePath of options.refSchemaFiles) {
			const refSchemaFile = await readFile(schemaFilePath, {
				encoding: "utf8",
			}).then((res) => JSON.parse(res));
			refSchemas.push(refSchemaFile);
		}
		options.schemas = refSchemas;
	}

	const maxDepth =
		options.overrideMaxDepth != null
			? Number(options.overrideMaxDepth)
			: MAX_DEPTH;

	// Single crawl: depth, min/max, patterns, $ref collection
	const crawl = crawlSchema(jsonSchema, maxDepth);

	let errors = [];

	if (crawl.depthExceeded) {
		errors.push({
			instancePath: "",
			schemaPath: "#/depth",
			keyword: "depth",
			params: { depth: crawl.depth, limit: maxDepth },
			message: `must NOT have depth greater than ${maxDepth}`,
		});
	} else {
		// Only run meta-schema validation if depth is safe
		const validate = sast(jsonSchema, options);
		validate(jsonSchema, options);
		if (validate.errors) errors.push(...validate.errors);

		// Append crawl findings after validate errors
		errors.push(...crawl.errors);

		const ssrfErrors = await resolveSSRFRefs(crawl.refs);
		errors.push(...ssrfErrors);

		if (options.overrideMaxItems != null && errors.length) {
			const limit = Number(options.overrideMaxItems);
			errors = errors.filter((err) => {
				if (
					err.schemaPath ===
					"#/definitions/safeArrayItemsLimits/maxItems"
				) {
					const arr = resolveInstancePath(
						jsonSchema,
						err.instancePath,
					);
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
					const obj = resolveInstancePath(
						jsonSchema,
						err.instancePath,
					);
					if (typeof obj !== "object" || obj === null) return true;
					return Object.keys(obj).length > limit;
				}
				return true;
			});
		}
	}

	if (errors.length) {
		if (typeof options.output === "string") {
			await writeFile(
				options.output,
				JSON.stringify(errors, null, 2),
				"utf8",
			);
		} else if (options.output === true) {
			return errors;
		} else {
			console.log(input, "has issues", stringify(errors));
		}
		if (options.fail) {
			process.exit(1);
		}
	} else {
		console.log(input, "has no issues");
	}
};

const MAX_DEPTH = 32;

const crawlSchema = (obj, maxDepth) => {
	const result = { depth: 0, depthExceeded: false, errors: [], refs: [] };
	if (typeof obj !== "object" || obj === null) return result;

	result.depth = 1;
	const stack = [[obj, "", 1]];

	while (stack.length > 0) {
		const [current, path, currentDepth] = stack.pop();

		// minLength / maxLength
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

		// minimum / exclusiveMinimum / maximum / exclusiveMaximum
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

		// minItems / maxItems
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

		// minContains / maxContains
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

		// ReDoS pattern check
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

		// Collect remote $ref URLs for DNS resolution
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

		// Traverse children, tracking depth
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

const isPrivateIP = (ip) => {
	const parts = ip.split(".").map(Number);
	if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) {
		if (parts[0] === 10) return true; // 10.0.0.0/8
		if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
		if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
		if (parts[0] === 127) return true; // 127.0.0.0/8
		if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16
		if (parts[0] === 0) return true; // 0.0.0.0/8
		if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10 (CGN)
		if (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) return true; // 198.18.0.0/15
	}
	// IPv6 private/reserved
	const lower = ip.toLowerCase();
	if (lower === "::1" || lower === "::") return true;
	if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
	if (lower.startsWith("fe80")) return true; // link-local
	if (lower.startsWith("::ffff:")) {
		return isPrivateIP(lower.slice(7)); // IPv4-mapped IPv6
	}
	return false;
};

const resolveSSRFRefs = async (refs) => {
	const errors = [];
	const hostnameMap = new Map();
	for (const entry of refs) {
		if (!hostnameMap.has(entry.hostname)) {
			hostnameMap.set(entry.hostname, []);
		}
		hostnameMap.get(entry.hostname).push(entry);
	}
	for (const [hostname, entries] of hostnameMap) {
		try {
			const { address } = await lookup(hostname);
			if (isPrivateIP(address)) {
				for (const { ref, path } of entries) {
					errors.push({
						instancePath: path,
						schemaPath: "#/ssrf",
						keyword: "ssrf",
						params: { ref, hostname, resolvedIP: address },
						message: `$ref hostname "${hostname}" resolves to private IP ${address}`,
					});
				}
			}
		} catch {
			for (const { ref, path } of entries) {
				errors.push({
					instancePath: path,
					schemaPath: "#/ssrf",
					keyword: "ssrf",
					params: { ref, hostname },
					message: `$ref hostname "${hostname}" does not resolve`,
				});
			}
		}
	}
	return errors;
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

const stringify = (arr) => {
	let str = "[\n";
	for (let i = 0, l = arr.length; i < l; i++) {
		str += `${JSON.stringify(arr[i]) + (i < l - 1 ? "," : "")}\n`;
	}
	return `${str}]`;
};
