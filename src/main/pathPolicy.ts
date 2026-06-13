import { dirname, isAbsolute, relative, resolve } from 'node:path';

export type LocalResourceAccessOptions = {
  allowedDirectories?: readonly string[];
};

export function normalizePath(filePath: string): string {
  return resolve(filePath).replace(/\\/g, '/').toLowerCase();
}

export function isPathInsideDirectory(childPath: string, parentDir: string): boolean {
  const normalizedChild = normalizePath(childPath);
  const normalizedParent = normalizePath(parentDir);

  if (normalizedChild === normalizedParent) {
    return true;
  }

  const relativePath = relative(normalizedParent, normalizedChild);
  return !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

export function isPathAllowedForDocumentResource(
  documentPath: string,
  targetPath: string,
  allowedDirectories: readonly string[] = []
): boolean {
  const documentDirectory = dirname(resolve(documentPath));
  if (isPathInsideDirectory(targetPath, documentDirectory)) {
    return true;
  }

  return allowedDirectories.some(
    (directory) => isPathInsideDirectory(documentPath, directory) && isPathInsideDirectory(targetPath, directory)
  );
}

export function resolveDocumentRelativePath(
  documentPath: string,
  relativePath: string,
  allowedDirectories: readonly string[] = []
): string | null {
  const targetPath = resolve(dirname(resolve(documentPath)), relativePath);
  if (!isPathAllowedForDocumentResource(documentPath, targetPath, allowedDirectories)) {
    return null;
  }
  return targetPath;
}
