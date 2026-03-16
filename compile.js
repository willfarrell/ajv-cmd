// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import ajvFormatsDraft2019 from "@silverbucket/ajv-formats-draft2019";
import Ajv from "ajv/dist/2020.js";
import ajvErrors from "ajv-errors";
import ajvFormats from "ajv-formats";
import ajvKeywords from "ajv-keywords";

const defaultOptions = {
	allErrors: true, // required for ajv-errors
};

export const instance = (options = {}) => {
	options = { ...defaultOptions, ...options, keywords: [] };

	const ajv = new Ajv(options);
	ajvFormats(ajv);
	ajvFormatsDraft2019(ajv);
	ajvKeywords(ajv);
	ajvErrors(ajv);
	return ajv;
};

export const compile = (schema, options = {}) => {
	options = { ...defaultOptions, ...options, keywords: [] };
	const ajv = instance(options);
	return ajv.compile(schema);
};

export default compile;
