import { memo } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface TestCaseResultItemProps {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
}

export const TestCaseResultItem = memo(function TestCaseResultItem({
  index,
  passed,
  input,
  expected,
  actual,
}: TestCaseResultItemProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        {passed ? (
          <CheckCircle className="h-4 w-4 text-green-500" aria-hidden />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" aria-hidden />
        )}
        <span className={passed ? "text-green-400" : "text-red-400"}>
          Case {index + 1}: {passed ? "Accepted" : "Wrong Answer"}
        </span>
      </div>
      {!passed && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-500 block mb-1">Input</span>
            <pre className="p-2.5 bg-zinc-900 rounded border border-zinc-800 font-mono text-zinc-300 whitespace-pre-wrap overflow-auto">
              {input}
            </pre>
          </div>
          <div>
            <span className="text-zinc-500 block mb-1">Expected</span>
            <pre className="p-2.5 bg-green-950/30 rounded border border-green-800/50 font-mono text-green-400 whitespace-pre-wrap overflow-auto">
              {expected}
            </pre>
          </div>
          <div className="col-span-2">
            <span className="text-zinc-500 block mb-1">Your Output</span>
            <pre className="p-2.5 bg-red-950/30 rounded border border-red-800/50 font-mono text-red-400 whitespace-pre-wrap overflow-auto">
              {actual}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});
