import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {API} from "@/shared/config";
import api from "@/shared/api";

// Hook for checking username availability
export function useCheckUsername() {
  const [isChecking, setIsChecking] = useState(false);
  
  const checkMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await api.get(API.ENDPOINTS.AUTH_CHECK_USERNAME, {
        params: { username },
      });
      return res.data;
    },
  });

  const checkUsername = useCallback(async (username: string): Promise<boolean> => {
    setIsChecking(true);
    try {
      const res = await checkMutation.mutateAsync(username);
      setIsChecking(false);
      return res.available !== false;
    } catch {
      setIsChecking(false);
      // On error, allow submission (server will validate)
      return true;
    }
  }, [checkMutation]);

  return { checkUsername, isChecking };
}

// Hook for checking email availability
export function useCheckEmail() {
  const [isChecking, setIsChecking] = useState(false);
  
  const checkMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await api.get(API.ENDPOINTS.AUTH_CHECK_EMAIL, {
        params: { email },
      });
      return res.data;
    },
  });

  const checkEmail = useCallback(async (email: string): Promise<boolean> => {
    setIsChecking(true);
    try {
      const res = await checkMutation.mutateAsync(email);
      setIsChecking(false);
      return res.available !== false;
    } catch {
      setIsChecking(false);
      // On error, allow submission (server will validate)
      return true;
    }
  }, [checkMutation]);

  return { checkEmail, isChecking };
}