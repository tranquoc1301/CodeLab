import { Lightbulb, Loader2 } from "lucide-react";
import type { HintResponse, VerdictResult } from "@/shared/types";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { HintStepCard } from "./HintStepCard";

interface HintTabProps {
  verdict: VerdictResult | null;
  hints: HintResponse[];
  hintLevel: number;
  isHintExhausted: boolean;
  isLoadingHint: boolean;
  hintError: string | null;
  onFetchHint: () => void;
}

export function HintTab({
  verdict,
  hints,
  hintLevel,
  isHintExhausted,
  isLoadingHint,
  hintError,
  onFetchHint,
}: HintTabProps) {
  const isAccepted = verdict?.status === "Accepted";
  const currentLevelMessage =
    hintLevel === 0
      ? "Bắt đầu từ gợi ý chung, sau đó hệ thống mới tăng dần mức cụ thể."
      : hintLevel === 1
        ? "Bạn đang ở mức nhìn triệu chứng. Mức tiếp theo sẽ khoanh vùng lỗi rõ hơn."
        : hintLevel === 2
          ? "Bạn đã được khoanh vùng lỗi. Mức cuối sẽ chỉ rõ điểm sai và hướng sửa."
          : "Bạn đang ở mức trực diện nhất: chỉ rõ chỗ sai và cách chỉnh logic.";

  if (!verdict?.submission_id || isAccepted) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {isAccepted
          ? "Bài đã Accepted, không cần hint thêm."
          : "Hãy submit bài để nhận chuỗi AI Hint 3 mức."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h4 className="text-sm font-semibold text-foreground">AI Hint</h4>
        </div>
        {!isHintExhausted && hintLevel < 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFetchHint}
            disabled={isLoadingHint}
            className="text-xs border-warning/30 hover:bg-warning/10"
          >
            {isLoadingHint ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Đang tạo hint...
              </>
            ) : hintLevel === 0 ? (
              "Nhận gợi ý đầu tiên"
            ) : (
              `Mở mức tiếp theo (${hintLevel}/3)`
            )}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">
              LLM Hint 3 Levels
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              {currentLevelMessage}
            </p>
          </div>
          <span className="rounded-full border border-warning/30 bg-background px-2.5 py-1 text-xs font-medium text-warning shrink-0">
            Mức {hintLevel}/3
          </span>
        </div>
      </div>

      {hintError && (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription>{hintError}</AlertDescription>
        </Alert>
      )}

      {hints.length > 0 && (
        <div className="space-y-3">
          {hints.map((hint, index) => (
            <HintStepCard key={`${hint.level}-${index}`} hint={hint} index={index} />
          ))}
          {isHintExhausted && (
            <p className="text-xs text-muted-foreground text-center">
              Đã dùng hết 3 mức gợi ý cho lần submit này. Hãy submit phiên bản code mới để bắt đầu chuỗi hint mới.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
