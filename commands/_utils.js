// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { readFile, stat } from "node:fs/promises";

export const assertFile = async (filepath) => {
	const stats = await stat(filepath);
	if (!stats.isFile()) {
		throw new Error(`${filepath} is not a file`);
	}
};

export const readJson = async (filepath) => {
	// No encoding on purpose: JSON.parse decodes the returned Buffer as UTF-8.
	const raw = await readFile(filepath);
	try {
		return JSON.parse(raw);
	} catch (e) {
		throw new Error(`Failed to parse JSON in ${filepath}: ${e.message}`);
	}
};

export const loadRefSchemas = async (paths) => {
	if (!paths?.length) return undefined;
	return Promise.all(paths.map(readJson));
};
