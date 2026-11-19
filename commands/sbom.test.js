import { ok, rejects, strictEqual } from "node:assert";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CommandFailure } from "./_utils.js";
import sbomCmd from "./sbom.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => resolve(__dirname, "..", "__test__", name);

const mockSchemaDownload = (t) =>
	t.mock.method(globalThis, "fetch", async () =>
		Response.json({
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: { name: { type: "string" } },
		}),
	);

test("cmd sbom reports a valid SPDX document", async (t) => {
	mockSchemaDownload(t);
	const mockLog = t.mock.method(console, "log", () => {});
	await sbomCmd(fixture("sbom.spdx.json"));
	strictEqual(mockLog.mock.calls.length, 1);
	strictEqual(mockLog.mock.calls[0].arguments[0], fixture("sbom.spdx.json"));
	strictEqual(mockLog.mock.calls[0].arguments[1], "is valid");
});

test("cmd sbom prints the errors and fails for an invalid SPDX document", async (t) => {
	mockSchemaDownload(t);
	const mockLog = t.mock.method(console, "log", () => {});
	const mockError = t.mock.method(console, "error", () => {});
	await rejects(
		() => sbomCmd(fixture("sbom-invalid.spdx.json")),
		CommandFailure,
	);
	strictEqual(mockError.mock.calls.length, 1);
	const printed = mockError.mock.calls[0].arguments[0];
	ok(Array.isArray(printed));
	strictEqual(printed[0].instancePath, "/name");
	strictEqual(mockLog.mock.calls.length, 1);
	strictEqual(
		mockLog.mock.calls[0].arguments[0],
		fixture("sbom-invalid.spdx.json"),
	);
	strictEqual(mockLog.mock.calls[0].arguments[1], "is invalid");
});

test("cmd sbom throws for an unsupported format", async (t) => {
	const fetch = mockSchemaDownload(t);
	await rejects(() => sbomCmd(fixture("simple.data.json")), {
		message: /Unsupported SBOM format/,
	});
	strictEqual(fetch.mock.calls.length, 0);
});

test("cmd sbom should throw for non-existent file", async () => {
	await rejects(() => sbomCmd(fixture("nonexistent.json")), {
		code: "ENOENT",
	});
});

test("cmd sbom should throw for directory path", async () => {
	await rejects(() => sbomCmd(resolve(__dirname)), {
		message: /is not a file/,
	});
});
