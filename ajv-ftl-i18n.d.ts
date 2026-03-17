// Copyright 2026 will Farrell, and ajv-cmd contributors.
// SPDX-License-Identifier: MIT
declare module "ajv-ftl-i18n" {
	export function transpile(
		ftl: string,
		options?: Record<string, unknown>,
	): string;
	const _default: {
		transpile: typeof transpile;
		[locale: string]: unknown;
	};
	export default _default;
}
