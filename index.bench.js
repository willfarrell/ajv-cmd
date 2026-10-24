import { bench, suite } from "node:bench";
import { compile, instance } from "./compile.js";
import sast from "./sast.js";
import transpile from "./transpile.js";
import validate from "./validate.js";

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

const options = { warmup: 10, samples: 30 };
const fastOptions = { warmup: 100, samples: 30 };

suite("ajv-cmd", () => {
	bench("instance()", options, (b) => {
		const ops = 100;
		b.start();
		for (let i = 0; i < ops; i++) instance();
		b.end(ops);
	});

	bench("instance({ allErrors: true })", options, (b) => {
		const ops = 100;
		b.start();
		for (let i = 0; i < ops; i++) instance({ allErrors: true });
		b.end(ops);
	});

	bench("compile(simpleSchema)", options, (b) => {
		const ops = 100;
		b.start();
		for (let i = 0; i < ops; i++) compile(simpleSchema);
		b.end(ops);
	});

	bench("compile(simpleSchema, { allErrors: true })", options, (b) => {
		const ops = 100;
		b.start();
		for (let i = 0; i < ops; i++) compile(simpleSchema, { allErrors: true });
		b.end(ops);
	});

	const fn = compile(simpleSchema, { allErrors: true });

	bench("validate valid data", fastOptions, (b) => {
		const ops = 10_000;
		b.start();
		for (let i = 0; i < ops; i++) fn(validData);
		b.end(ops);
	});

	bench("validate invalid data", fastOptions, (b) => {
		const ops = 10_000;
		b.start();
		for (let i = 0; i < ops; i++) fn(invalidData);
		b.end(ops);
	});

	bench("test(schema)", options, async (b) => {
		const ops = 100;
		b.start();
		for (let i = 0; i < ops; i++) await validate(simpleSchema);
		b.end(ops);
	});

	bench("test(schema, { testData })", options, async (b) => {
		const ops = 100;
		b.start();
		for (let i = 0; i < ops; i++) {
			await validate(simpleSchema, { testData: [validData] });
		}
		b.end(ops);
	});

	bench("sast() + validate(schema)", options, (b) => {
		const ops = 100;
		b.start();
		for (let i = 0; i < ops; i++) sast()(simpleSchema);
		b.end(ops);
	});

	bench("transpile(simpleSchema)", options, async (b) => {
		const ops = 10;
		b.start();
		for (let i = 0; i < ops; i++) await transpile(simpleSchema);
		b.end(ops);
	});
});
