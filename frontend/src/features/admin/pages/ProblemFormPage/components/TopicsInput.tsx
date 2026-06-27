import { useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/utils";

interface TopicsInputProps {
  value: string[];
  onChange: (topics: string[]) => void;
  availableTopics: string[];
  error?: string;
}

export function TopicsInput({
  value,
  onChange,
  availableTopics,
  error,
}: TopicsInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = availableTopics.filter(
    (t) => !value.includes(t) && t.toLowerCase().includes(input.toLowerCase()),
  );

  const addTopic = (topic: string) => {
    const trimmed = topic.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTopic = (topic: string) => {
    onChange(value.filter((t) => t !== topic));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTopic(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTopic(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Topics</Label>
      <div className="relative">
        <div
          className={cn(
            "flex min-h-[36px] flex-wrap gap-1 rounded-md border bg-transparent px-2 py-1 text-sm transition-colors",
            "focus-within:ring-2 focus-within:ring-ring/50",
            error && "border-destructive",
          )}
          onClick={() => setShowSuggestions(true)}
        >
          {value.map((topic) => (
            <Badge key={topic} variant="secondary" className="gap-1 text-xs">
              {topic}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTopic(topic);
                }}
                className="rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? "Type and press Enter to add..." : ""}
            className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
        {showSuggestions && input && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {suggestions.slice(0, 8).map((topic) => (
              <button
                key={topic}
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTopic(topic);
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>
      {availableTopics.length > 0 && (
        <p className="truncate text-xs text-muted-foreground">
          Existing: {availableTopics.slice(0, 5).join(", ")}
          {availableTopics.length > 5 && "..."}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
