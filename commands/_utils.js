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
	const raw = await readFile(filepath, { encoding: "utf8" });
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
