import { type ReactNode } from "react";

interface ConstraintTextProps {
  text: string;
}

export function ConstraintText({ text }: ConstraintTextProps) {
  return (
    <span className="font-mono leading-relaxed">
      {parseConstraintText(text)}
    </span>
  );
}

// ── Private helper ────────────────────────────────────────────
function parseConstraintText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /`([^`]+)`|(-?\d+)\^(\d+)|(<=|>=|<|>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      parts.push(
        <code
          key={match.index}
          className="bg-muted rounded-lg px-1 py-0.5 text-xs font-mono text-foreground"
        >
          {match[1]}
        </code>,
      );
    } else if (match[2] !== undefined && match[3] !== undefined) {
      parts.push(
        <span key={match.index} className="font-mono">
          {match[2]}
          <sup>{match[3]}</sup>
        </span>,
      );
    } else if (match[4] !== undefined) {
      parts.push(
        <span key={match.index} className="font-mono text-muted-foreground">
          {match[4]}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
