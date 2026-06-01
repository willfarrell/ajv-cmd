// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { dereference } from "@apidevtools/json-schema-ref-parser";

export const deref = async (schema, options = {}) => {
	const offline = Boolean(options.offline);
	const schemas = options.schemas ?? [];

	// Fast path: online with no seeded schemas — let ref-parser resolve normally.
	if (!offline && !schemas.length) return dereference(schema);

	// Otherwise intercept the global fetch ref-parser uses: serve any -r schemas
	// from memory, and (when offline) refuse to touch the network on a cache miss
	// instead of disabling the HTTP resolver outright — so `--offline` and `-r`
	// compose (seeded remote schemas still resolve while uncached URLs are
	// rejected). Local ($ref: "#/…") and file refs never hit fetch at all.
	const restoreFetch = installFetchCache(schemas, offline);
	try {
		// Offline never touches the network, so disable ref-parser's HTTP timeout.
		// Otherwise its 60s abort timer leaks: our fetch shim rejects a cache miss
		// before ref-parser reaches its `clearTimeout`, leaving a dangling
		// `setTimeout` that keeps the event loop alive for a full minute.
		return await dereference(
			schema,
			offline ? { resolve: { http: { timeout: 0 } } } : {},
		);
	} finally {
		restoreFetch();
	}
};

export default deref;

// Serve remote `$ref`s identified by `$id` from memory by intercepting the
// global `fetch` that json-schema-ref-parser uses. Returns a function that
// restores the original `fetch` so the patch never leaks past this call —
// important because `deref` is also exposed as a library API.
const installFetchCache = (schemas, offline = false) => {
	const originalFetch = globalThis.fetch;

	const cache = {};
	const enc = new TextEncoder();
	for (let i = schemas.length; i--; ) {
		const schema = schemas[i];
		if (schema.$id) {
			cache[schema.$id] = enc.encode(JSON.stringify(schema));
		}
	}

	globalThis.fetch = async (...args) => {
		// ref-parser always calls fetch with a URL object as the first arg.
		const href = args[0].href;
		if (cache[href]) {
			return {
				status: 200,
				body: true,
				arrayBuffer: async () => cache[href],
			};
		}
		if (offline) {
			throw new Error(`offline: refusing to fetch remote $ref ${href}`);
		}
		return originalFetch(...args);
	};

	return () => {
		globalThis.fetch = originalFetch;
	};
};
