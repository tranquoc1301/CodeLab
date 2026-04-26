import { memo } from "react";
import Editor from "@monaco-editor/react";
import { useThemeStore } from "@/app/store/theme";
import { cn } from "@/shared/utils/utils";
import {EDITOR} from "@/shared/config";
import type { Language } from "@/shared/types/language";

interface CodeEditorProps {
  language: Language;
  value: string;
  onChange: (value: string | undefined) => void;
}

/**
 * Maps internal Language types to Monaco editor language identifiers.
 */
const LANGUAGE_MAP: Record<Language, string> = {
  python3: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
} as const;

/**
 * Monaco Editor wrapper with theme support.
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */
const CodeEditor = memo(function CodeEditor({
  language,
  value,
  onChange,
}: CodeEditorProps) {
  const theme = useThemeStore((s) => s.theme);

  return (
    <div className={cn("overflow-hidden h-full")}>
      <Editor
        height="100%"
        language={LANGUAGE_MAP[language]}
        value={value}
        theme={EDITOR.THEME[theme]}
        onChange={onChange}
        options={{
          ...EDITOR.OPTIONS,
          fontSize: EDITOR.FONT_SIZE,
        }}
      />
    </div>
  );
});

export default CodeEditor;
