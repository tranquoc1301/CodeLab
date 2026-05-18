import type * as monaco from "monaco-editor";
import type { Language } from "@/shared/types";

export const FILE_EXTENSIONS: Record<Language, string> = {
  python3: ".py",
  java: ".java",
  cpp: ".cpp",
  c: ".c",
};

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
