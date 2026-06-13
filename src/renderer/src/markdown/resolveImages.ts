import type { ImageResolutionResult } from '../../../shared/documentTypes';

export type ImageResolutionMap = Record<string, ImageResolutionResult>;
export type LocalImageResolutionGroup = {
  normalizedSource: string;
  sources: string[];
};

export const MAX_LOCAL_IMAGE_SOURCES = 80;
export const LOCAL_IMAGE_RESOLUTION_CONCURRENCY = 4;

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

export function normalizeLocalImageSource(source: string): string {
  return decodePath(removeUrlSuffix(source.trim()));
}

export function collectLocalImageResolutionGroups(
  html: string,
  maxGroups = MAX_LOCAL_IMAGE_SOURCES
): LocalImageResolutionGroup[] {
  const template = document.createElement('template');
  template.innerHTML = html;

  const groups = new Map<string, string[]>();
  const limit = Math.max(0, Math.floor(maxGroups));
  const images = Array.from(template.content.querySelectorAll<HTMLImageElement>('img[data-local-src]'));

  for (const image of images) {
    const source = image.getAttribute('data-local-src') ?? '';
    const normalizedSource = normalizeLocalImageSource(source);
    if (normalizedSource.length === 0) continue;

    const existingSources = groups.get(normalizedSource);
    if (existingSources) {
      existingSources.push(source);
      continue;
    }

    if (groups.size >= limit) continue;
    groups.set(normalizedSource, [source]);
  }

  return Array.from(groups, ([normalizedSource, sources]) => ({ normalizedSource, sources }));
}

export async function resolveImageGroupsWithLimit(
  groups: LocalImageResolutionGroup[],
  resolveSource: (source: string) => Promise<ImageResolutionResult>,
  concurrency = LOCAL_IMAGE_RESOLUTION_CONCURRENCY,
  isCanceled: () => boolean = () => false
): Promise<ImageResolutionMap> {
  const resolutions: ImageResolutionMap = {};
  const workerCount = Math.min(groups.length, Math.max(1, Math.floor(concurrency)));
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (!isCanceled()) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= groups.length) return;

      const group = groups[index];
      const resolution = await resolveSource(group.normalizedSource);
      for (const source of group.sources) {
        resolutions[source] = resolution;
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return resolutions;
}

export function applyImageResolutions(html: string, resolutions: ImageResolutionMap): string {
  const template = document.createElement('template');
  template.innerHTML = html;

  const images = Array.from(template.content.querySelectorAll<HTMLImageElement>('img[data-local-src]'));

  for (const image of images) {
    const source = image.getAttribute('data-local-src') ?? '';
    const resolution = resolutions[source];

    if (!resolution) {
      image.removeAttribute('src');
      continue;
    }

    if (resolution.ok) {
      image.setAttribute('src', resolution.src);
      image.setAttribute('loading', 'lazy');
      image.setAttribute('decoding', 'async');
      continue;
    }

    const placeholder = document.createElement('span');
    placeholder.className = 'image-placeholder';
    placeholder.setAttribute('data-testid', 'missing-image');
    placeholder.textContent = `图片缺失：${source}`;
    image.replaceWith(placeholder);
  }

  return template.innerHTML;
}
