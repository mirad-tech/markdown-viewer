import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute } from 'node:path';

import type { ImageResolutionResult } from '../shared/documentTypes';
import { resolveDocumentRelativePath, type LocalResourceAccessOptions } from './pathPolicy';

const MIME_BY_EXTENSION = new Map<string, string>([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.bmp', 'image/bmp']
]);

export const DEFAULT_MAX_MARKDOWN_IMAGE_BYTES = 10 * 1024 * 1024;

export type MarkdownImageAccessOptions = LocalResourceAccessOptions & {
  maxBytes?: number;
};

function hasProtocol(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

function removeUrlSuffix(value: string): string {
  return value.split(/[?#]/, 1)[0];
}

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function resolveMarkdownImage(
  documentPath: unknown,
  rawSrc: unknown,
  options: MarkdownImageAccessOptions = {}
): Promise<ImageResolutionResult> {
  if (typeof documentPath !== 'string' || documentPath.trim() === '') {
    return {
      ok: false,
      code: 'INVALID_ARGUMENT',
      message: '文件路径无效。'
    };
  }

  if (typeof rawSrc !== 'string' || rawSrc.trim() === '') {
    return {
      ok: false,
      code: 'INVALID_ARGUMENT',
      message: '图片路径无效。'
    };
  }

  const trimmedSrc = rawSrc.trim();
  const cleanedSrc = removeUrlSuffix(trimmedSrc);
  const decodedSrc = decodePath(cleanedSrc);

  if (hasProtocol(decodedSrc) || isAbsolute(decodedSrc)) {
    return {
      ok: false,
      code: 'UNSUPPORTED_IMAGE_SOURCE',
      message: '仅支持当前 Markdown 文件旁的相对路径图片。'
    };
  }

  const extension = extname(decodedSrc).toLowerCase();
  const mime = MIME_BY_EXTENSION.get(extension);
  if (!mime) {
    return {
      ok: false,
      code: 'UNSUPPORTED_IMAGE_TYPE',
      message: '不支持该图片类型。'
    };
  }

  const imagePath = resolveDocumentRelativePath(documentPath, decodedSrc, options.allowedDirectories);
  if (!imagePath) {
    return {
      ok: false,
      code: 'UNSUPPORTED_IMAGE_SOURCE',
      message: '仅支持当前 Markdown 文件旁的相对路径图片。'
    };
  }

  try {
    const info = await stat(imagePath);
    if (!info.isFile()) {
      return {
        ok: false,
        code: 'IMAGE_NOT_FOUND',
        message: '图片不存在或已被移动。'
      };
    }

    const maxBytes = Math.max(0, Math.floor(options.maxBytes ?? DEFAULT_MAX_MARKDOWN_IMAGE_BYTES));
    if (info.size > maxBytes) {
      return {
        ok: false,
        code: 'IMAGE_TOO_LARGE',
        message: '图片过大，已跳过。'
      };
    }

    const content = await readFile(imagePath);
    return {
      ok: true,
      mime,
      src: `data:${mime};base64,${content.toString('base64')}`
    };
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return {
        ok: false,
        code: 'IMAGE_NOT_FOUND',
        message: '图片不存在或已被移动。'
      };
    }

    return {
      ok: false,
      code: 'IMAGE_READ_FAILED',
      message: '无法读取图片，请检查权限或文件状态。'
    };
  }
}
