import { useState } from "react";
import { getStoredPath } from "@/app/store/authGuard";

export interface UseLoginGateReturn {
  showLoginPrompt: boolean;
  setShowLoginPrompt: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLoginGate(isAuthenticated: boolean): UseLoginGateReturn {
  const [showLoginPrompt, setShowLoginPrompt] = useState(() => {
    const intentPath = getStoredPath();
    return (
      !isAuthenticated && !!intentPath && intentPath.startsWith("/problems/")
    );
  });

  return { showLoginPrompt, setShowLoginPrompt };
}