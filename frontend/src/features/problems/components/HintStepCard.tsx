import type { HintResponse } from "@/shared/types";

interface HintStepCardProps {
  hint: HintResponse;
  index: number;
}

const LEVEL_COPY: Record<number, { title: string; description: string; accent: string }> = {
  1: {
    title: "Mức 1: Nhìn triệu chứng",
    description: "Gợi ý này chỉ giúp bạn nhận ra dấu hiệu sai và vùng nghi ngờ rộng, chưa chỉ chỗ sửa.",
    accent: "border-sky-200 bg-sky-50/60 text-sky-700",
  },
  2: {
    title: "Mức 2: Khoanh vùng lỗi",
    description: "Gợi ý này thu hẹp vào vùng logic cần soi và nhắc bạn kiểm tra đúng điểm đáng nghi.",
    accent: "border-amber-200 bg-amber-50/70 text-amber-700",
  },
  3: {
    title: "Mức 3: Chỉ rõ lỗi và hướng sửa",
    description: "Gợi ý này nói thẳng chỗ sai và hướng chỉnh logic, nhưng vẫn không đưa đáp án hoàn chỉnh.",
    accent: "border-rose-200 bg-rose-50/70 text-rose-700",
  },
};

export function HintStepCard({ hint, index }: HintStepCardProps) {
  const levelCopy = LEVEL_COPY[hint.level] ?? LEVEL_COPY[index + 1] ?? LEVEL_COPY[1];

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{levelCopy.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {levelCopy.description}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${levelCopy.accent}`}>
          {hint.level}/3
        </span>
      </div>
      <div className="space-y-2.5">
        {hint.items.map((item, itemIndex) => (
          <div
            key={`${hint.level}-${itemIndex}`}
            className="rounded-lg border border-border/50 bg-background p-3"
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
