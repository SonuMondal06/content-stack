import { promises as fs } from "node:fs";
import path from "node:path";
import {
	APIS_DIR,
	GITHUB_ROOT,
	GENERATE_CONTENT_DIR,
	SPECS_DIR,
} from "@/constants";
import { generateFiles } from "fumadocs-openapi";
import { updateMdxUrls, findMdxFiles } from "./resolve-openapi-url";

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
			// Store only the relative path from GENERATE_CONTENT_DIR
			arrayOfFiles.push(
				path.relative(path.join(process.cwd(), GENERATE_CONTENT_DIR), filePath),
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
 * Creates a GitHub raw URL for a spec file
 */
function createGithubRawUrl(relativePath: string): string {
	// Convert github.com URL to raw.githubusercontent.com
	// From: https://github.com/owner/repo/blob/main/path
	// To: https://raw.githubusercontent.com/owner/repo/main/path
	return `${GITHUB_ROOT}/${SPECS_DIR}/${relativePath}`;
}

/**
 * Moves a file from generate-content to specs directory
 */
async function moveToSpecs(relativePath: string): Promise<void> {
	const sourcePath = path.join(GENERATE_CONTENT_DIR, relativePath);
	const targetPath = path.join(SPECS_DIR, relativePath);

	// Ensure the target directory exists
	await ensureDirectoryExists(path.dirname(targetPath));

	// Move the file
	await fs.rename(sourcePath, targetPath);
}

/**
 * Generates documentation for a single file and moves it to specs
 */
export async function generateDocForFile(
	relativePath: string,
	per: "file" | "operation" | "tag" | undefined,
): Promise<void> {
	// Get the file name without extension to use as subdirectory
	const fileName = path.basename(relativePath, path.extname(relativePath));
	const dirName = path.dirname(relativePath);
	const outputDir = path.join(APIS_DIR, dirName, fileName);

	// Create GitHub raw URL for the spec file using the constants
	const githubRawUrl = createGithubRawUrl(relativePath);

	// Get the local input file for generation
	const inputFile = path.join(SPECS_DIR, relativePath);

	// Ensure the output directory exists
	await ensureDirectoryExists(outputDir);

	try {
		// Move the file to specs directory
		await moveToSpecs(relativePath);

		// Generate the documentation
		await generateFiles({
			input: [inputFile],
			output: outputDir,
			per,
			frontmatter: (title, description) => ({
				title,
				description,
				full: true,
				document: githubRawUrl,
			}),
		});
	} catch (error) {
		throw new Error(`Failed to process file ${relativePath}: ${error}`);
	}
}

/**
 * Main function to generate all documentation
 */
export async function generateAllDocs(
	per: "file" | "operation" | "tag" | undefined,
): Promise<GenerateResult> {
	try {
		// Ensure all required directories exist
		await ensureDirectoryExists(GENERATE_CONTENT_DIR);
		await ensureDirectoryExists(SPECS_DIR);
		await ensureDirectoryExists(APIS_DIR);

		// Get all files with relative paths from generate-content
		const relativeFiles = await getAllFiles(GENERATE_CONTENT_DIR);

		// Generate documentation and move files for each spec
		for (const file of relativeFiles) {
			await generateDocForFile(file, per);
		}

		// After generating all docs, update the URLs in MDX files
		const mdxFiles = await findMdxFiles(APIS_DIR);
		await updateMdxUrls(mdxFiles);

		return {
			files: relativeFiles,
			message:
				"Documentation generated successfully and moved to specs directory",
		};
	} catch (error) {
		throw new Error(`Failed to generate documentation: ${error?.toString()}`);
	}
}
