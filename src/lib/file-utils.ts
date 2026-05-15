import JSZip from "jszip";

/**
 * Parse a ZIP file and extract all text-based code files.
 * Returns an array of { path, content } objects.
 */
export async function parseZipFile(
  file: File
): Promise<Array<{ path: string; content: string }>> {
  const zip = await JSZip.loadAsync(file);
  const files: Array<{ path: string; content: string }> = [];

  const promises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    // Skip binary/large files
    if (isBinaryPath(relativePath)) return;

    promises.push(
      zipEntry.async("string").then((content) => {
        // Skip files that appear to be binary (contain null bytes)
        if (content.includes("\0")) return;
        // Skip very large files
        if (content.length > 100_000) return;

        // Remove top-level folder prefix if all files share one
        files.push({ path: relativePath, content });
      })
    );
  });

  await Promise.all(promises);

  // Strip common root folder prefix
  return stripCommonPrefix(files);
}

function isBinaryPath(path: string): boolean {
  const binaryExts = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".mp3", ".mp4", ".avi", ".mov", ".wav",
    ".exe", ".dll", ".so", ".dylib", ".o",
    ".pyc", ".class", ".jar",
    ".lock", ".lockb",
  ]);

  const ext = "." + path.split(".").pop()?.toLowerCase();
  return binaryExts.has(ext);
}

function stripCommonPrefix(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  if (files.length === 0) return files;

  const paths = files.map((f) => f.path.split("/"));
  
  // Find common prefix
  let prefixLen = 0;
  if (paths.length > 1) {
    outer: while (true) {
      const part = paths[0][prefixLen];
      if (!part) break;
      for (const p of paths) {
        if (p[prefixLen] !== part) break outer;
      }
      prefixLen++;
    }
  } else if (paths[0].length > 1) {
    prefixLen = 1; // Single-folder zip
  }

  if (prefixLen === 0) return files;

  return files.map((f) => ({
    ...f,
    path: f.path.split("/").slice(prefixLen).join("/"),
  }));
}

/**
 * Validate a GitHub URL
 */
export function isValidGithubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "github.com" &&
      parsed.pathname.split("/").filter(Boolean).length >= 2
    );
  } catch {
    return false;
  }
}

/**
 * Generate a unique session key
 */
export function generateSessionKey(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
