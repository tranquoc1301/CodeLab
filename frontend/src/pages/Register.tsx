import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { User, Mail, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
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
import { API, ROUTES, COPY, VALIDATION } from "@/config";
import { registerSchema, validateRegister } from "@/lib/validation";
import { useCheckUsername, useCheckEmail } from "@/lib/useAvailabilityCheck";

type Step = "form" | "otp" | "success";

export default function Register() {
  const [step, setStep] = useState<Step>("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Update field error using Zod
  const setFieldError = (field: string, value: string) => {
    const partialData = {
      username: field === "username" ? value : username,
      email: field === "email" ? value : email,
      password: field === "password" ? value : password,
      confirmPassword: field === "confirmPassword" ? value : confirmPassword,
    };
    const result = registerSchema.safeParse(partialData);
    if (!result.success) {
      const fieldError = result.error.issues.find(
        (i) => String(i.path[0]) === field,
      );
      setFieldErrors((prev) => {
        if (fieldError) return { ...prev, [field]: fieldError.message };
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setFieldErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Use shared availability check hooks
  const { checkUsername } = useCheckUsername();
  const { checkEmail } = useCheckEmail();

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.AUTH_SEND_OTP, {
        email,
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
          setFieldErrors({ username: detail });
        } else if (detail?.toLowerCase().includes("email")) {
          setFieldErrors({ email: detail });
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
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.AUTH_VERIFY_OTP, {
        email,
        otp_code: otp,
        otp_type: "register",
      });
      return res.data;
    },
    onSuccess: (data) => {
      completeRegistration(data.temp_token);
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
    mutationFn: async (token: string) => {
      const res = await api.post(
        API.ENDPOINTS.AUTH_REGISTER,
        { username, email, password, otp_code: otp },
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
          setFieldErrors({ username: detail });
        } else if (detail?.toLowerCase().includes("email")) {
          setFieldErrors({ email: detail });
        } else {
          setError(detail || COPY.REGISTER.ERROR);
        }
      } else {
        setError(COPY.REGISTER.ERROR);
      }
    },
  });

  const completeRegistration = useCallback(
    (token: string) => {
      registerMutation.mutate(token);
    },
    [registerMutation],
  );

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Validate all fields with Zod first
    const errors = validateRegister({
      username,
      email,
      password,
      confirmPassword,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Check username and email availability in parallel
    const [usernameAvailable, emailAvailable] = await Promise.all([
      checkUsername(username),
      checkEmail(email),
    ]);

    if (!usernameAvailable) {
      setFieldErrors((prev) => ({
        ...prev,
        username: "Username is already taken",
      }));
      return;
    }
    if (!emailAvailable) {
      setFieldErrors((prev) => ({ ...prev, email: "Email is already in use" }));
      return;
    }

    sendOtpMutation.mutate();
  };

  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    setError("");
    verifyOtpMutation.mutate();
  };

  const handleResendOtp = useCallback(() => {
    if (countdown > 0) return;
    setOtp("");
    setError("");
    sendOtpMutation.mutate();
  }, [countdown, sendOtpMutation]);

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const renderFormStep = () => (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">{COPY.FORM_LABELS.USERNAME}</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setFieldError("username", e.target.value);
            }}
            onBlur={async (e) => {
              const value = e.target.value;
              setFieldError("username", value);
              if (value.length >= 3 && !fieldErrors.username) {
                const available = await checkUsername(value);
                if (!available) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    username: "Username is already taken",
                  }));
                }
              }
            }}
            placeholder={COPY.PLACEHOLDER.USERNAME}
            required
            minLength={3}
            maxLength={50}
            autoComplete="username"
            className="pl-10"
          />
        </div>
        {fieldErrors.username && (
          <p className="text-xs text-destructive">{fieldErrors.username}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{COPY.FORM_LABELS.EMAIL}</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldError("email", e.target.value);
            }}
            onBlur={async (e) => {
              const value = e.target.value;
              setFieldError("email", value);
              if (value.includes("@") && !fieldErrors.email) {
                const available = await checkEmail(value);
                if (!available) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    email: "Email is already in use",
                  }));
                }
              }
            }}
            placeholder={COPY.PLACEHOLDER.EMAIL}
            required
            autoComplete="email"
            className="pl-10"
          />
        </div>
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setPassword(e.target.value);
            setFieldError("password", e.target.value);
          }}
          onBlur={(e) => setFieldError("password", e.target.value)}
          required
          minLength={VALIDATION.MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder={COPY.PLACEHOLDER.PASSWORD}
        />
        {password && <PasswordStrength password={password} />}
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {COPY.FORM_LABELS.CONFIRM_PASSWORD}
        </Label>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setConfirmPassword(e.target.value);
            setFieldError("confirmPassword", e.target.value);
          }}
          onBlur={(e) => setFieldError("confirmPassword", e.target.value)}
          required
          autoComplete="new-password"
          placeholder={COPY.PLACEHOLDER.CONFIRM_PASSWORD}
        />
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full gap-2"
        disabled={sendOtpMutation.isPending}
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        {sendOtpMutation.isPending ? "Sending Code..." : "Create Account"}
      </Button>
    </form>
  );

  const renderOtpStep = () => (
    <form onSubmit={handleOtpSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          We've sent a verification code to
        </p>
        <p className="font-medium">{email}</p>
      </div>

      <div className="flex justify-center">
        <OTPInput
          length={6}
          value={otp}
          onChange={setOtp}
          disabled={verifyOtpMutation.isPending || registerMutation.isPending}
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
