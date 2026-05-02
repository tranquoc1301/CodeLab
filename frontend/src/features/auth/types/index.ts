import { z } from "zod";
import { loginSchema, emailSchema, otpSchema, resetSchema } from "@/shared/utils/validation";

export type { RegisterFormData } from "@/shared/utils/validation";

export type LoginFormData = z.infer<typeof loginSchema>;

export type EmailFormData = z.infer<typeof emailSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
export type ResetFormData = z.infer<typeof resetSchema>;

export type RegisterStep = "form" | "otp" | "success";
export type ForgotPasswordStep = "email" | "otp" | "reset";

export interface LoginProps {
  minimal?: boolean;
}
