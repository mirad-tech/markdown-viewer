import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, test } from 'vitest';

import { resolveMarkdownImage } from './imageAccess';

async function createImageFixture(): Promise<{ documentPath: string; imagePath: string }> {
  const dir = join(tmpdir(), `md-viewer-image-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(join(dir, '资源 目录'), { recursive: true });
  const documentPath = join(dir, '文档.md');
  const imagePath = join(dir, '资源 目录', '示例 图片.png');
  await writeFile(documentPath, '![示例](资源%20目录/示例%20图片.png)', 'utf8');
  await writeFile(
    imagePath,
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lb7T2wAAAABJRU5ErkJggg==', 'base64')
  );
  return { documentPath, imagePath };
}

async function createBoundaryFixture(): Promise<{ documentPath: string; workspacePath: string }> {
  const dir = join(tmpdir(), `md-viewer-image-boundary-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const workspacePath = join(dir, 'workspace');
  await mkdir(join(workspacePath, 'docs'), { recursive: true });
  await mkdir(join(workspacePath, 'assets'), { recursive: true });
  await mkdir(join(dir, 'private'), { recursive: true });
  const documentPath = join(workspacePath, 'docs', 'entry.md');
  await writeFile(documentPath, '# Entry', 'utf8');
  await writeFile(join(workspacePath, 'assets', 'allowed.png'), Buffer.from('allowed-pixel'));
  await writeFile(join(dir, 'private', 'secret.png'), Buffer.from('secret-pixel'));
  return { documentPath, workspacePath };
}

describe('controlled local image access', () => {
  test('resolves a relative image with spaces to a data URL', async () => {
    const { documentPath } = await createImageFixture();

    const result = await resolveMarkdownImage(documentPath, '资源%20目录/示例%20图片.png');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mime).toBe('image/png');
    expect(result.src).toMatch(/^data:image\/png;base64,/);
  });

  test('returns a missing result for absent images', async () => {
    const { documentPath } = await createImageFixture();

    const result = await resolveMarkdownImage(documentPath, 'missing.png');

    expect(result).toEqual({
      ok: false,
      code: 'IMAGE_NOT_FOUND',
      message: '图片不存在或已被移动。'
    });
  });

  test('rejects external, absolute, and unsupported image sources', async () => {
    const { documentPath } = await createImageFixture();

    await expect(resolveMarkdownImage(documentPath, 'https://example.com/a.png')).resolves.toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_IMAGE_SOURCE'
    });
    await expect(resolveMarkdownImage(documentPath, 'C:/Windows/win.ini')).resolves.toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_IMAGE_SOURCE'
    });
    await expect(resolveMarkdownImage(documentPath, 'icon.svg')).resolves.toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_IMAGE_TYPE'
    });
  });

  test('rejects decoded traversal outside a standalone document directory', async () => {
    const { documentPath } = await createBoundaryFixture();

    await expect(resolveMarkdownImage(documentPath, '../../private/secret.png')).resolves.toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_IMAGE_SOURCE'
    });
    await expect(resolveMarkdownImage(documentPath, '%2e%2e/%2e%2e/private/secret.png')).resolves.toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_IMAGE_SOURCE'
    });
  });

  test('allows relative images inside an authorized workspace directory', async () => {
    const { documentPath, workspacePath } = await createBoundaryFixture();

    const result = await resolveMarkdownImage(documentPath, '../assets/allowed.png', {
      allowedDirectories: [workspacePath]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.src).toMatch(/^data:image\/png;base64,/);
  });

  test('does not let a standalone document borrow another authorized workspace boundary', async () => {
    const dir = join(tmpdir(), `md-viewer-image-cross-boundary-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const workspacePath = join(dir, 'workspace');
    await mkdir(join(dir, 'docs'), { recursive: true });
    await mkdir(join(workspacePath, 'assets'), { recursive: true });
    const documentPath = join(dir, 'docs', 'entry.md');
    await writeFile(documentPath, '# Entry', 'utf8');
    await writeFile(join(workspacePath, 'assets', 'secret.png'), Buffer.from('secret-pixel'));

    await expect(resolveMarkdownImage(documentPath, '../workspace/assets/secret.png', {
      allowedDirectories: [workspacePath]
    })).resolves.toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_IMAGE_SOURCE'
    });
  });

  test('rejects images over the configured file size limit', async () => {
    const { documentPath } = await createImageFixture();

    const result = await resolveMarkdownImage(documentPath, '资源%20目录/示例%20图片.png', {
      maxBytes: 4
    });

    expect(result).toEqual({
      ok: false,
      code: 'IMAGE_TOO_LARGE',
      message: '图片过大，已跳过。'
    });
  });
});
