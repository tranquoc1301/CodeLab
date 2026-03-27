import Editor from '@monaco-editor/react';
import { useThemeStore } from '../store/theme';
import { cn } from '../lib/utils';
import { EDITOR } from '../config';
import type { Language } from '../types/language';

interface CodeEditorProps {
  language: Language;
  value: string;
  onChange: (value: string | undefined) => void;
}

const languageMap: Record<Language, string> = {
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const theme = useThemeStore((s) => s.theme);

  return (
    <div className={cn('rounded-lg border overflow-hidden shadow-sm')}>
      <Editor
        height={EDITOR.HEIGHT}
        language={languageMap[language]}
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
}
