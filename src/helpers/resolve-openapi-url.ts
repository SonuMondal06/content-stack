import { promises as fs } from "node:fs";
import path from "node:path";
import { GITHUB_ROOT } from "@/constants";

/**
 * Creates a GitHub raw URL for a spec file
 */
function createGithubRawUrl(relativePath: string): string {
	return `${GITHUB_ROOT}/${relativePath}`;
}

/**
 * Updates document URLs in an MDX file to use GitHub raw URLs
 */
async function updateMdxFile(filePath: string): Promise<void> {
	try {
		// Read the MDX file
		const content = await fs.readFile(filePath, "utf-8");

		// Create regex patterns to match both frontmatter and APIPage document props
		const frontmatterPattern = /document:\s*(['"])(.*?)\1/g;
		const apiPagePattern = /document={['"]([^'"]+)['"]}/g;

		// Function to replace relative paths with GitHub raw URLs
		const replaceWithGithubUrl = (
			_match: string,
			quote: string,
			path: string,
		) => {
			// Only replace if it's a relative path
			if (path.startsWith("http")) {
				return _match;
			}
			return `document:${quote}${createGithubRawUrl(path)}${quote}`;
		};

		const apiPageReplacer = (_match: string, path: string) => {
			// Only replace if it's a relative path
			if (path.startsWith("http")) {
				return _match;
			}
			return `document="${createGithubRawUrl(path)}"`;
		};

		// Replace both in frontmatter and APIPage component
		const updatedContent = content
			.replace(frontmatterPattern, replaceWithGithubUrl)
			.replace(apiPagePattern, apiPageReplacer);

		// Write the updated content back to the file
		await fs.writeFile(filePath, updatedContent, "utf-8");
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: For Debugging
		console.error(`Error updating MDX file ${filePath}:`, error);
		throw error;
	}
}

/**
 * Updates all MDX files in the given list to use GitHub raw URLs
 */
export async function updateMdxUrls(mdxFiles: string[]): Promise<void> {
	try {
		const updatePromises = mdxFiles.map(async (filePath) => {
			const fullPath = path.join(process.cwd(), filePath);
			await updateMdxFile(fullPath);
		});

		await Promise.all(updatePromises);
		// biome-ignore lint/suspicious/noConsole lint/suspicious/noConsoleLog: For Debugging
		console.log("Successfully updated GitHub URLs in MDX files");
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: For Debugging
		console.error("Failed to update MDX files:", error);
		throw error;
	}
}

/**
 * Finds all MDX files in a directory recursively
 */
export async function findMdxFiles(dirPath: string): Promise<string[]> {
	const mdxFiles: string[] = [];
	const fullPath = path.join(process.cwd(), dirPath);

	try {
		const entries = await fs.readdir(fullPath, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = path.join(dirPath, entry.name);

			if (entry.isDirectory()) {
				const nestedFiles = await findMdxFiles(entryPath);
				mdxFiles.push(...nestedFiles);
			} else if (entry.name.endsWith(".mdx")) {
				mdxFiles.push(entryPath);
			}
		}
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: For Debugging
		console.error(`Error reading directory ${dirPath}:`, error);
		throw error;
	}

	return mdxFiles;
}
