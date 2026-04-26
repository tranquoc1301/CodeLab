import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import api from "@/shared/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { PasswordStrength } from "@/features/auth/components/PasswordStrength";
import { OTPInput } from "@/features/auth/components/OTPInput";
import {API, COPY} from "@/shared/config";
import { ROUTES } from "@/app/router";
import { emailSchema, otpSchema, resetSchema } from "@/shared/utils/validation";

type Step = "email" | "otp" | "reset";

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [countdown, setCountdown] = useState(0);
  const [tempToken, setTempToken] = useState("");
  const [storedEmail, setStoredEmail] = useState("");
  const navigate = useNavigate();

  // Email form hook
  const {
    register: emailRegister,
    handleSubmit: emailHandleSubmit,
    formState: { errors: emailErrors },
    watch: emailWatch,
    reset: emailReset,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
  });

  // OTP form hook (register not needed - OTP is set programmatically)
  const {
    handleSubmit: otpHandleSubmit,
    formState: { errors: otpErrors },
    setValue: otpSetValue,
    watch: otpWatch,
    reset: otpReset,
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    mode: "onChange",
  });

  // Reset password form hook
  const {
    register: resetRegister,
    handleSubmit: resetHandleSubmit,
    formState: { errors: resetErrors },
    watch: resetWatch,
    reset: resetReset,
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
  });

  // Watch values for conditional rendering
  const watchedEmail = emailWatch("email");
  const watchedOtp = otpWatch("otp");
  const watchedPassword = resetWatch("password");

  // Reset form when step changes
  useEffect(() => {
    emailReset();
    otpReset();
    resetReset();
  }, [step, emailReset, otpReset, resetReset]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post(API.ENDPOINTS.AUTH_SEND_OTP, {
        email,
        otp_type: "forgot_password",
      });
      return res.data;
    },
    onSuccess: () => {
      setStoredEmail(watchedEmail);
      setStep("otp");
      setCountdown(60);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        console.error(detail || "Failed to send OTP");
      } else {
        console.error("Failed to send OTP");
      }
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const res = await api.post(API.ENDPOINTS.AUTH_VERIFY_OTP, {
        email,
        otp_code: otp,
        otp_type: "forgot_password",
      });
      return res.data;
    },
    onSuccess: (data) => {
      setTempToken(data.temp_token);
      setStep("reset");
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        console.error(detail || "Invalid OTP");
      } else {
        console.error("Invalid OTP");
      }
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      email,
      tempToken,
      password,
    }: {
      email: string;
      tempToken: string;
      password: string;
    }) => {
      const res = await api.post(API.ENDPOINTS.AUTH_RESET_PASSWORD, {
        email,
        temp_token: tempToken,
        new_password: password,
      });
      return res.data;
    },
    onSuccess: () => {
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        console.error(detail || "Failed to reset password");
      } else {
        console.error("Failed to reset password");
      }
    },
  });

  const handleResendOtp = useCallback(() => {
    if (countdown > 0) return;
    if (storedEmail) {
      sendOtpMutation.mutate(storedEmail);
    }
  }, [countdown, sendOtpMutation, storedEmail]);

  const handleSendOtp = (data: EmailFormData) => {
    sendOtpMutation.mutate(data.email);
  };

  const handleVerifyOtp = (data: OtpFormData) => {
    if (storedEmail) {
      verifyOtpMutation.mutate({ email: storedEmail, otp: data.otp });
    }
  };

  const handleResetPassword = (data: ResetFormData) => {
    if (storedEmail && tempToken) {
      resetPasswordMutation.mutate({
        email: storedEmail,
        tempToken,
        password: data.password,
      });
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={emailHandleSubmit(handleSendOtp)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{COPY.FORM_LABELS.EMAIL}</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            {...emailRegister("email")}
            placeholder={COPY.PLACEHOLDER.EMAIL}
            autoComplete="email"
            className="pl-10"
          />
        </div>
        {emailErrors.email && (
          <p className="text-sm text-destructive">{emailErrors.email.message}</p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full gap-2"
        disabled={sendOtpMutation.isPending}
      >
        {sendOtpMutation.isPending ? "Sending..." : "Send Reset Code"}
      </Button>
    </form>
  );

  const renderOtpStep = () => (
    <form onSubmit={otpHandleSubmit(handleVerifyOtp)} className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to
        </p>
        <p className="font-medium">{storedEmail}</p>
      </div>

      <div className="flex justify-center">
        <OTPInput
          length={6}
          value={(watchedOtp as string) || ""}
          onChange={(value) =>
            otpSetValue("otp", value, { shouldValidate: true })
          }
          disabled={verifyOtpMutation.isPending}
          error={!!otpErrors.otp}
        />
      </div>
      {otpErrors.otp && (
        <p className="text-sm text-destructive text-center">
          {otpErrors.otp.message}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={
          (watchedOtp as string)?.length !== 6 || verifyOtpMutation.isPending
        }
      >
        {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
      </Button>

      <div className="text-center text-sm">
        {countdown > 0 ? (
          <p className="text-muted-foreground">Resend code in {countdown}s</p>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            className="text-primary hover:underline"
          >
            Resend code
          </button>
        )}
      </div>
    </form>
  );

  const renderResetStep = () => (
    <form
      onSubmit={resetHandleSubmit(handleResetPassword)}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
        <PasswordInput
          id="password"
          {...resetRegister("password")}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password"
        />
        {resetErrors.password && (
          <p className="text-sm text-destructive">{resetErrors.password.message}</p>
        )}
        {watchedPassword && <PasswordStrength password={watchedPassword} />}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {COPY.FORM_LABELS.CONFIRM_PASSWORD}
        </Label>
        <PasswordInput
          id="confirmPassword"
          {...resetRegister("confirmPassword")}
          required
          autoComplete="new-password"
          placeholder="Confirm new password"
        />
        {resetErrors.confirmPassword && (
          <p className="text-sm text-destructive">
            {resetErrors.confirmPassword.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full gap-2"
        disabled={resetPasswordMutation.isPending}
      >
        <Lock className="h-4 w-4" />
        {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-1 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step !== "email" && setStep("email")}
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-lg bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {step === "email" && "Reset Password"}
            {step === "otp" && "Verify Email"}
            {step === "reset" && "New Password"}
          </CardTitle>
          <CardDescription>
            {step === "email" && "Enter your email to receive a reset code"}
            {step === "otp" && "Enter the code from your email"}
            {step === "reset" && "Enter your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sendOtpMutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(sendOtpMutation.error as { detail?: string })?.detail ||
                  "Failed to send OTP"}
              </AlertDescription>
            </Alert>
          )}
          {verifyOtpMutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(verifyOtpMutation.error as { detail?: string })?.detail ||
                  "Invalid OTP"}
              </AlertDescription>
            </Alert>
          )}
          {resetPasswordMutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(resetPasswordMutation.error as { detail?: string })?.detail ||
                  "Failed to reset password"}
              </AlertDescription>
            </Alert>
          )}
          {sendOtpMutation.isSuccess && step === "email" && (
            <Alert className="mb-4 border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                OTP sent to your email
              </AlertDescription>
            </Alert>
          )}
          {resetPasswordMutation.isSuccess && step !== "email" && (
            <Alert className="mb-4 border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                Password reset successfully!
              </AlertDescription>
            </Alert>
          )}

          {step === "email" && renderEmailStep()}
          {step === "otp" && renderOtpStep()}
          {step === "reset" && renderResetStep()}
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            to={ROUTES.LOGIN}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
