import { ok } from "node:assert";
import test from "node:test";
import transpile from "./ftl.js";

test("ftl should export a transpile function", () => {
	ok(typeof transpile === "function");
});

test("ftl transpile should process ftl content", () => {
	const ftl = "hello = Hello World\n";
	const result = transpile(ftl, { locale: ["en"] });
	ok(typeof result === "string");
});
