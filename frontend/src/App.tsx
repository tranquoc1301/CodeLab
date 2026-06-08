import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy, useEffect, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
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

// Admin pages
const AdminLayout = lazy(() =>
  import("@/features/admin/pages/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const OverviewPage = lazy(() =>
  import("@/features/admin/pages/OverviewPage").then((m) => ({ default: m.OverviewPage })),
);
const ProblemsPage = lazy(() =>
  import("@/features/admin/pages/ProblemsPage").then((m) => ({ default: m.ProblemsPage })),
);
const TopicsPage = lazy(() =>
  import("@/features/admin/pages/TopicsPage").then((m) => ({ default: m.TopicsPage })),
);
const UsersPage = lazy(() =>
  import("@/features/admin/pages/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const SubmissionsPage = lazy(() =>
  import("@/features/admin/pages/SubmissionsPage").then((m) => ({ default: m.SubmissionsPage })),
);

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

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to access the admin panel");
    } else if (user && !user.is_admin) {
      toast.error("Admin access required");
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  }
  if (!user?.is_admin) {
    return <Navigate to={ROUTES.HOME} replace />;
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
  const isAdminRoute = useMemo(
    () => location.pathname.startsWith("/admin"),
    [location.pathname]
  );
  const { showAuthModal } = useAuth();

  if (isAdminRoute) {
    return (
      <AuthInitializer>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route path={ROUTES.ADMIN_ROOT} element={<OverviewPage />} />
              <Route path={ROUTES.ADMIN_PROBLEMS} element={<ProblemsPage />} />
              <Route path={ROUTES.ADMIN_TOPICS} element={<TopicsPage />} />
              <Route path={ROUTES.ADMIN_USERS} element={<UsersPage />} />
              <Route path={ROUTES.ADMIN_SUBMISSIONS} element={<SubmissionsPage />} />
            </Route>
            <Route path="*" element={<Navigate to={ROUTES.ADMIN_ROOT} replace />} />
          </Routes>
        </Suspense>
        {showAuthModal && <AuthModal />}
      </AuthInitializer>
    );
  }

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
