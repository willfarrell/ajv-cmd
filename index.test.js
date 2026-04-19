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
