import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../api';
import { useAuthStore } from '../store/auth';
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
} from '../components/ui';
import { API, ROUTES, COPY } from '../config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      const res = await api.post(API.ENDPOINTS.AUTH_LOGIN, formData, {
        headers: { 'Content-Type': API.HEADERS.FORM_URLENCODED },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setToken(data.access_token);
      navigate(ROUTES.HOME);
    },
    onError: () => {
      setError(COPY.LOGIN.ERROR);
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{COPY.LOGIN.TITLE}</CardTitle>
          <CardDescription>{COPY.LOGIN.DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{COPY.FORM_LABELS.USERNAME}</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{COPY.FORM_LABELS.PASSWORD}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? COPY.LOGIN.SIGNING_IN : COPY.LOGIN.SIGN_IN}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {COPY.LOGIN.NO_ACCOUNT}{' '}
            <Link to={ROUTES.REGISTER} className="text-primary hover:underline font-medium">
              {COPY.LOGIN.REGISTER_LINK}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
