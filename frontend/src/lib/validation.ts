import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Registration validation schema
export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
    email: z.email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// Validate with Zod and return field errors map
export function validateLogin(data: LoginFormData): Record<string, string> {
  const result = loginSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = String(issue.path[0]);
      if (field && !errors[field]) {
        errors[field] = issue.message;
      }
    });
    return errors;
  }
  return {};
}

export function validateRegister(data: RegisterFormData): Record<string, string> {
  const result = registerSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = String(issue.path[0]);
      if (field && !errors[field]) {
        errors[field] = issue.message;
      }
    });
    return errors;
  }
  return {};
}

// Email validation schema (forgot password)
export const emailSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export type EmailFormData = z.infer<typeof emailSchema>;

// OTP validation schema
export const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only digits"),
});

export type OtpFormData = z.infer<typeof otpSchema>;

// Reset password validation schema
export const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must be less than 100 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetFormData = z.infer<typeof resetSchema>;