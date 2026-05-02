import api from "@/shared/api";
import { API } from "@/shared/config";
import type { RegisterFormData } from "@/features/auth/types";

export const authApi = {
  login: (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    return api.post(API.ENDPOINTS.AUTH_LOGIN, formData, {
      headers: { "Content-Type": API.HEADERS.FORM_URLENCODED },
    });
  },

  getMe: () => api.get(API.ENDPOINTS.AUTH_ME),

  sendOtp: (email: string, otpType: "register" | "forgot_password") =>
    api.post(API.ENDPOINTS.AUTH_SEND_OTP, { email, otp_type: otpType }),

  verifyOtp: (email: string, otpCode: string, otpType: "register" | "forgot_password") =>
    api.post(API.ENDPOINTS.AUTH_VERIFY_OTP, {
      email,
      otp_code: otpCode,
      otp_type: otpType,
    }),

  register: (data: RegisterFormData, otpCode: string, tempToken: string) =>
    api.post(
      API.ENDPOINTS.AUTH_REGISTER,
      { username: data.username, email: data.email, password: data.password, otp_code: otpCode },
      { headers: { Authorization: `Bearer ${tempToken}` } },
    ),

  resetPassword: (email: string, tempToken: string, newPassword: string) =>
    api.post(API.ENDPOINTS.AUTH_RESET_PASSWORD, {
      email,
      temp_token: tempToken,
      new_password: newPassword,
    }),
};
