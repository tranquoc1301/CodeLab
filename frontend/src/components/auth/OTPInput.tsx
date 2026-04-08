import * as React from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const OTPInput = React.forwardRef<HTMLDivElement, OTPInputProps>(
  ({ length = 6, value, onChange, disabled = false, error = false, className }, ref) => {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, char: string) => {
      if (!/^\d*$/.test(char)) return; // Only allow digits

      const newValue = value.padEnd(length, " ").slice(0, length);
      const chars = newValue.split("");
      chars[index] = char;
      const finalValue = chars.join("").trim();
      
      onChange(finalValue);

      // Move to next input if value entered
      if (char && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (!value[index] && index > 0) {
          // If current input is empty, focus previous input
          inputRefs.current[index - 1]?.focus();
        } else {
          // Clear current input
          const newValue = value.split("");
          newValue[index] = "";
          onChange(newValue.join(""));
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      onChange(pastedData);
      
      // Focus last input after paste
      if (pastedData.length === length) {
        inputRefs.current[length - 1]?.focus();
      } else if (pastedData.length > 0) {
        inputRefs.current[pastedData.length]?.focus();
      }
    };

    return (
      <div 
        ref={ref} 
        className={cn("flex gap-2 justify-center", className)}
        onPaste={handlePaste}
      >
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={disabled}
            className={cn(
              "w-10 h-12 text-center text-lg font-medium rounded-md border-2 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              "bg-background",
              error 
                ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                : "border-input focus:border-primary focus:ring-primary/20",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label={`Digit ${index + 1} of ${length}`}
          />
        ))}
      </div>
    );
  }
);

OTPInput.displayName = "OTPInput";