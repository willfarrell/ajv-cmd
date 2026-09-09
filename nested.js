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

	// Definition keywords are addressed from the schema root (`#/$defs/...`), so
	// they have to travel with the schema when it moves down the tree. An `$id`
	// is the exception: it makes the schema its own base URI, so those refs keep
	// resolving wherever it lands and hoisting would break them instead.
	const { $schema, $defs, definitions, ...rest } = schema;
	const root = schema.$id ? {} : { $schema, $defs, definitions };

	return Object.assign(
		// A schema that carries none of them must not gain `"$defs": undefined`,
		// which AJV's strict mode rejects as an unknown keyword.
		Object.fromEntries(
			Object.entries(root).filter(([, value]) => typeof value !== "undefined"),
		),
		keys.reduceRight(
			(inner, key) => ({
				type: "object",
				required: [key],
				properties: { [key]: inner },
			}),
			schema.$id ? schema : rest,
		),
	);
};

export default nested;
