// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import {
	dereference,
	ResolverError,
} from "@apidevtools/json-schema-ref-parser";

export const deref = async (schema, options = {}) => {
	// Serve any -r schemas (identified by `$id`) from memory via a custom
	// ref-parser resolver scoped to this call — never by patching the global
	// fetch, which would leak across concurrent deref() calls (deref is a public
	// library API). An id-less seeded schema caches under the key `undefined`,
	// which no file URL ever matches.
	const cache = new Map();
	if (options.schemas) {
		for (const seeded of options.schemas) {
			cache.set(seeded.$id, seeded);
		}
	}

	const resolve = {
		seeded: {
			// Runs before the built-in file (order 100) and http (order 200) resolvers.
			order: 1,
			canRead: (file) => cache.has(file.url),
			// Stringify per read so ref-parser parses a fresh copy and its in-place
			// mutations never write back into the caller's seeded schema object.
			read: (file) => JSON.stringify(cache.get(file.url)),
		},
	};

	if (options.offline) {
		// Disable the HTTP resolver (so no fetch and no 60s abort timer is ever
		// armed) and claim every remaining URL with a resolver that refuses it.
		// Local ($ref: "#/…") and file refs are unaffected: when offlineGuard's
		// read rejects, ref-parser falls through to the file resolver.
		resolve.http = { canRead: false };
		resolve.offlineGuard = {
			order: 2,
			canRead: true,
			read: (file) => {
				// A ResolverError is the one error type ref-parser rethrows verbatim;
				// anything else gets wrapped and the message replaced with a generic
				// `Error reading file` line.
				throw new ResolverError(
					new Error(`offline: refusing to fetch remote $ref ${file.url}`),
					file.url,
				);
			},
		};
	}

	return dereference(schema, { resolve });
};

export default deref;
