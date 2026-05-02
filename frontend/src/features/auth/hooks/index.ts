import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api";
import type { LoginFormData } from "@/features/auth/types";

export function useLoginMutation(options?: {
  onSuccess?: (data: { access_token: string }) => void;
  onError?: () => void;
}) {
  return useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await authApi.login(data.username, data.password);
      return res.data;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
