import * as React from "react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { useAuth } from "@/app/store/auth";
import { PasswordInput } from "./PasswordInput";
import {COPY} from "@/shared/config";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import type { User } from "@/shared/types";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/components/ui/tabs";
import { getAndClearIntent } from "@/app/store/authGuard";
import { loginSchema } from "@/shared/utils/validation";
import type { LoginFormData } from "@/shared/utils/validation";
import { authApi } from "@/features/auth/api";
import { ROUTES } from "@/app/router";

export const AuthModal = () => {
  const { closeAuthModal, authModalTab, setAuthModalTab, setUser } = useAuth();
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

  // API error states
  const [loginApiError, setLoginApiError] = React.useState("");

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
      const res = await authApi.login(data.username, data.password);
      return res.data;
    },
    onSuccess: async () => {
      // Cookie is set by backend automatically, just fetch user data
      try {
        const userRes = await authApi.getMe();
        setUser(userRes.data as User);
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

  const handleLoginSubmit = loginForm.handleSubmit((data) => {
    setLoginApiError("");
    loginMutation.mutate(data);
  });

  // Register tab redirects to the full /register page which includes OTP verification
  const handleRegisterRedirect = () => {
    closeAuthModal();
    navigate(ROUTES.REGISTER);
  };

  const handleTabChange = (value: string) => {
    setAuthModalTab(value as "login" | "register");
    setLoginApiError("");
    loginForm.reset();
  };

  const handleClose = () => {
    closeAuthModal();
    setTimeout(() => {
      setLoginApiError("");
      loginForm.reset();
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

            {/* Register Tab — redirects to /register for full OTP-verified flow */}
            <TabsContent value="register">
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground text-center">
                  Create an account with email verification.
                </p>
                <Button
                  className="w-full gap-2"
                  onClick={handleRegisterRedirect}
                >
                  {COPY.REGISTER.CREATE}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};