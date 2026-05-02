import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Suspense, lazy, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/app/store/auth";
import { Header } from "@/app/layouts/Header";
import { Footer } from "@/app/layouts/Footer";
import { ROUTES } from "@/app/router";
import { AuthModal } from "@/features/auth/components/AuthModal";

// Code-split route components - Monaco loaded only when needed
const Home = lazy(() => import("@/features/problems/pages/Home"));
const ProblemDetail = lazy(() => import("@/features/problems/pages/ProblemDetail"));
const Login = lazy(() => import("@/features/auth/pages/Login"));
const Register = lazy(() => import("@/features/auth/pages/Register"));
const ForgotPassword = lazy(() => import("@/features/auth/pages/ForgotPassword"));
const Profile = lazy(() => import("@/features/profile/pages/Profile"));
const Submissions = lazy(() => import("@/features/submissions/pages/Submissions"));
const ListDetail = lazy(() => import("@/features/problems/pages/ListDetail"));
const ProblemLists = lazy(() => import("@/features/problems/pages/ProblemLists"));

// Loading fallback for code-split components
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

const queryClient = new QueryClient();

function AuthInitializer({ children }: { children: ReactNode }) {
  const { fetchUser, isLoading } = useAuth();

  // Check auth status on mount - cookie is sent automatically
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Show nothing while checking auth to prevent flash of logged-out state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function AppLayout() {
  const location = useLocation();
  // Memoize: only recomputes when pathname actually changes
  const isProblemDetailPage = useMemo(
    () => location.pathname.startsWith("/problems/"),
    [location.pathname]
  );
  const { showAuthModal } = useAuth();

  return (
    <AuthInitializer>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main
          className={`flex-1 mx-auto w-full px-4 py-3 sm:px-6 lg:px-8 ${!isProblemDetailPage ? "max-w-7xl" : ""}`}
        >
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.PROBLEM_DETAIL} element={<ProblemDetail />} />
              <Route path={ROUTES.SUBMISSIONS} element={<Submissions />} />
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path={ROUTES.REGISTER} element={<Register />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
              <Route path={ROUTES.PROFILE} element={<Profile />} />
              <Route path={ROUTES.PROBLEM_LISTS} element={<ProblemLists />} />
              <Route path={ROUTES.PROBLEM_LIST_DETAIL} element={<ListDetail />} />
            </Routes>
          </Suspense>
        </main>
        {!isProblemDetailPage && <Footer />}
      </div>
      {showAuthModal && <AuthModal />}
    </AuthInitializer>
  );
}