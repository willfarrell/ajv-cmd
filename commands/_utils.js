// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { glob, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";

// Thrown by a command that has already printed its own failure message. The CLI
// loop records it and exits 1 once every input has run, rather than aborting the
// batch at the first bad file.
export class CommandFailure extends Error {}

// Output path for an input when a batch writes beside each file. `suffix`
// carries the leading dot (".js", ".deref.json").
export const mirrorOutput = (input, suffix) => {
	const output = join(dirname(input), basename(input, extname(input)) + suffix);
	// `ajv transpile foo.js` would otherwise write over the file it just read.
	if (resolve(output) === resolve(input)) {
		throw new Error(`Refusing to overwrite ${input} with its own output`);
	}
	return output;
};

export const assertFile = async (filepath) => {
	const stats = await stat(filepath);
	if (!stats.isFile()) {
		throw new Error(`${filepath} is not a file`);
	}
};

// Turns CLI arguments into the list of files to process. The shell already
// expands `*.json` on POSIX, so this only has to cover what it cannot: `**`
// without globstar, cmd.exe/PowerShell (which never expand), and quoted
// patterns.
export const expandInputs = async (inputs) => {
	const files = [];
	for (const input of inputs) {
		let literal = false;
		try {
			literal = (await stat(input)).isFile();
		} catch {
			// Not on disk — fall through and read it as a pattern.
		}
		// A literal path wins over pattern interpretation: a real file named
		// "weird[1].json" must not silently resolve to "weird1.json".
		if (literal) {
			files.push(input);
			continue;
		}
		const matched = await Array.fromAsync(glob(input));
		// glob() yields nothing for an unmatched pattern. Left silent, a typo'd
		// pattern would "succeed" having checked no files at all.
		if (!matched.length) {
			throw new Error(`No files matched ${input}`);
		}
		files.push(...matched);
	}
	// `ajv validate *.json extra.json` may name the same file twice.
	return [...new Set(files)];
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
