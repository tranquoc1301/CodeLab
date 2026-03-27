import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import api from '../api';
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
import { API, ROUTES, COPY, VALIDATION } from '../config';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(API.ENDPOINTS.AUTH_REGISTER, { username, email, password });
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
    setError('');
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
              <Label htmlFor="email">{COPY.FORM_LABELS.EMAIL}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                minLength={VALIDATION.MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? COPY.REGISTER.CREATING : COPY.REGISTER.CREATE}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {COPY.REGISTER.HAS_ACCOUNT}{' '}
            <Link to={ROUTES.LOGIN} className="text-primary hover:underline font-medium">
              {COPY.REGISTER.SIGN_IN_LINK}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
