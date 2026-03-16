// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import {
	compile as compileImport,
	instance as instanceImport,
} from "./compile.js";
import ftlImport from "./ftl.js";
import transpileImport from "./transpile.js";
import validateImport from "./validate.js";

export const instance = instanceImport;
export const compile = compileImport;
export const transpile = transpileImport;
export const validate = validateImport;
export const ftl = ftlImport;

export default {
	instance,
	compile,
	ftl,
	transpile,
	validate,
};
