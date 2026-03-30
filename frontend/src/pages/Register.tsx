import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { User, Mail, Lock, UserPlus, AlertCircle } from "lucide-react";
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
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={COPY.PLACEHOLDER.PASSWORD}
                  required
                  minLength={VALIDATION.MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{COPY.FORM_LABELS.CONFIRM_PASSWORD}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={COPY.PLACEHOLDER.CONFIRM_PASSWORD}
                  required
                  minLength={VALIDATION.MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={registerMutation.isPending}
            >
              <UserPlus className="h-4 w-4" />
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
              className="text-primary hover:underline font-medium"
            >
              {COPY.REGISTER.SIGN_IN_LINK}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
