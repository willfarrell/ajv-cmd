// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import ajvFormatsDraft2019 from "@silverbucket/ajv-formats-draft2019";
import AjvDraft07 from "ajv";
/** @typedef {import("ajv/dist/2020.js").default} Ajv2020 */
import Ajv from "ajv/dist/2020.js";
import ajvErrors from "ajv-errors";
import ajvFormats from "ajv-formats";
import ajvKeywords from "ajv-keywords";

const defaultOptions = {
	allErrors: true, // required for ajv-errors
};

// Ajv2020 cannot load the draft-07 meta-schema, so a schema that declares
// draft-07 compiles on the draft-07 class. Any other `$schema` stays on 2020-12.
const ajvByMetaSchema = new Map([
	["http://json-schema.org/draft-07/schema#", AjvDraft07],
]);

const create = (AjvClass, options) => {
	// Default `keywords` to [] — custom keywords are normally registered by the
	// ajv-keywords plugin below, not via the constructor option — but respect any
	// caller-supplied `keywords` rather than silently discarding them.
	options = {
		...defaultOptions,
		...options,
		keywords: options?.keywords ?? [],
	};

	const ajv = new AjvClass(options);
	ajvFormats(ajv);
	ajvFormatsDraft2019(ajv);
	ajvKeywords(ajv);
	// ajv-errors (the `errorMessage` keyword) requires allErrors and throws at
	// registration without it — skip the plugin when the caller opts out.
	if (options.allErrors) {
		ajvErrors(ajv);
	}
	return ajv;
};

/** @returns {Ajv2020} */
export const instance = (options) => create(Ajv, options);

export const compile = (schema, options) =>
	create(ajvByMetaSchema.get(schema.$schema) ?? Ajv, options).compile(schema);

export default compile;
