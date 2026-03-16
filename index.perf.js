import test from "node:test";
import { Bench } from "tinybench";
import { compile, instance } from "./compile.js";
import sast from "./sast.js";
import transpile from "./transpile.js";
import validate from "./validate.js";

const time = Number(process.env.BENCH_TIME ?? 5_000);

const simpleSchema = {
	type: "object",
	properties: {
		name: { type: "string" },
		age: { type: "integer", minimum: 0 },
	},
	required: ["name"],
};

const validData = { name: "Alice", age: 30 };
const invalidData = { name: 123, age: "not a number" };

test("perf: instance creation", async () => {
	const bench = new Bench({ name: "instance creation", time });

	bench.add("instance()", () => {
		instance();
	});

	bench.add("instance({ allErrors: true })", () => {
		instance({ allErrors: true });
	});

	await bench.run();
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: compile", async () => {
	const bench = new Bench({ name: "compile", time });

	bench.add("compile(simpleSchema)", () => {
		compile(simpleSchema);
	});

	bench.add("compile(simpleSchema, { allErrors: true })", () => {
		compile(simpleSchema, { allErrors: true });
	});

	await bench.run();
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: validation", async () => {
	const bench = new Bench({ name: "validation", time });
	const fn = compile(simpleSchema, { allErrors: true });

	bench.add("validate valid data", () => {
		fn(validData);
	});

	bench.add("validate invalid data", () => {
		fn(invalidData);
	});

	await bench.run();
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: validate.test()", async () => {
	const bench = new Bench({ name: "validate.test()", time });

	bench.add("test(schema)", async () => {
		await validate(simpleSchema);
	});

	bench.add("test(schema, { testData })", async () => {
		await validate(simpleSchema, { testData: [validData] });
	});

	await bench.run();
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: sast", async () => {
	const bench = new Bench({ name: "sast", time });

	bench.add("sast() + validate(schema)", () => {
		const fn = sast();
		fn(simpleSchema);
	});

	await bench.run();
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: transpile", async () => {
	const bench = new Bench({ name: "transpile", time: time * 2 });

	bench.add("transpile(simpleSchema)", async () => {
		await transpile(simpleSchema);
	});

	await bench.run();
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});
