import { deepStrictEqual, rejects, strictEqual } from "node:assert";
import test from "node:test";
import sbom from "./sbom.js";

const spdx23SchemaUrl =
	"https://raw.githubusercontent.com/spdx/spdx-spec/aadf3b0b8dbbabdb4d880b0fc714255fea436ff7/schemas/spdx-schema.json";

// Stand-in for the downloaded SPDX schema. It declares draft-07 like the real
// one, which Ajv2020 refuses to compile.
const spdxSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: { name: { type: "string" } },
	required: ["name"],
};

const mockFetch = (t, response) =>
	t.mock.method(globalThis, "fetch", async () => response);

test("sbom validates an SPDX 2.3 document against the pinned SPDX 2.3 schema", async (t) => {
	const fetch = mockFetch(t, Response.json(spdxSchema));
	const result = await sbom({ spdxVersion: "SPDX-2.3", name: "ajv-cmd" });
	deepStrictEqual(result, { valid: true, errors: [] });
	strictEqual(fetch.mock.calls.length, 1);
	const [url, init] = fetch.mock.calls[0].arguments;
	strictEqual(url, spdx23SchemaUrl);
	strictEqual(init.signal instanceof AbortSignal, true);
});

test("sbom returns the schema errors for an invalid document", async (t) => {
	mockFetch(t, Response.json(spdxSchema));
	const { valid, errors } = await sbom({ spdxVersion: "SPDX-2.3", name: 1 });
	strictEqual(valid, false);
	strictEqual(errors.length, 1);
	strictEqual(errors[0].instancePath, "/name");
	strictEqual(errors[0].message, "must be string");
});

for (const [label, document, format] of [
	["another SPDX version", { spdxVersion: "SPDX-2.2" }, "SPDX-2.2"],
	["no format marker", { bomFormat: "CycloneDX" }, "no spdxVersion"],
	["a non-object document", null, "no spdxVersion"],
]) {
	test(`sbom rejects ${label} without downloading anything`, async (t) => {
		const fetch = mockFetch(t, Response.json(spdxSchema));
		await rejects(() => sbom(document), {
			message: `Unsupported SBOM format: ${format}`,
		});
		strictEqual(fetch.mock.calls.length, 0);
	});
}

test("sbom fails closed when the schema download returns a non-2xx status", async (t) => {
	mockFetch(t, new Response("Not Found", { status: 404 }));
	await rejects(() => sbom({ spdxVersion: "SPDX-2.3", name: "ajv-cmd" }), {
		message: `Failed to download the SPDX-2.3 schema from ${spdx23SchemaUrl}: HTTP 404`,
	});
});

test("sbom fails closed when the schema download errors", async (t) => {
	const cause = new TypeError("fetch failed");
	t.mock.method(globalThis, "fetch", async () => {
		throw cause;
	});
	await rejects(() => sbom({ spdxVersion: "SPDX-2.3", name: "ajv-cmd" }), {
		message: `Failed to download the SPDX-2.3 schema from ${spdx23SchemaUrl}: fetch failed`,
		cause,
	});
});

test("sbom default export should be sbom function", async () => {
	const mod = await import("./sbom.js");
	strictEqual(mod.default, mod.sbom);
});
