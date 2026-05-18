import { memo, useState, useCallback } from "react";
import { Terminal, CheckCircle, Zap, Lightbulb } from "lucide-react";
import type { HintResponse, VerdictResult } from "@/shared/types";
import { ResultTab } from "./ResultTab";
import { ExecutedTab } from "./ExecutedTab";
import { HintTab } from "./HintTab";

type ConsoleTab = "result" | "executed" | "hint";

interface TabDef {
  key: ConsoleTab;
  label: string;
  icon: typeof Terminal;
}

const TABS: TabDef[] = [
  { key: "result", label: "Test Result", icon: CheckCircle },
  { key: "executed", label: "Judge's Result", icon: Zap },
  { key: "hint", label: "AI Hint", icon: Lightbulb },
];

interface ConsolePanelProps {
  verdict: VerdictResult | null;
  isRunning: boolean;
  totalTestCases: number;
  hints: HintResponse[];
  hintLevel: number;
  isHintExhausted: boolean;
  isLoadingHint: boolean;
  hintError: string | null;
  onFetchHint: () => void;
}

export const ConsolePanel = memo(function ConsolePanel({
  verdict,
  isRunning,
  totalTestCases,
  hints,
  hintLevel,
  isHintExhausted,
  isLoadingHint,
  hintError,
  onFetchHint,
}: ConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("result");

  const handleTabChange = useCallback((tab: ConsoleTab) => {
    setActiveTab(tab);
  }, []);

  const isAccepted = verdict?.status === "Accepted";

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center px-3 pt-2 pb-0">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/60">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto scrollbar-thin p-4"
        style={{ minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        {activeTab === "result" && (
          <ResultTab
            verdict={verdict}
            isRunning={isRunning}
            totalTestCases={totalTestCases}
          />
        )}
        {activeTab === "executed" && (
          <ExecutedTab verdict={verdict} isAccepted={isAccepted} />
        )}
        {activeTab === "hint" && (
          <HintTab
            verdict={verdict}
            hints={hints}
            hintLevel={hintLevel}
            isHintExhausted={isHintExhausted}
            isLoadingHint={isLoadingHint}
            hintError={hintError}
            onFetchHint={onFetchHint}
          />
        )}
      </div>
    </div>
  );
});
