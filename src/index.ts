import { generateAllDocs } from "~/src/helpers/generate-content";

type PerOption = "file" | "operation" | "tag";

function isValidPerOption(value: string): value is PerOption {
	return ["file", "operation", "tag"].includes(value);
}

async function main() {
	const args = process.argv.slice(2);
	const per = args[0];

	if (per && !isValidPerOption(per)) {
		// biome-ignore lint/suspicious/noConsoleLog lint/suspicious/noConsole: Valid use case
		console.error('Error: "per" must be one of: file, operation, or tag');
		process.exit(1);
	}

	try {
		const result = await generateAllDocs(per as PerOption | undefined);
		// biome-ignore lint/suspicious/noConsoleLog lint/suspicious/noConsole: Valid use case
		console.log("Documentation generation:", result.message);
		// biome-ignore lint/suspicious/noConsoleLog lint/suspicious/noConsole: Valid use case
		console.log("Generated files:", result.files);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsoleLog lint/suspicious/noConsole: Valid use case
		console.error("Documentation generation failed:", error);
		process.exit(1);
	}
}

main();
