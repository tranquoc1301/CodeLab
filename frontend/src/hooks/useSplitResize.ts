import { useState, useCallback, useEffect, useRef } from "react";

interface UseSplitResizeOptions {
  initialSplit?: number;
  initialConsoleHeight?: number;
  minSplit?: number;
  maxSplit?: number;
  minConsole?: number;
  maxConsole?: number;
}

interface UseSplitResizeReturn {
  splitRef: React.RefObject<HTMLDivElement | null>;
  editorSplitRef: React.RefObject<HTMLDivElement | null>;
  splitPercent: number;
  consoleHeight: number;
  handleHorizontalMouseDown: (e: React.MouseEvent) => void;
  handleVerticalMouseDown: (e: React.MouseEvent) => void;
}

export function useSplitResize(
  options: UseSplitResizeOptions = {},
): UseSplitResizeReturn {
  const {
    initialSplit = 38,
    initialConsoleHeight = 45,
    minSplit = 20,
    maxSplit = 65,
    minConsole = 15,
    maxConsole = 70,
  } = options;

  const splitRef = useRef<HTMLDivElement>(null);
  const editorSplitRef = useRef<HTMLDivElement>(null);
  const [splitPercent, setSplitPercent] = useState(initialSplit);
  const [consoleHeight, setConsoleHeight] = useState(initialConsoleHeight);
  const isResizingRef = useRef(false);
  const editorResizingRef = useRef(false);

  const handleHorizontalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
  }, []);

  const handleVerticalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    editorResizingRef.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
        const container = splitRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        setSplitPercent(Math.min(Math.max(percent, minSplit), maxSplit));
      }
      if (editorResizingRef.current) {
        const container = editorSplitRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const percent =
          ((rect.height - (e.clientY - rect.top)) / rect.height) * 100;
        setConsoleHeight(Math.min(Math.max(percent, minConsole), maxConsole));
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      editorResizingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minSplit, maxSplit, minConsole, maxConsole]);

  return {
    splitRef,
    editorSplitRef,
    splitPercent,
    consoleHeight,
    handleHorizontalMouseDown,
    handleVerticalMouseDown,
  };
}
