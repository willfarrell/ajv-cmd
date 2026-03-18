// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import standaloneCode from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { compile, instance } from "./compile.js";

// required to ensure node_modules can be found
const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultOptions = {
	code: {
		esm: true,
		source: true, // required to create string of code
	},
};

// Formats from @silverbucket/ajv-formats-draft2019 that AJV standalone
// incorrectly references via ajv-formats/dist/formats
const draft2019Formats = new Set(["iri", "idn-email", "idn-hostname", "iri-reference"]);

const fixDraft2019FormatRequires = (code) => {
	return code.replaceAll(
		/require\("ajv-formats\/dist\/formats"\)\.fullFormats(?:\.(\w+)|\["([^"]+)"\])/g,
		(match, dotName, bracketName) => {
			const formatName = dotName ?? bracketName;
			if (draft2019Formats.has(formatName)) {
				return `require("./formats-draft2019-bridge.cjs").fullFormats["${formatName}"]`;
			}
			return match;
		},
	);
};

export const transpile = async (schema, options = {}) => {
	options = { ...defaultOptions, ...options };

	const ajv = instance(options);
	const validate = compile(schema, options);
	let js = standaloneCode(ajv, validate);
	js = fixDraft2019FormatRequires(js);

	const file = join(__dirname, `${randomBytes(16).toString("hex")}.js`);
	await writeFile(file, js, "utf8");

	await build({
		entryPoints: [file],
		platform: "node",
		format: "esm",
		bundle: true,
		minify: true,
		legalComments: "none",
		allowOverwrite: true,
		outfile: file,
	});

	js = await readFile(file, { encoding: "utf8" });
	await unlink(file);

	return js;
};

export default transpile;
