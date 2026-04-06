import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface BackToTopProps {
  /** Minimum scroll position (in px) before button appears */
  threshold?: number;
  /** Position from bottom */
  bottom?: string;
  /** Position from right */
  right?: string;
  className?: string;
}

export function BackToTop({
  threshold = 300,
  bottom = "2rem",
  right = "1.5rem",
  className,
}: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setIsVisible(window.scrollY > threshold);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <Button
      size="icon"
      variant="default"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        "fixed z-50 transition-all duration-300 ease-out",
        "hover:scale-110 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
        className,
      )}
      style={{
        bottom,
        right,
      }}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
