import { useState, useCallback, useEffect, useRef, useId } from "react";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keyboard navigation - when dropdown is closed, open it
  useEffect(() => {
    if (open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowUp":
          e.preventDefault();
          setOpen(true);
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setOpen(false);
      buttonRef.current?.focus();
    },
    [onChange],
  );

  const handleListboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const maxIndex = options.length - 1;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
          break;
        case "Tab":
          // Allow tab to move focus naturally
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleSelect(options[activeIndex].value);
          setActiveIndex(0);
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          buttonRef.current?.focus();
          break;
      }
    },
    [options, activeIndex, handleSelect],
  );

  const selectedLabel = options.find((o) => o.value === value)?.label || label;

  const heightClass = size === "sm" ? "h-9" : "h-10";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          `flex ${heightClass} items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm`,
          "hover:bg-accent transition-colors",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        id={buttonId}
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
          ref={listboxRef}
          id={listboxId}
          className="absolute z-10 mt-1 w-full min-w-[140px] rounded-md border bg-popover p-1 shadow-lg dropdown-enter"
          role="listbox"
          aria-labelledby={buttonId}
          aria-activedescendant={`${listboxId}-option-${activeIndex}`}
          onKeyDown={handleListboxKeyDown}
          tabIndex={-1}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-option-${index}`}
              type="button"
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                value === option.value && "bg-accent",
                index === activeIndex && "bg-accent ring-1 ring-ring",
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