import { generateAllDocs } from "~/src/helpers/generate-content";

async function main() {
	try {
		const result = await generateAllDocs();
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
