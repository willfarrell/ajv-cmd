import { ok, strictEqual } from "node:assert";
import test from "node:test";
import defaults, {
	compile,
	deref,
	ftl,
	instance,
	transpile,
	validate,
} from "./index.js";

test("index should export instance function", () => {
	ok(typeof instance === "function");
});

test("index should export compile function", () => {
	ok(typeof compile === "function");
});

test("index should export deref function", () => {
	ok(typeof deref === "function");
});

test("index should export transpile function", () => {
	ok(typeof transpile === "function");
});

test("index should export validate function", () => {
	ok(typeof validate === "function");
});

test("index should export ftl function", () => {
	ok(typeof ftl === "function");
});

test("index default export should contain all functions", () => {
	strictEqual(defaults.instance, instance);
	strictEqual(defaults.compile, compile);
	strictEqual(defaults.deref, deref);
	strictEqual(defaults.transpile, transpile);
	strictEqual(defaults.validate, validate);
	strictEqual(defaults.ftl, ftl);
});

test("index does not export sast (ESM-only subpath, top-level await)", async () => {
	// sast-json-schema uses top-level await, so sast is intentionally NOT on the
	// main barrel (which would make it async and break the CJS require build).
	// Consumers must use the `ajv-cmd/sast` subpath. Keep README in sync.
	const mod = await import("./index.js");
	strictEqual("sast" in mod, false);
	strictEqual("sast" in defaults, false);
});
