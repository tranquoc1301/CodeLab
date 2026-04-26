import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { User, Mail, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
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
import {API, COPY, VALIDATION} from "@/shared/config";
import { ROUTES } from "@/app/router";
import { registerSchema, type RegisterFormData } from "@/shared/utils/validation";
import { useCheckUsername, useCheckEmail } from "@/shared/hooks/useAvailabilityCheck";

type Step = "form" | "otp" | "success";

export default function Register() {
  const [step, setStep] = useState<Step>("form");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  // Use react-hook-form with Zod resolver
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const { checkUsername } = useCheckUsername();
  const { checkEmail } = useCheckEmail();

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await api.post(API.ENDPOINTS.AUTH_SEND_OTP, {
        email: data.email,
        otp_type: "register",
      });
      return res.data;
    },
    onSuccess: () => {
      setStep("otp");
      setCountdown(60);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        if (detail?.toLowerCase().includes("username")) {
          setFormError("username", { message: detail });
        } else if (detail?.toLowerCase().includes("email")) {
          setFormError("email", { message: detail });
        } else {
          setError(detail || COPY.REGISTER.ERROR);
        }
      } else {
        setError(COPY.REGISTER.ERROR);
      }
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await api.post(API.ENDPOINTS.AUTH_VERIFY_OTP, {
        email: data.email,
        otp_code: otp,
        otp_type: "register",
      });
      return res.data;
    },
    onSuccess: (data: { temp_token: string }) => {
      const formData = watch();
      completeRegistration(data.temp_token, formData);
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

  // Complete registration mutation
  const registerMutation = useMutation({
    mutationFn: async ({
      token,
      data,
    }: {
      token: string;
      data: RegisterFormData;
    }) => {
      const res = await api.post(
        API.ENDPOINTS.AUTH_REGISTER,
        { username: data.username, email: data.email, password: data.password, otp_code: otp },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.data;
    },
    onSuccess: () => {
      setStep("success");
      setTimeout(() => navigate(ROUTES.LOGIN), 3000);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        if (detail?.toLowerCase().includes("username")) {
          setFormError("username", { message: detail });
        } else if (detail?.toLowerCase().includes("email")) {
          setFormError("email", { message: detail });
        } else {
          setError(detail || COPY.REGISTER.ERROR);
        }
      } else {
        setError(COPY.REGISTER.ERROR);
      }
    },
  });

  const completeRegistration = useCallback(
    (token: string, data: RegisterFormData) => {
      registerMutation.mutate({ token, data });
    },
    [registerMutation],
  );

  const handleFormSubmit = async (data: RegisterFormData) => {
    setError("");
    clearErrors();

    // Check username and email availability in parallel
    const [usernameAvailable, emailAvailable] = await Promise.all([
      checkUsername(data.username),
      checkEmail(data.email),
    ]);

    if (!usernameAvailable) {
      setFormError("username", { message: "Username is already taken" });
      return;
    }
    if (!emailAvailable) {
      setFormError("email", { message: "Email is already in use" });
      return;
    }

    sendOtpMutation.mutate(data);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    setError("");
    const data = watch();
    verifyOtpMutation.mutate(data);
  };

  const handleResendOtp = useCallback(() => {
    if (countdown > 0) return;
    setOtp("");
    setError("");
    const data = watch();
    sendOtpMutation.mutate(data);
  }, [countdown, sendOtpMutation, watch]);

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const password = watch("password");

  const renderFormStep = () => (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">{COPY.FORM_LABELS.USERNAME}</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            type="text"
            {...register("username")}
            placeholder={COPY.PLACEHOLDER.USERNAME}
            minLength={3}
            maxLength={50}
            autoComplete="username"
            className="pl-10"
            aria-describedby={errors.username ? "username-error" : undefined}
            aria-invalid={!!errors.username}
          />
        </div>
        {errors.username && (
          <p id="username-error" className="text-sm text-destructive">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{COPY.FORM_LABELS.EMAIL}</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder={COPY.PLACEHOLDER.EMAIL}
            autoComplete="email"
            className="pl-10"
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
        <PasswordInput
          id="password"
          {...register("password")}
          minLength={VALIDATION.MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder={COPY.PLACEHOLDER.PASSWORD}
        />
        {password && <PasswordStrength password={password} />}
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {COPY.FORM_LABELS.CONFIRM_PASSWORD}
        </Label>
        <PasswordInput
          id="confirmPassword"
          {...register("confirmPassword")}
          autoComplete="new-password"
          placeholder={COPY.PLACEHOLDER.CONFIRM_PASSWORD}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full gap-2"
        disabled={isSubmitting || sendOtpMutation.isPending}
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        {isSubmitting || sendOtpMutation.isPending
          ? "Sending Code..."
          : "Create Account"}
      </Button>
    </form>
  );

  const renderOtpStep = () => {
    const formData = watch();
    return (
      <form onSubmit={handleOtpSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            We've sent a verification code to
          </p>
          <p className="font-medium">{formData.email}</p>
        </div>

        <div className="flex justify-center">
          <OTPInput
            length={6}
            value={otp}
            onChange={setOtp}
            disabled={
              verifyOtpMutation.isPending || registerMutation.isPending
            }
            error={!!error}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={
            otp.length !== 6 ||
            verifyOtpMutation.isPending ||
            registerMutation.isPending
          }
        >
          {verifyOtpMutation.isPending || registerMutation.isPending
            ? "Creating Account..."
            : "Create Account"}
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
  };

  const renderSuccessStep = () => (
    <div className="text-center space-y-4 py-4">
      <div className="flex justify-center">
        <div className="p-4 rounded-full bg-green-500/10">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold">Account Created!</h3>
        <p className="text-muted-foreground mt-2">
          Redirecting you to login...
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-accent/5 via-background to-primary/5" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-accent/20 to-transparent" />

      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-lg bg-accent/10">
              <UserPlus className="h-6 w-6 text-accent" aria-hidden />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {step === "form" && COPY.REGISTER.TITLE}
            {step === "otp" && "Verify Email"}
            {step === "success" && "Success!"}
          </CardTitle>
          <CardDescription>
            {step === "form" && COPY.REGISTER.DESCRIPTION}
            {step === "otp" && "Enter the code from your email"}
            {step === "success" && "Your account has been created"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "form" && renderFormStep()}
          {step === "otp" && renderOtpStep()}
          {step === "success" && renderSuccessStep()}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {COPY.REGISTER.HAS_ACCOUNT}{" "}
            <Link
              to={ROUTES.LOGIN}
              className="text-primary hover:underline font-medium transition-colors"
            >
              {COPY.REGISTER.SIGN_IN_LINK}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}