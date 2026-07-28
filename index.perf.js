import { ok } from "node:assert";
import test from "node:test";
import { Bench } from "tinybench";
import { compile, instance } from "./compile.js";
import sast from "./sast.js";
import transpile from "./transpile.js";
import validate from "./validate.js";

const time = Number(process.env.BENCH_TIME ?? 5_000);
const fastTime = Number(process.env.BENCH_FAST_TIME ?? 100);

// A benchmark that throws or yields zero throughput is a regression, not a
// "pass". Fail the test instead of only printing a table.
const assertHealthy = (bench) => {
	ok(bench.tasks.length > 0, `${bench.name}: no tasks ran`);
	for (const task of bench.tasks) {
		ok(!task.result?.error, `${bench.name}: "${task.name}" threw`);
		ok(
			(task.result?.throughput?.mean ?? 0) > 0,
			`${bench.name}: "${task.name}" produced no throughput`,
		);
	}
};

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
	assertHealthy(bench);
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
	assertHealthy(bench);
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: validation", async () => {
	const bench = new Bench({ name: "validation", time: fastTime });
	const fn = compile(simpleSchema, { allErrors: true });

	bench.add("validate valid data", () => {
		fn(validData);
	});

	bench.add("validate invalid data", () => {
		fn(invalidData);
	});

	await bench.run();
	assertHealthy(bench);
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
	assertHealthy(bench);
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: sast", async () => {
	const bench = new Bench({ name: "sast", time: fastTime });

	bench.add("sast() + validate(schema)", () => {
		const fn = sast();
		fn(simpleSchema);
	});

	await bench.run();
	assertHealthy(bench);
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});

test("perf: transpile", async () => {
	const bench = new Bench({ name: "transpile", time: time * 2 });

	bench.add("transpile(simpleSchema)", async () => {
		await transpile(simpleSchema);
	});

	await bench.run();
	assertHealthy(bench);
	console.log(`\n${bench.name}`);
	console.table(bench.table());
});
