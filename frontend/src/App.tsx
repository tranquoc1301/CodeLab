import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { useAuth } from "./store/auth";
import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { Toaster } from "./components/ui";
import { ROUTES, API } from "./config";
import api from "./api";
import { AuthModal } from "./components/auth/AuthModal";

// Code-split route components - Monaco loaded only when needed
const Home = lazy(() => import("./pages/Home"));
const ProblemDetail = lazy(() => import("./pages/ProblemDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Submissions = lazy(() => import("./pages/Submissions"));
const ListDetail = lazy(() => import("./pages/ListDetail"));
const ProblemLists = lazy(() => import("./pages/ProblemLists"));

// Loading fallback for code-split components
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

const queryClient = new QueryClient();

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, setUser, checkTokenExpiration } = useAuth();
  const navigate = useNavigate();

  // Start token validation immediately, await only when navigation needed
  useEffect(() => {
    if (!token) return;

    // Fire user fetch immediately (no await) - start Promise early
    api
      .get(API.ENDPOINTS.AUTH_ME)
      .then((res) => setUser(res.data))
      .catch(() => {
        console.error("Failed to fetch user data");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- token is stable auth state
  }, [token]);

  // Check token expiration every 30s using setInterval (not dependent on fetch)
  useEffect(() => {
    const interval = setInterval(() => {
      if (checkTokenExpiration()) {
        navigate("/login");
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [checkTokenExpiration, navigate]);

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
  const isProblemDetailPage = location.pathname.startsWith("/problems/");
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
      <Toaster />
      {showAuthModal && <AuthModal />}
    </AuthInitializer>
  );
}
