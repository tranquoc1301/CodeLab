import * as React from "react";
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

export const AuthModal = () => {
  const { closeAuthModal, authModalTab, setAuthModalTab, setToken, setUser } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginUsername, setLoginUsername] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginError, setLoginError] = React.useState("");

  // Register form state
  const [registerUsername, setRegisterUsername] = React.useState("");
  const [registerEmail, setRegisterEmail] = React.useState("");
  const [registerPassword, setRegisterPassword] = React.useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = React.useState("");
  const [registerError, setRegisterError] = React.useState("");

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
      // Clear form
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterError("");
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        setRegisterError(detail || COPY.REGISTER.ERROR);
      } else {
        setRegisterError(COPY.REGISTER.ERROR);
      }
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    loginMutation.mutate();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError(COPY.REGISTER.PASSWORD_MISMATCH);
      return;
    }
    registerMutation.mutate();
  };

  const handleTabChange = (value: string) => {
    setAuthModalTab(value as "login" | "register");
    setLoginError("");
    setRegisterError("");
  };

  const handleClose = () => {
    closeAuthModal();
    // Reset forms after animation
    setTimeout(() => {
      setLoginUsername("");
      setLoginPassword("");
      setLoginError("");
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterError("");
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
        className={cn(
          "relative z-10 w-full max-w-md animate-slide-up",
          "bg-card border border-border rounded-xl shadow-2xl",
          "transition-all duration-200 ease-out"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
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
                  <div className="relative">
                    <Input
                      id="auth-login-username"
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder={COPY.PLACEHOLDER.USERNAME}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-login-password">{COPY.FORM_LABELS.PASSWORD}</Label>
                  <PasswordInput
                    id="auth-login-password"
                    value={loginPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder={COPY.PLACEHOLDER.PASSWORD}
                  />
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder={COPY.PLACEHOLDER.USERNAME}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-email">{COPY.FORM_LABELS.EMAIL}</Label>
                  <Input
                    id="auth-register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder={COPY.PLACEHOLDER.EMAIL}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-password">{COPY.FORM_LABELS.PASSWORD}</Label>
                  <PasswordInput
                    id="auth-register-password"
                    value={registerPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder={COPY.PLACEHOLDER.PASSWORD}
                  />
                  {registerPassword && (
                    <PasswordStrength password={registerPassword} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-register-confirm">{COPY.FORM_LABELS.CONFIRM_PASSWORD}</Label>
                  <PasswordInput
                    id="auth-register-confirm"
                    value={registerConfirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder={COPY.PLACEHOLDER.CONFIRM_PASSWORD}
                  />
                  {registerConfirmPassword && registerPassword !== registerConfirmPassword && (
                    <p className="text-xs text-destructive mt-1">
                      {COPY.REGISTER.PASSWORD_MISMATCH}
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
