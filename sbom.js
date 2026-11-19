// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { compile } from "./compile.js";

// Pinned to the commit behind the spdx-spec `v2.3` tag so the schema cannot
// change underneath a release.
const schemaUrls = new Map([
	[
		"SPDX-2.3",
		"https://raw.githubusercontent.com/spdx/spdx-spec/aadf3b0b8dbbabdb4d880b0fc714255fea436ff7/schemas/spdx-schema.json",
	],
]);

const downloadSchema = async (format, url) => {
	const failure = `Failed to download the ${format} schema from ${url}`;
	let response;
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
	} catch (error) {
		throw new Error(`${failure}: ${error.message}`, { cause: error });
	}
	if (!response.ok) {
		throw new Error(`${failure}: HTTP ${response.status}`);
	}
	return response.json();
};

export const sbom = async (document) => {
	const format = document?.spdxVersion;
	const url = schemaUrls.get(format);
	if (!url) {
		throw new Error(`Unsupported SBOM format: ${format ?? "no spdxVersion"}`);
	}
	const validator = compile(await downloadSchema(format, url));
	const valid = validator(document);
	return { valid, errors: validator.errors ?? [] };
};

export default sbom;
