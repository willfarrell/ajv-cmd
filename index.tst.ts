// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import type { Ajv2020, ErrorObject, ValidateFunction } from "ajv/dist/2020.js";
import { describe, expect, test } from "tstyche";
import ajvCmd, {
	compile,
	deref,
	ftl,
	instance,
	transpile,
	validate,
} from "./index.js";
import type { ValidateResult } from "./validate.js";

describe("ajv-cmd", () => {
	test("instance is a function", () => {
		// biome-ignore lint/complexity/noBannedTypes: intentional generic function type check
		expect(instance).type.toBeAssignableTo<Function>();
		expect(instance()).type.toBeAssignableTo<object>();
	});

	test("compile is a function", () => {
		// biome-ignore lint/complexity/noBannedTypes: intentional generic function type check
		expect(compile).type.toBeAssignableTo<Function>();
	});

	test("deref is a function", () => {
		// biome-ignore lint/complexity/noBannedTypes: intentional generic function type check
		expect(deref).type.toBeAssignableTo<Function>();
	});

	test("transpile is a function", () => {
		// biome-ignore lint/complexity/noBannedTypes: intentional generic function type check
		expect(transpile).type.toBeAssignableTo<Function>();
	});

	test("validate is a function", () => {
		// biome-ignore lint/complexity/noBannedTypes: intentional generic function type check
		expect(validate).type.toBeAssignableTo<Function>();
	});

	test("ftl is exported", () => {
		// biome-ignore lint/complexity/noBannedTypes: intentional generic function type check
		expect(ftl).type.toBeAssignableTo<Function>();
	});

	test("instance returns an Ajv 2020 instance", () => {
		expect(instance()).type.toBe<Ajv2020>();
	});

	test("compile returns an AJV validate function", () => {
		expect(compile({ type: "object" })).type.toBe<ValidateFunction>();
	});

	test("validate resolves to a structured result", () => {
		expect(validate({ type: "object" })).type.toBe<Promise<ValidateResult>>();
		expect<ValidateResult["valid"]>().type.toBe<boolean | undefined>();
		expect<ValidateResult["errors"]>().type.toBe<Array<ErrorObject | Error>>();
	});

	test("transpile resolves to the emitted JavaScript source", () => {
		expect(transpile({ type: "object" })).type.toBe<Promise<string>>();
	});

	test("ftl returns the emitted JavaScript source", () => {
		expect(ftl("hello = Hello", { locale: ["en"] })).type.toBe<string>();
	});

	test("default export has all named exports", () => {
		expect(ajvCmd).type.toBe<{
			instance: typeof instance;
			compile: typeof compile;
			deref: typeof deref;
			ftl: typeof ftl;
			transpile: typeof transpile;
			validate: typeof validate;
		}>();
	});
});
