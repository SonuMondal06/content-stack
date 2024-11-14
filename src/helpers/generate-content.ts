import { promises as fs } from "node:fs";
import path from "node:path";
import { APIS_DIR, SPECS_DIR } from "@/constants";
import { generateFiles } from "fumadocs-openapi";

interface GenerateResult {
	files: string[];
	message: string;
}

/**
 * Recursively gets all files from a directory
 */
export async function getAllFiles(
	dirPath: string,
	arrayOfFiles: string[] = [],
): Promise<string[]> {
	const fullPath = path.join(process.cwd(), dirPath);

	const files = await fs.readdir(fullPath);

	for (const file of files) {
		const filePath = path.join(fullPath, file);
		const stat = await fs.stat(filePath);

		if (stat.isDirectory()) {
			await getAllFiles(path.relative(process.cwd(), filePath), arrayOfFiles);
		} else {
			// Store only the relative path from SPECS_DIR
			arrayOfFiles.push(
				path.relative(path.join(process.cwd(), SPECS_DIR), filePath),
			);
		}
	}

	return arrayOfFiles;
}

/**
 * Ensures a directory exists, creates it if it doesn't
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
	const fullPath = path.join(process.cwd(), dirPath);
	try {
		await fs.access(fullPath);
	} catch {
		await fs.mkdir(fullPath, { recursive: true });
	}
}

/**
 * Generates documentation for a single file
 */
export async function generateDocForFile(
	relativePath: string,
	per: "file" | "operation" | "tag" | undefined,
): Promise<void> {
	// Get the full input path
	const inputFile = path.join(process.cwd(), SPECS_DIR, relativePath);

	// Get the directory name from the relative path
	const dirName = path.dirname(relativePath);

	// Get the file name without extension to use as subdirectory
	const fileName = path.basename(relativePath, path.extname(relativePath));

	// Create the output directory path including the file name as a subdirectory
	const outputDir = path.join(APIS_DIR, dirName, fileName);

	// Ensure the output directory exists
	await ensureDirectoryExists(outputDir);

	// Generate the documentation
	await generateFiles({
		input: [inputFile],
		output: outputDir,
		per,
	});
}

/**
 * Main function to generate all documentation
 */
export async function generateAllDocs(
	per: "file" | "operation" | "tag" | undefined,
): Promise<GenerateResult> {
	try {
		// Ensure base directories exist
		await ensureDirectoryExists(SPECS_DIR);
		await ensureDirectoryExists(APIS_DIR);

		// Get all files with relative paths
		const relativeFiles = await getAllFiles(SPECS_DIR);

		// Generate documentation for each file
		for (const file of relativeFiles) {
			await generateDocForFile(file, per);
		}

		return {
			files: relativeFiles,
			message: "Documentation generated successfully",
		};
	} catch (error) {
		throw new Error(`Failed to generate documentation: ${error?.toString()}`);
	}
}
