// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
//
// Note: `sast` is intentionally NOT part of this barrel — sast-json-schema
// uses top-level await, which would break `require()` consumers. Use the
// `ajv-cmd/sast` subpath instead.
import { compile, instance } from "./compile.js";
import deref from "./deref.js";
import ftl from "./ftl.js";
import transpile from "./transpile.js";
import validate from "./validate.js";

export { compile, deref, ftl, instance, transpile, validate };

declare const _default: {
	instance: typeof instance;
	compile: typeof compile;
	deref: typeof deref;
	ftl: typeof ftl;
	transpile: typeof transpile;
	validate: typeof validate;
};

export default _default;
