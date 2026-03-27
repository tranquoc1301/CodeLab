import { Link, useNavigate, BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import { useThemeStore } from './store/theme';
import { Button } from './components/ui';
import { cn } from './lib/utils';
import { ROUTES, COPY } from './config';
import Home from './pages/Home';
import ProblemDetail from './pages/ProblemDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

const queryClient = new QueryClient();

function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="rounded-lg"
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </Button>
  );
}

function Navbar() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const navLinkClass = cn(
    'text-sm font-medium text-muted-foreground',
    'transition-colors hover:text-foreground',
  );

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur',
        'supports-[backdrop-filter]:bg-background/60',
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to={ROUTES.HOME} className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-primary"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          {COPY.APP_NAME}
        </Link>
        <div className="flex items-center gap-1">
          <Link to={ROUTES.HOME} className={cn(navLinkClass, 'px-3 py-2')}>
            {COPY.NAV.PROBLEMS}
          </Link>
          {token ? (
            <>
              <Link to={ROUTES.PROFILE} className={cn(navLinkClass, 'px-3 py-2')}>
                {COPY.NAV.PROFILE}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  navigate(ROUTES.LOGIN);
                }}
              >
                {COPY.NAV.LOGOUT}
              </Button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className={cn(navLinkClass, 'px-3 py-2')}>
                {COPY.NAV.LOGIN}
              </Link>
              <Button size="sm" asChild>
                <Link to={ROUTES.REGISTER}>{COPY.NAV.REGISTER}</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.PROBLEM_DETAIL} element={<ProblemDetail />} />
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path={ROUTES.REGISTER} element={<Register />} />
              <Route path={ROUTES.PROFILE} element={<Profile />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
