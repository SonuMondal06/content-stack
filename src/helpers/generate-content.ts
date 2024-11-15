import { promises as fs } from "node:fs";
import path from "node:path";
import { APIS_DIR, GITHUB_ROOT, SPECS_DIR } from "@/constants";
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
 * Creates a GitHub raw URL for a spec file
 */
function createGithubRawUrl(relativePath: string): string {
	// Convert github.com URL to raw.githubusercontent.com
	// From: https://github.com/owner/repo/blob/main/path
	// To: https://raw.githubusercontent.com/owner/repo/main/path
	return `${GITHUB_ROOT}/${SPECS_DIR}/${relativePath}`;
}

/**
 * Generates documentation for a single file
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

	// Generate the documentation
	await generateFiles({
		input: [inputFile], // Use local file for generation
		output: outputDir,
		per,
		// Modify the frontmatter to include the remote URL
		frontmatter: (title, description) => ({
			title,
			description,
			full: true,
			document: githubRawUrl, // This will be used by APIPage when deployed
		}),
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

		// After generating all docs, update the URLs in MDX files
		const mdxFiles = await findMdxFiles(APIS_DIR);
		await updateMdxUrls(mdxFiles);

		return {
			files: relativeFiles,
			message: "Documentation generated successfully with GitHub URLs",
		};
	} catch (error) {
		throw new Error(`Failed to generate documentation: ${error?.toString()}`);
	}
}
