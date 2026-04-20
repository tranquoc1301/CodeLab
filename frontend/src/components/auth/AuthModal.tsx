import * as React from "react";
import { useEffect, useRef } from "react";
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
import { loginSchema, registerSchema, validateLogin, validateRegister } from "@/lib/validation";

export const AuthModal = () => {
  const { closeAuthModal, authModalTab, setAuthModalTab, setToken, setUser } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginError, setLoginError] = React.useState("");
  const [loginFieldErrors, setLoginFieldErrors] = React.useState<Record<string, string>>({});
  const [loginTouched, setLoginTouched] = React.useState<Record<string, boolean>>({});

  // Register form state
  const [registerUsername, setRegisterUsername] = React.useState("");
  const [registerEmail, setRegisterEmail] = React.useState("");
  const [registerPassword, setRegisterPassword] = React.useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = React.useState("");
  const [registerError, setRegisterError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

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

  // Register field validation - validate single field with Zod
  const validateRegisterField = (field: string, value: string) => {
    const partialData = {
      username: field === "username" ? value : registerUsername,
      email: field === "email" ? value : registerEmail,
      password: field === "password" ? value : registerPassword,
      confirmPassword: field === "confirmPassword" ? value : registerConfirmPassword,
    };
    const result = registerSchema.safeParse(partialData);
    if (!result.success) {
      const fieldError = result.error.issues.find(i => String(i.path[0]) === field);
      setFieldErrors(prev => {
        if (fieldError) return { ...prev, [field]: fieldError.message };
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setFieldErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Login field validation - validate single field with Zod
  const validateLoginField = (field: string, value: string) => {
    const partialData = {
      username: field === "username" ? value : loginUsername,
      password: field === "password" ? value : loginPassword,
    };
    const result = loginSchema.safeParse(partialData);
    if (!result.success) {
      const fieldError = result.error.issues.find(i => String(i.path[0]) === field);
      setLoginFieldErrors(prev => {
        if (fieldError) return { ...prev, [field]: fieldError.message };
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setLoginFieldErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      const formData = new URLSearchParams();
      formData.append("username", loginUsername);
      formData.append("password", loginPassword);
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
      setLoginError(COPY.LOGIN.ERROR);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/register", {
        username: registerUsername,
        email: registerEmail,
        password: registerPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      closeAuthModal();
      setAuthModalTab("login");
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterError("");
      setFieldErrors({});
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        if (detail?.toLowerCase().includes("username")) {
          setFieldErrors({ username: detail });
        } else if (detail?.toLowerCase().includes("email")) {
          setFieldErrors({ email: detail });
        } else {
          setRegisterError(detail || COPY.REGISTER.ERROR);
        }
      } else {
        setRegisterError(COPY.REGISTER.ERROR);
      }
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginFieldErrors({});
    setLoginTouched({ username: true, password: true });

    // Validate all fields with Zod
    const errors = validateLogin({
      username: loginUsername,
      password: loginPassword,
    });

    if (Object.keys(errors).length > 0) {
      setLoginFieldErrors(errors);
      return;
    }

    loginMutation.mutate();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    setFieldErrors({});
    setTouched({ username: true, email: true, password: true, confirmPassword: true });

    const errors = validateRegister({
      username: registerUsername,
      email: registerEmail,
      password: registerPassword,
      confirmPassword: registerConfirmPassword,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    registerMutation.mutate();
  };

  const handleTabChange = (value: string) => {
    setAuthModalTab(value as "login" | "register");
    setLoginError("");
    setLoginFieldErrors({});
    setLoginTouched({});
    setRegisterError("");
    setFieldErrors({});
    setTouched({});
  };

  const handleClose = () => {
    closeAuthModal();
    setTimeout(() => {
      setLoginUsername("");
      setLoginPassword("");
      setLoginError("");
      setLoginFieldErrors({});
      setLoginTouched({});
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterError("");
      setFieldErrors({});
      setTouched({});
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
              {loginError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-login-username">{COPY.FORM_LABELS.USERNAME}</Label>
                  <Input
                    id="auth-login-username"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      if (loginTouched.username) validateLoginField("username", e.target.value);
                    }}
                    onBlur={(e) => {
                      setLoginTouched((prev) => ({ ...prev, username: true }));
                      validateLoginField("username", e.target.value);
                    }}
                    aria-describedby={loginFieldErrors.username ? "auth-login-username-error" : undefined}
                    aria-invalid={!!loginFieldErrors.username}
                    required
                    autoComplete="username"
                    placeholder={COPY.PLACEHOLDER.USERNAME}
                  />
                  {loginFieldErrors.username && (
                    <p id="auth-login-username-error" className="text-xs text-destructive">
                      {loginFieldErrors.username}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-login-password">{COPY.FORM_LABELS.PASSWORD}</Label>
                  <PasswordInput
                    id="auth-login-password"
                    value={loginPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setLoginPassword(e.target.value);
                      if (loginTouched.password) validateLoginField("password", e.target.value);
                    }}
                    onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setLoginTouched((prev) => ({ ...prev, password: true }));
                      validateLoginField("password", e.target.value);
                    }}
                    aria-describedby={loginFieldErrors.password ? "auth-login-password-error" : undefined}
                    aria-invalid={!!loginFieldErrors.password}
                    required
                    autoComplete="current-password"
                    placeholder={COPY.PLACEHOLDER.PASSWORD}
                  />
                  {loginFieldErrors.password && (
                    <p id="auth-login-password-error" className="text-xs text-destructive">
                      {loginFieldErrors.password}
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
              {registerError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-register-username">{COPY.FORM_LABELS.USERNAME}</Label>
                  <Input
                    id="auth-register-username"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => {
                      setRegisterUsername(e.target.value);
                      if (touched.username) validateRegisterField("username", e.target.value);
                    }}
                    onBlur={(e) => {
                      setTouched((prev) => ({ ...prev, username: true }));
                      validateRegisterField("username", e.target.value);
                    }}
                    aria-describedby={fieldErrors.username ? "auth-register-username-error" : undefined}
                    aria-invalid={!!fieldErrors.username}
                    required
                    autoComplete="username"
                    placeholder={COPY.PLACEHOLDER.USERNAME}
                  />
                  {fieldErrors.username && (
                    <p id="auth-register-username-error" className="text-xs text-destructive">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-email">{COPY.FORM_LABELS.EMAIL}</Label>
                  <Input
                    id="auth-register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => {
                      setRegisterEmail(e.target.value);
                      if (touched.email) validateRegisterField("email", e.target.value);
                    }}
                    onBlur={(e) => {
                      setTouched((prev) => ({ ...prev, email: true }));
                      validateRegisterField("email", e.target.value);
                    }}
                    aria-describedby={fieldErrors.email ? "auth-register-email-error" : undefined}
                    aria-invalid={!!fieldErrors.email}
                    required
                    autoComplete="email"
                    placeholder={COPY.PLACEHOLDER.EMAIL}
                  />
                  {fieldErrors.email && (
                    <p id="auth-register-email-error" className="text-xs text-destructive">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-password">{COPY.FORM_LABELS.PASSWORD}</Label>
                  <PasswordInput
                    id="auth-register-password"
                    value={registerPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setRegisterPassword(e.target.value);
                      if (touched.password) validateRegisterField("password", e.target.value);
                    }}
                    onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setTouched((prev) => ({ ...prev, password: true }));
                      validateRegisterField("password", e.target.value);
                    }}
                    aria-describedby={fieldErrors.password ? "auth-register-password-error" : undefined}
                    aria-invalid={!!fieldErrors.password}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder={COPY.PLACEHOLDER.PASSWORD}
                  />
                  {registerPassword && <PasswordStrength password={registerPassword} />}
                  {fieldErrors.password && (
                    <p id="auth-register-password-error" className="text-xs text-destructive">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-confirm">{COPY.FORM_LABELS.CONFIRM_PASSWORD}</Label>
                  <PasswordInput
                    id="auth-register-confirm"
                    value={registerConfirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setRegisterConfirmPassword(e.target.value);
                      if (touched.confirmPassword) validateRegisterField("confirmPassword", e.target.value);
                    }}
                    onBlur={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setTouched((prev) => ({ ...prev, confirmPassword: true }));
                      validateRegisterField("confirmPassword", e.target.value);
                    }}
                    aria-describedby={fieldErrors.confirmPassword ? "auth-register-confirm-error" : undefined}
                    aria-invalid={!!fieldErrors.confirmPassword}
                    required
                    autoComplete="new-password"
                    placeholder={COPY.PLACEHOLDER.CONFIRM_PASSWORD}
                  />
                  {fieldErrors.confirmPassword && (
                    <p id="auth-register-confirm-error" className="text-xs text-destructive">
                      {fieldErrors.confirmPassword}
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