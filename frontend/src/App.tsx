import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./store/auth";
import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { Toaster } from "./components/ui";
import { ROUTES, API } from "./config";
import Home from "./pages/Home";
import ProblemDetail from "./pages/ProblemDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import Submissions from "./pages/Submissions";
import api from "./api";
import { AuthModal } from "./components/auth/AuthModal";

const queryClient = new QueryClient();

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, setUser, checkTokenExpiration } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api
      .get(API.ENDPOINTS.AUTH_ME)
      .then((res) => setUser(res.data))
      .catch(() => {
        console.error("Failed to fetch user data");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setUser is a stable Zustand setter
  }, [token]);

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
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.PROBLEM_DETAIL} element={<ProblemDetail />} />
            <Route path={ROUTES.SUBMISSIONS} element={<Submissions />} />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
          </Routes>
        </main>
        {!isProblemDetailPage && <Footer />}
      </div>
      <Toaster />
      {showAuthModal && <AuthModal />}
    </AuthInitializer>
  );
}
