// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import standaloneCode from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { compile, instance } from "./compile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultOptions = {
	code: {
		source: true, // required to create string of code
	},
};

// Formats from @silverbucket/ajv-formats-draft2019 that AJV standalone
// incorrectly references via ajv-formats/dist/formats.
const draft2019Formats = new Set([
	"iri",
	"idn-email",
	"idn-hostname",
	"iri-reference",
]);

// Injected (only when needed) ahead of the standalone code so the rewritten
// format references below resolve to the draft2019 implementations.
const draft2019FormatsHelper = `
var __ajvCmdDraft2019Formats = (() => {
	const Ajv = require("ajv/dist/2020.js").default;
	const ajvFormatsDraft2019 = require("@silverbucket/ajv-formats-draft2019").default;
	const ajv = new Ajv();
	ajvFormatsDraft2019(ajv);
	return ajv.formats;
})();
`;

const fixDraft2019FormatRequires = (code) => {
	let needsHelper = false;
	code = code.replaceAll(
		/require\("ajv-formats\/dist\/formats"\)\.fullFormats(?:\.(\w+)|\["([^"]+)"\])/g,
		(match, dotName, bracketName) => {
			const formatName = dotName ?? bracketName;
			if (draft2019Formats.has(formatName)) {
				needsHelper = true;
				return `__ajvCmdDraft2019Formats["${formatName}"]`;
			}
			return match;
		},
	);
	if (needsHelper) {
		code = draft2019FormatsHelper + code;
	}
	return code;
};

export const transpile = async (schema, options = {}) => {
	options = { ...defaultOptions, ...options };

	const ajv = instance(options);
	const validate = compile(schema, options);
	const js = fixDraft2019FormatRequires(standaloneCode(ajv, validate));

	// Build fully in memory: the standalone code goes in via stdin and the
	// bundle comes back via outputFiles — no temp files, so concurrent
	// transpile() calls can never race and read-only installs are fine.
	// resolveDir anchors esbuild's normal upward node_modules walk at this
	// package's own directory, which resolves the bare imports (ajv,
	// @silverbucket/ajv-formats-draft2019) in flat and hoisted layouts alike.
	const result = await build({
		stdin: { contents: js, resolveDir: __dirname, loader: "js" },
		platform: "node",
		format: "esm",
		bundle: true,
		minify: true,
		legalComments: "none",
		write: false,
	});

	return result.outputFiles[0].text;
};

export default transpile;
