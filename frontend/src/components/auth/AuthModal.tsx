import * as React from "react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { Button, Input, Label, Alert, AlertDescription } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { COPY } from "@/config";
import { useMutation } from "@tanstack/react-query";
import api from "@/api";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { getAndClearIntent } from "@/store/authGuard";
import { loginSchema, registerSchema } from "@/lib/validation";
import type { LoginFormData, RegisterFormData } from "@/lib/validation";

export const AuthModal = () => {
  const { closeAuthModal, authModalTab, setAuthModalTab, setToken, setUser } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Login form with react-hook-form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form with react-hook-form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // API error states
  const [loginApiError, setLoginApiError] = React.useState("");
  const [registerApiError, setRegisterApiError] = React.useState("");

  // Focus trap and focus management
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const formData = new URLSearchParams();
      formData.append("username", data.username);
      formData.append("password", data.password);
      const res = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return res.data;
    },
    onSuccess: async (data) => {
      setToken(data.access_token);
      try {
        const userRes = await api.get("/auth/me");
        setUser(userRes.data);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
      closeAuthModal();
      const intentPath = getAndClearIntent();
      if (intentPath) {
        navigate(intentPath);
      } else {
        navigate("/");
      }
    },
    onError: () => {
      loginForm.clearErrors();
      setLoginApiError(COPY.LOGIN.ERROR);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: Omit<RegisterFormData, "confirmPassword">) => {
      const res = await api.post("/auth/register", {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      return res.data;
    },
    onSuccess: () => {
      closeAuthModal();
      setAuthModalTab("login");
      loginForm.reset();
      registerForm.reset();
    },
    onError: (err: unknown) => {
      registerForm.clearErrors();
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        if (detail?.toLowerCase().includes("username")) {
          registerForm.setError("username", { message: detail });
        } else if (detail?.toLowerCase().includes("email")) {
          registerForm.setError("email", { message: detail });
        } else {
          setRegisterApiError(detail || COPY.REGISTER.ERROR);
        }
      } else {
        setRegisterApiError(COPY.REGISTER.ERROR);
      }
    },
  });

  const handleLoginSubmit = loginForm.handleSubmit((data) => {
    setLoginApiError("");
    loginMutation.mutate(data);
  });

  const handleRegisterSubmit = registerForm.handleSubmit((data) => {
    setRegisterApiError("");
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  });

  const handleTabChange = (value: string) => {
    setAuthModalTab(value as "login" | "register");
    setLoginApiError("");
    setRegisterApiError("");
    loginForm.reset();
    registerForm.reset();
  };

  const handleClose = () => {
    closeAuthModal();
    setTimeout(() => {
      setLoginApiError("");
      setRegisterApiError("");
      loginForm.reset();
      registerForm.reset();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          "relative z-10 w-full max-w-md animate-slide-up",
          "bg-card border border-border rounded-xl shadow-2xl",
          "transition-all duration-200 ease-out"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close authentication modal"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <h1 id="auth-modal-title" className="text-2xl font-bold tracking-tight">
              {COPY.APP_NAME}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {authModalTab === "login" ? COPY.LOGIN.DESCRIPTION : COPY.REGISTER.DESCRIPTION}
            </p>
          </div>

          <Tabs value={authModalTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{COPY.LOGIN.SIGN_IN}</TabsTrigger>
              <TabsTrigger value="register">{COPY.REGISTER.CREATE}</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              {loginApiError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{loginApiError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-login-username">{COPY.FORM_LABELS.USERNAME}</Label>
                  <Input
                    id="auth-login-username"
                    type="text"
                    {...loginForm.register("username")}
                    aria-describedby={loginForm.formState.errors.username ? "auth-login-username-error" : undefined}
                    aria-invalid={!!loginForm.formState.errors.username}
                    required
                    autoComplete="username"
                    placeholder={COPY.PLACEHOLDER.USERNAME}
                  />
                  {loginForm.formState.errors.username && (
                    <p id="auth-login-username-error" className="text-sm text-destructive">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-login-password">{COPY.FORM_LABELS.PASSWORD}</Label>
                  <PasswordInput
                    id="auth-login-password"
                    {...loginForm.register("password")}
                    aria-describedby={loginForm.formState.errors.password ? "auth-login-password-error" : undefined}
                    aria-invalid={!!loginForm.formState.errors.password}
                    required
                    autoComplete="current-password"
                    placeholder={COPY.PLACEHOLDER.PASSWORD}
                  />
                  {loginForm.formState.errors.password && (
                    <p id="auth-login-password-error" className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? COPY.LOGIN.SIGNING_IN : COPY.LOGIN.SIGN_IN}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              {registerApiError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{registerApiError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-register-username">{COPY.FORM_LABELS.USERNAME}</Label>
                  <Input
                    id="auth-register-username"
                    type="text"
                    {...registerForm.register("username")}
                    aria-describedby={registerForm.formState.errors.username ? "auth-register-username-error" : undefined}
                    aria-invalid={!!registerForm.formState.errors.username}
                    required
                    autoComplete="username"
                    placeholder={COPY.PLACEHOLDER.USERNAME}
                  />
                  {registerForm.formState.errors.username && (
                    <p id="auth-register-username-error" className="text-sm text-destructive">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-email">{COPY.FORM_LABELS.EMAIL}</Label>
                  <Input
                    id="auth-register-email"
                    type="email"
                    {...registerForm.register("email")}
                    aria-describedby={registerForm.formState.errors.email ? "auth-register-email-error" : undefined}
                    aria-invalid={!!registerForm.formState.errors.email}
                    required
                    autoComplete="email"
                    placeholder={COPY.PLACEHOLDER.EMAIL}
                  />
                  {registerForm.formState.errors.email && (
                    <p id="auth-register-email-error" className="text-sm text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-password">{COPY.FORM_LABELS.PASSWORD}</Label>
                  <PasswordInput
                    id="auth-register-password"
                    {...registerForm.register("password")}
                    aria-describedby={registerForm.formState.errors.password ? "auth-register-password-error" : undefined}
                    aria-invalid={!!registerForm.formState.errors.password}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder={COPY.PLACEHOLDER.PASSWORD}
                  />
                  {registerForm.watch("password") && <PasswordStrength password={registerForm.watch("password") as string} />}
                  {registerForm.formState.errors.password && (
                    <p id="auth-register-password-error" className="text-sm text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-confirm">{COPY.FORM_LABELS.CONFIRM_PASSWORD}</Label>
                  <PasswordInput
                    id="auth-register-confirm"
                    {...registerForm.register("confirmPassword")}
                    aria-describedby={registerForm.formState.errors.confirmPassword ? "auth-register-confirm-error" : undefined}
                    aria-invalid={!!registerForm.formState.errors.confirmPassword}
                    required
                    autoComplete="new-password"
                    placeholder={COPY.PLACEHOLDER.CONFIRM_PASSWORD}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p id="auth-register-confirm-error" className="text-sm text-destructive">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? COPY.REGISTER.CREATING : COPY.REGISTER.CREATE}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};