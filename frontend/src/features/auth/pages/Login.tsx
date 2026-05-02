import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, LogIn } from "lucide-react";
import { useAuth } from "@/app/store/auth";
import { getAndClearIntent } from "@/app/store/authGuard";
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
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import {COPY} from "@/shared/config";
import { ROUTES } from "@/app/router";
import type { User as UserData } from "@/shared/types";
import { loginSchema } from "@/shared/utils/validation";
import { authApi } from "@/features/auth/api";
import { useLoginMutation } from "@/features/auth/hooks";
import type { LoginFormData, LoginProps } from "@/features/auth/types";

export default function Login({ minimal = false }: LoginProps) {
  const navigate = useNavigate();
  const { setUser, closeLoginModal, loginRedirectPath } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
    mode: "onBlur",
  });

  const loginMutation = useLoginMutation({
    onSuccess: async () => {
      // Cookie is set by backend automatically, just fetch user data
      try {
        const userRes = await authApi.getMe();
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
      // Server returns 401 with "Invalid username or password"
      setError("root", { 
        message: COPY.LOGIN.ERROR,
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  if (minimal) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="username-minimal">{COPY.FORM_LABELS.USERNAME}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="username-minimal"
              type="text"
              {...register("username")}
              required
              autoComplete="username"
              className="pl-10"
              placeholder={COPY.PLACEHOLDER.USERNAME}
              aria-describedby={errors.username ? "username-minimal-error" : undefined}
              aria-invalid={!!errors.username}
            />
          </div>
          {errors.username && (
            <p id="username-minimal-error" className="text-sm text-destructive">{errors.username.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password-minimal">{COPY.FORM_LABELS.PASSWORD}</Label>
          <PasswordInput
            id="password-minimal"
            {...register("password")}
            required
            autoComplete="current-password"
            placeholder={COPY.PLACEHOLDER.PASSWORD}
            aria-describedby={errors.password ? "password-minimal-error" : undefined}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p id="password-minimal-error" className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{COPY.FORM_LABELS.USERNAME}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  {...register("username")}
                  required
                  autoComplete="username"
                  className="pl-10"
                  placeholder={COPY.PLACEHOLDER.USERNAME}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  aria-invalid={!!errors.username}
                />
              </div>
              {errors.username && (
                <p id="username-error" className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
              <PasswordInput
                id="password"
                {...register("password")}
                required
                autoComplete="current-password"
                placeholder={COPY.PLACEHOLDER.PASSWORD}
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
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
