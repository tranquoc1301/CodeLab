import { useState } from "react";
import { Eye, Pencil } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/utils";

interface DescriptionInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

export function DescriptionInput({ value, onChange, error }: DescriptionInputProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Description (Markdown)</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={tab === "write" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setTab("write")}
          >
            <Pencil className="h-3 w-3" />
            Write
          </Button>
          <Button
            type="button"
            variant={tab === "preview" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setTab("preview")}
          >
            <Eye className="h-3 w-3" />
            Preview
          </Button>
        </div>
      </div>
      {tab === "write" ? (
        <Textarea
          rows={6}
          placeholder="Describe the problem in Markdown format..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(error && "border-destructive")}
        />
      ) : (
        <div className="min-h-[144px] rounded-md border bg-card p-4 text-sm prose prose-sm dark:prose-invert max-w-none">
          {value ? (
            <div className="whitespace-pre-wrap">{value}</div>
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
