// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { describe, expect, test } from "tstyche";
import ajvCmd, {
	compile,
	ftl,
	instance,
	transpile,
	validate,
} from "./index.js";

describe("ajv-cmd", () => {
	test("instance is a function", () => {
		expect(instance).type.toBeAssignableTo<Function>();
		expect(instance()).type.toBeAssignableTo<object>();
	});

	test("compile is a function", () => {
		expect(compile).type.toBeAssignableTo<Function>();
	});

	test("transpile is a function", () => {
		expect(transpile).type.toBeAssignableTo<Function>();
	});

	test("validate is a function", () => {
		expect(validate).type.toBeAssignableTo<Function>();
	});

	test("ftl is exported", () => {
		expect(ftl).type.toBeAssignableTo<Function>();
	});

	test("default export has all named exports", () => {
		expect(ajvCmd).type.toBe<{
			instance: typeof instance;
			compile: typeof compile;
			ftl: typeof ftl;
			transpile: typeof transpile;
			validate: typeof validate;
		}>();
	});
});
