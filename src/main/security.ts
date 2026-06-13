import type { BrowserWindowConstructorOptions } from 'electron';

import { ALLOWED_IPC_CHANNELS } from '../shared/ipcChannels';
import type { SecurityDiagnostics } from '../shared/documentTypes';

export const SECURE_WEB_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  webviewTag: false,
  allowRunningInsecureContent: false
} satisfies NonNullable<BrowserWindowConstructorOptions['webPreferences']>;

const LOOPBACK_RENDERER_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function resolveTrustedRendererUrl(rawUrl: string | undefined, isPackaged: boolean): string | null {
  if (isPackaged || !rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    if (!LOOPBACK_RENDERER_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function createSecurityDiagnostics(): SecurityDiagnostics {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    webviewTag: false,
    allowedIpcChannels: [...ALLOWED_IPC_CHANNELS]
  };
}

export function createWebPreferences(
  preloadPath: string
): NonNullable<BrowserWindowConstructorOptions['webPreferences']> {
  return {
    ...SECURE_WEB_PREFERENCES,
    preload: preloadPath
  };
}
