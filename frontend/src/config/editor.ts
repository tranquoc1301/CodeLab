import type * as monaco from "monaco-editor";

export const EDITOR = {
  HEIGHT: "450px",
  FONT_SIZE: 14,
  THEME: {
    dark: "vs-dark",
    light: "light",
  } as Record<string, string>,
  OPTIONS: {
    minimap: { enabled: false },
    lineNumbers: "on" as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 12 },
  } satisfies monaco.editor.IStandaloneEditorConstructionOptions,
} as const;
