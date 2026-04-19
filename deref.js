// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { dereference } from "@apidevtools/json-schema-ref-parser";

export const deref = async (schema, options = {}) => {
	if (options.schemas?.length) installFetchCache(options.schemas);
	return dereference(schema);
};

export default deref;

const installFetchCache = (schemas) => {
	const originalFetch = fetch;

	const cache = {};
	const enc = new TextEncoder();
	for (let i = schemas.length; i--; ) {
		const schema = schemas[i];
		if (schema.$id) {
			cache[schema.$id] = enc.encode(JSON.stringify(schema));
		}
	}

	globalThis.fetch = async (...args) => {
		if (cache[args[0].href]) {
			return {
				status: 200,
				body: true,
				arrayBuffer: async () => cache[args[0].href],
			};
		}
		return originalFetch(...args);
	};
};
