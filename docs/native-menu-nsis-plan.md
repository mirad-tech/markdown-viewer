# Native Menu, PDF Export, and NSIS Installer Plan

## Product Framing

- Target user: Windows users who read and lightly edit local Markdown documents.
- Use case: open `.md` / `.markdown` files, navigate folders and outlines, edit/save content, export the current document as PDF, and install the app as a normal desktop program.
- Business goal: make the app feel like a dependable native Markdown reader instead of a web page wrapped in Electron.
- Primary workflow: open a document or folder, read/edit, use native menu commands for file/view actions, save or export to PDF, and optionally set file associations during installation.
- Success criteria: no web toolbar remains, native `File / Edit / View / Window` menus drive the app, PDF export uses a save dialog and silent background generation, and Windows packaging produces an assisted NSIS installer.
- Trust signals: file operations remain IPC-gated, renderer keeps sandbox/context isolation, print export hides application chrome, and installer choices are explicit.

## External References Applied

- Electron menu: `Menu.setApplicationMenu` sets the application/window top menu on Windows/Linux and accepts templates via `Menu.buildFromTemplate`.
- Electron PDF export: `webContents.printToPDF({ printBackground: true })` returns PDF data that can be written after a save dialog.
- electron-builder NSIS: `oneClick: false` enables assisted installation; `allowToChangeInstallationDirectory` controls path selection; `displayLanguageSelector` controls the language dialog; `include` points to `build/installer.nsh`.
- Typora behavior reference: `File -> Export` contains built-in PDF export, and sidebar/open commands live in the native menu rather than a web toolbar.

## Menu and Renderer Action Mapping

| Menu | Item | Accelerator | IPC action | Renderer behavior |
| --- | --- | --- | --- | --- |
| File | Open File | `Ctrl+O` | `open-file` | call `openMarkdownFile()` |
| File | Open Folder | `Ctrl+Shift+O` | `open-folder` | call `openWorkspaceFolder()` and show workspace sidebar |
| File | Save | `Ctrl+S` | `save-document` | call `saveCurrentDocument()` when a document is open |
| File | Export as PDF | `Ctrl+Shift+P` | `export-pdf` | call `window.mdViewer.exportToPdf()` after committing quick edit state |
| File | Open in Default Editor | `Ctrl+Shift+E` | `open-default-editor` | call `openCurrentInDefaultEditor()` |
| File | Close Document | `Ctrl+W` | `close-document` | confirm unsaved changes, then return to empty state |
| Edit | Find | `Ctrl+F` | `focus-search` | open/focus the document search field |
| Edit | Command Palette | `Ctrl+K` | `open-command-palette` | open existing command palette |
| Edit | native roles | platform defaults | none | use Electron roles for undo/cut/copy/paste/select all |
| View | Toggle Sidebar | `Ctrl+B` | `toggle-sidebar` | call `toggleSidebar()` |
| View | Source Edit | `Ctrl+E` | `toggle-source-edit` | toggle `read` / `source-edit` |
| View | Toggle Theme | `Ctrl+D` | `toggle-theme` | switch light/dark theme |
| View | File Info | `Ctrl+I` | `show-file-info` | open file metadata modal |
| View | Settings | `Ctrl+,` | `open-settings` | load diagnostics and open settings drawer |
| Window | Minimize / Close | platform defaults | none | use Electron roles |

## IPC and Preload Shape

- Add `MENU_ACTION: 'menu-action'` and `EXPORT_TO_PDF: 'export-to-pdf'` to `src/shared/ipcChannels.ts`.
- Add `onMenuAction(callback): () => void` to preload using `ipcRenderer.on` and cleanup through `ipcRenderer.removeListener`.
- Add `exportToPdf(): Promise<{ ok: boolean; message?: string }>` to preload using `ipcRenderer.invoke`.
- Keep all action identifiers as strings in the renderer to match the requested API, with a local action union where useful for safety.

## Main Process Design

- Create a focused menu helper in `src/main/nativeMenu.ts`.
- Menu helper takes `BrowserWindow` and sends `IPC_CHANNELS.MENU_ACTION` to `window.webContents`.
- Register the menu after `BrowserWindow` creation so accelerators are native and visible.
- PDF export handler lives in `src/main/pdfExport.ts` and is registered from `registerIpcHandlers`.
- Export result contract: `{ ok: true }`, `{ ok: false, message: '已取消导出。' }`, or `{ ok: false, message: 'PDF 导出失败。' }`.

## Renderer Layout Design

- Remove `<header className="toolbar">` and toolbar-only CSS.
- Keep the document, sidebar, status bar, drawers, and command palette.
- Move search to a compact floating find bar that opens through `focus-search`; reuse existing labels and search state.
- Replace the print preview modal with menu-driven silent PDF export.
- Add print CSS that hides sidebar, status bar, modals, find bar, and editor chrome during PDF generation.

## NSIS Installer Design

- Change Windows target from `portable` to `nsis`.
- Add file associations for `md` and `markdown`.
- Use assisted installer options:
  - `oneClick: false`
  - `allowToChangeInstallationDirectory: true`
  - `multiLanguageInstaller: true`
  - `displayLanguageSelector: true`
  - `createDesktopShortcut: true`
  - `createStartMenuShortcut: true`
  - `runAfterFinish: true`
  - `include: "build/installer.nsh"`
- Implement `build/installer.nsh` with a custom option variable and install/uninstall macros so Markdown association can be selected during installation and cleaned during uninstall.
- Keep `dist:win:portable` available only if a later compatibility script is needed; default `npm run dist` must generate NSIS.

## Phase File Plan

- Phase 1: create this design draft.
- Phase 2: modify `src/shared/ipcChannels.ts`, `src/shared/ipcChannels.test.ts`, `src/preload/index.ts`, `src/preload/types.ts`, `src/renderer/src/global.d.ts` if needed.
- Phase 3: create `src/main/nativeMenu.ts`, `src/main/nativeMenu.test.ts`, `src/main/pdfExport.ts`, `src/main/pdfExport.test.ts`; modify `src/main/index.ts`, `src/main/ipc.ts`.
- Phase 4: modify `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`; update affected e2e tests to use menu/keyboard flows.
- Phase 5: modify `package.json`, `tests/stage8/packaging.test.ts`, `README.md`; create `build/installer.nsh`.
- Phase 6: tune `@media print`, run final verification, and write `docs/native-menu-nsis-walkthrough.md`.

## Verification Plan

- After every phase: run the narrow tests for changed behavior plus `npm run typecheck`.
- After packaging phase: run `npm run test:stage8` and `npm run dist`.
- Final pass: run `npm test`; run targeted e2e where practical after rebuilding; inspect generated release artifacts.
