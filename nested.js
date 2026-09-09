// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT

export const nested = (pointer, schema) => {
	if (!pointer.startsWith("/") || pointer.length < 2) {
		throw new Error(
			`Expected a JSON Pointer to a property, received "${pointer}"`,
		);
	}
	// RFC 6901: `~1` is an encoded `/`, `~0` an encoded `~`. Order matters —
	// unescaping `~0` first would turn `~01` into `~1` and then into `/`.
	const keys = pointer
		.slice(1)
		.split("/")
		.map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"));

	const inner =
		typeof schema === "object" && schema !== null && !schema.$id
			? { ...schema, $id: `ajv-cmd:nested:${pointer}` }
			: schema;

	return keys.reduceRight(
		(subschema, key) => ({
			type: "object",
			required: [key],
			properties: { [key]: subschema },
		}),
		inner,
	);
};

export default nested;
