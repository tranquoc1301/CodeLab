import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { User, LogIn, AlertCircle } from "lucide-react";
import api from "@/api";
import { useAuth } from "@/store/auth";
import { getAndClearIntent } from "@/store/authGuard";
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
import { API, ROUTES, COPY } from "@/config";
import type { User as UserData } from "@/types";

interface LoginProps {
  minimal?: boolean;
}

export default function Login({ minimal = false }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setToken, setUser, closeLoginModal, loginRedirectPath } = useAuth();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);
      const res = await api.post(API.ENDPOINTS.AUTH_LOGIN, formData, {
        headers: { "Content-Type": API.HEADERS.FORM_URLENCODED },
      });
      return res.data;
    },
    onSuccess: async (data) => {
      setToken(data.access_token);

      try {
        const userRes = await api.get(API.ENDPOINTS.AUTH_ME);
        setUser(userRes.data as UserData);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }

      closeLoginModal();
      const intentPath = getAndClearIntent();
      if (intentPath) {
        navigate(intentPath);
      } else if (loginRedirectPath) {
        navigate(loginRedirectPath);
      } else if (!minimal) {
        navigate(ROUTES.HOME);
      }
    },
    onError: () => {
      setError(COPY.LOGIN.ERROR);
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate();
  };

  if (minimal) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="username-minimal">{COPY.FORM_LABELS.USERNAME}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="username-minimal"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="pl-10"
              placeholder={COPY.PLACEHOLDER.USERNAME}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password-minimal">{COPY.FORM_LABELS.PASSWORD}</Label>
          <PasswordInput
            id="password-minimal"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
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
          <LogIn className="h-4 w-4" />
          {loginMutation.isPending ? COPY.LOGIN.SIGNING_IN : COPY.LOGIN.SIGN_IN}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-accent/20 to-transparent" />

      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-lg bg-primary/10">
              <LogIn className="h-6 w-6 text-primary" aria-hidden />
            </div>
          </div>
          <CardTitle className="text-2xl">{COPY.LOGIN.TITLE}</CardTitle>
          <CardDescription>{COPY.LOGIN.DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{COPY.FORM_LABELS.USERNAME}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="pl-10"
                  placeholder={COPY.PLACEHOLDER.USERNAME}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
                autoComplete="current-password"
                placeholder={COPY.PLACEHOLDER.PASSWORD}
              />
            </div>
            <div className="flex items-center justify-end text-sm">
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-primary hover:underline font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loginMutation.isPending}
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {loginMutation.isPending
                ? COPY.LOGIN.SIGNING_IN
                : COPY.LOGIN.SIGN_IN}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {COPY.LOGIN.NO_ACCOUNT}{" "}
            <Link
              to={ROUTES.REGISTER}
              className="text-primary hover:underline font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              {COPY.LOGIN.REGISTER_LINK}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
