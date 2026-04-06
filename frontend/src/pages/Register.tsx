import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { User, Mail, UserPlus, AlertCircle } from "lucide-react";
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
import { API, ROUTES, COPY, VALIDATION } from "@/config";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.AUTH_REGISTER, {
        username,
        email,
        password,
      });
      return res.data;
    },
    onSuccess: () => {
      navigate(ROUTES.LOGIN);
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        setError(detail || COPY.REGISTER.ERROR);
      } else {
        setError(COPY.REGISTER.ERROR);
      }
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(COPY.REGISTER.PASSWORD_MISMATCH);
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-lg bg-accent/10">
              <UserPlus className="h-6 w-6 text-accent" aria-hidden />
            </div>
          </div>
          <CardTitle className="text-2xl">{COPY.REGISTER.TITLE}</CardTitle>
          <CardDescription>{COPY.REGISTER.DESCRIPTION}</CardDescription>
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
                  placeholder={COPY.PLACEHOLDER.USERNAME}
                  required
                  autoComplete="username"
                  className="pl-10"
                />
              </div>
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={VALIDATION.MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                placeholder={COPY.PLACEHOLDER.PASSWORD}
              />
              {password && <PasswordStrength password={password} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{COPY.FORM_LABELS.CONFIRM_PASSWORD}</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder={COPY.PLACEHOLDER.CONFIRM_PASSWORD}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" aria-hidden />
                  {COPY.REGISTER.PASSWORD_MISMATCH}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={registerMutation.isPending}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              {registerMutation.isPending
                ? COPY.REGISTER.CREATING
                : COPY.REGISTER.CREATE}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {COPY.REGISTER.HAS_ACCOUNT}{" "}
            <Link
              to={ROUTES.LOGIN}
              className="text-primary hover:underline font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              {COPY.REGISTER.SIGN_IN_LINK}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
