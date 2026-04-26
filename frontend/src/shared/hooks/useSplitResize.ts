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
  editorPanelRef: React.RefObject<HTMLDivElement | null>;
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
  const editorPanelRef = useRef<HTMLDivElement>(null);
  const [splitPercent, setSplitPercent] = useState(initialSplit);
  const [consoleHeight, setConsoleHeight] = useState(initialConsoleHeight);
  
  // Refs for drag state (avoid re-renders during drag)
  const isHorizontalDragging = useRef(false);
  const isVerticalDragging = useRef(false);
  const splitPercentRef = useRef(initialSplit);
  const consoleHeightRef = useRef(initialConsoleHeight);

  // Sync ref with state for initial render
  useEffect(() => {
    splitPercentRef.current = splitPercent;
    consoleHeightRef.current = consoleHeight;
  }, [splitPercent, consoleHeight]);

  const handleHorizontalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isHorizontalDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleVerticalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isVerticalDragging.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  // Use CSS custom properties for smooth resize (no React re-renders)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isHorizontalDragging.current && !isVerticalDragging.current) return;

      if (isHorizontalDragging.current) {
        const root = splitRef.current;
        if (!root) return;
        
        const rect = root.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        const clampedPercent = Math.min(
          Math.max(percent, minSplit),
          maxSplit,
        );
        splitPercentRef.current = clampedPercent;
        // Direct DOM update for performance
        root.style.setProperty("--split-percent", `${clampedPercent}%`);
      }

      if (isVerticalDragging.current) {
        const container = editorPanelRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const percent =
          ((rect.height - (e.clientY - rect.top)) / rect.height) * 100;
        const clampedConsole = Math.min(
          Math.max(percent, minConsole),
          maxConsole,
        );
        consoleHeightRef.current = clampedConsole;
        // Direct DOM update for performance
        container.style.setProperty("--console-height", `${clampedConsole}%`);
      }
    };

    const handleMouseUp = () => {
      if (isHorizontalDragging.current) {
        setSplitPercent(splitPercentRef.current);
      }
      if (isVerticalDragging.current) {
        setConsoleHeight(consoleHeightRef.current);
      }
      isHorizontalDragging.current = false;
      isVerticalDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      // Reset body styles in case component unmounted mid-drag
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [minSplit, maxSplit, minConsole, maxConsole]);

  return {
    splitRef,
    editorPanelRef,
    splitPercent,
    consoleHeight,
    handleHorizontalMouseDown,
    handleVerticalMouseDown,
  };
};