import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import api from "@/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { OTPInput } from "@/components/auth/OTPInput";
import { API, ROUTES, COPY } from "@/config";

type Step = "email" | "otp" | "reset";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [tempToken, setTempToken] = useState("");
  const navigate = useNavigate();

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.AUTH_SEND_OTP, {
        email,
        otp_type: "forgot_password",
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSuccess(data.message || "OTP sent to your email");
      setStep("otp");
      setCountdown(60);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        setError(detail || "Failed to send OTP");
      } else {
        setError("Failed to send OTP");
      }
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
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
      setError("");
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        setError(detail || "Invalid OTP");
      } else {
        setError("Invalid OTP");
      }
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.AUTH_RESET_PASSWORD, {
        email,
        temp_token: tempToken,
        new_password: password,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccess("Password reset successfully!");
      setTimeout(() => navigate(ROUTES.LOGIN), 2000);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        setError(detail || "Failed to reset password");
      } else {
        setError("Failed to reset password");
      }
    },
  });

  const handleResendOtp = useCallback(() => {
    if (countdown > 0) return;
    setOtp("");
    setError("");
    sendOtpMutation.mutate();
  }, [countdown, sendOtpMutation]);

  const handleSendOtp = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    sendOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    setError("");
    verifyOtpMutation.mutate();
  };

  const handleResetPassword = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    resetPasswordMutation.mutate();
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{COPY.FORM_LABELS.EMAIL}</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={COPY.PLACEHOLDER.EMAIL}
            required
            autoComplete="email"
            className="pl-10"
          />
        </div>
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
    <form onSubmit={handleVerifyOtp} className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to
        </p>
        <p className="font-medium">{email}</p>
      </div>

      <div className="flex justify-center">
        <OTPInput
          length={6}
          value={otp}
          onChange={setOtp}
          disabled={verifyOtpMutation.isPending}
          error={!!error}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={otp.length !== 6 || verifyOtpMutation.isPending}
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
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password"
        />
        {password && <PasswordStrength password={password} />}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {COPY.FORM_LABELS.CONFIRM_PASSWORD}
        </Label>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setConfirmPassword(e.target.value)
          }
          required
          autoComplete="new-password"
          placeholder="Confirm new password"
        />
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                {success}
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
