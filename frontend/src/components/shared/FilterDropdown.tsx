import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  size?: "sm" | "md";
}

export const FilterDropdown = function FilterDropdown({
  label,
  value,
  options,
  onChange,
  size = "md",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setOpen(false);
    },
    [onChange],
  );

  const selectedLabel =
    options.find((o) => o.value === value)?.label || label;

  const heightClass = size === "sm" ? "h-9" : "h-10";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          `flex ${heightClass} items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm`,
          "hover:bg-accent transition-colors",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value === "all" ? "text-muted-foreground" : ""}>
          {selectedLabel}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-1 w-full min-w-[140px] rounded-md border bg-popover p-1 shadow-lg dropdown-enter"
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                value === option.value && "bg-accent",
              )}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
