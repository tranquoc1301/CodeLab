import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sun,
  Moon,
  Code2,
  List,
  FileCode,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "@/lib/utils";
import { ROUTES, COPY } from "@/config";
import Login from "@/pages/Login";

function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={COPY.ACCESSIBILITY.TOGGLE_THEME}
      className="rounded-lg"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}

export function Header() {
  const { isAuthenticated, user, logout, showLoginModal, closeLoginModal } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  const navLinkClass = (isActive: boolean) =>
    cn(
      "text-sm font-medium px-3 py-2 rounded-md transition-colors",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-accent",
    );

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
    setUserMenuOpen(false);
  };

  const currentPath = location.pathname;
  const isProblemsActive = currentPath === ROUTES.HOME;
  const isSubmissionsActive = currentPath.includes("submissions");

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur",
          "supports-backdrop-filter:bg-background/60",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 font-bold text-lg"
          >
            <Code2 className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">{COPY.APP_NAME}</span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-1"
            role="navigation"
            aria-label="Main navigation"
          >
            <Link to={ROUTES.HOME} className={navLinkClass(isProblemsActive)}>
              <List className="h-4 w-4 mr-2 inline" aria-hidden="true" />
              {COPY.NAV.PROBLEMS}
            </Link>
            {isAuthenticated && (
              <Link
                to={ROUTES.SUBMISSIONS}
                className={navLinkClass(isSubmissionsActive)}
              >
                <FileCode className="h-4 w-4 mr-2 inline" aria-hidden="true" />
                {COPY.NAV.SUBMISSIONS}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.username}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      userMenuOpen && "rotate-180",
                    )}
                  />
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-md border bg-popover p-1 shadow-lg dropdown-enter"
                    role="menu"
                  >
                    <Link
                      to={ROUTES.PROFILE}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      {COPY.NAV.PROFILE}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      {COPY.NAV.LOGOUT}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={ROUTES.LOGIN}>{COPY.NAV.LOGIN}</Link>
                </Button>
                <Button size="sm" className="hidden sm:flex" asChild>
                  <Link to={ROUTES.REGISTER}>{COPY.NAV.REGISTER}</Link>
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={
                mobileMenuOpen
                  ? COPY.ACCESSIBILITY.CLOSE_MENU
                  : COPY.ACCESSIBILITY.OPEN_MENU
              }
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            className="md:hidden border-t bg-background"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="space-y-1 p-4">
              <Link
                to={ROUTES.HOME}
                className={navLinkClass(isProblemsActive)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <List className="h-4 w-4 mr-2 inline" />
                {COPY.NAV.PROBLEMS}
              </Link>
              {isAuthenticated && (
                <Link
                  to={ROUTES.SUBMISSIONS}
                  className={navLinkClass(isSubmissionsActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FileCode className="h-4 w-4 mr-2 inline" />
                  {COPY.NAV.SUBMISSIONS}
                </Link>
              )}
              <Link
                to={ROUTES.PROFILE}
                className={navLinkClass(false)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="h-4 w-4 mr-2 inline" />
                {COPY.NAV.SETTINGS}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <Dialog open={showLoginModal} onOpenChange={closeLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{COPY.LOGIN.GATED_TITLE}</DialogTitle>
            <DialogDescription>
              {COPY.LOGIN.GATED_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
          <Login minimal />
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-muted-foreground">
              {COPY.LOGIN.NO_ACCOUNT}{" "}
              <Link
                to={ROUTES.REGISTER}
                className="text-primary hover:underline"
                onClick={closeLoginModal}
              >
                {COPY.LOGIN.REGISTER_LINK}
              </Link>
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
