import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sun,
  Moon,
  Code2,
  List,
  FileCode,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Bookmark,
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
      className="rounded-lg hover:bg-accent transition-colors"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-200 hover:-rotate-12" />
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
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuItemsRef = useRef<HTMLDivElement>(null);
  const [activeMenuIndex, setActiveMenuIndex] = useState(-1);
  const isProblemDetailPage = location.pathname.startsWith("/problems/");

  const userMenuItems = [
    { label: COPY.NAV.PROFILE, to: ROUTES.PROFILE },
    { label: COPY.NAV.PROBLEM_LISTS, to: ROUTES.PROBLEM_LISTS },
  ];

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

  // Keyboard navigation for user menu
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const maxIndex = userMenuItems.length;
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setUserMenuOpen(false);
          userMenuButtonRef.current?.focus();
          break;
        case "ArrowDown":
          e.preventDefault();
          setActiveMenuIndex((prev) => (prev < maxIndex - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveMenuIndex((prev) => (prev > 0 ? prev - 1 : maxIndex - 1));
          break;
        case "Home":
          e.preventDefault();
          setActiveMenuIndex(0);
          break;
        case "End":
          e.preventDefault();
          setActiveMenuIndex(maxIndex - 1);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [userMenuOpen, userMenuItems.length]);

  const navLinkClass = (isActive: boolean) =>
    cn(
      "text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200",
      isActive
        ? "bg-primary/15 text-primary font-semibold"
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
          "sticky top-0 z-50 w-full",
          // Glassmorphism effect
          "glass",
          // Floating style with spacing from edges
          "mx-4 rounded-xl",
          // Add margin-top only when not on problem detail page
          !isProblemDetailPage && "mt-4",
          // Responsive max-width
          "max-w-[calc(100%-2rem)]",
        )}
      >
        <div className="mx-auto flex h-14 items-center justify-between px-4 lg:px-6">
          {/* Logo */}
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 font-bold text-lg group"
          >
            <div className="relative">
              <Code2
                className="h-6 w-6 text-primary transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <span className="hidden sm:inline font-heading">
              {COPY.APP_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  ref={userMenuButtonRef}
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                    "hover:bg-accent transition-colors duration-200",
                    userMenuOpen && "bg-accent",
                  )}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-controls="user-menu"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden sm:inline">{user?.username}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      userMenuOpen && "rotate-180",
                    )}
                  />
                </button>
                {userMenuOpen && (
                  <div
                    id="user-menu"
                    ref={userMenuItemsRef}
                    className="absolute right-0 mt-2 w-56 rounded-lg border bg-popover p-1 shadow-lg dropdown-enter"
                    role="menu"
                    onKeyDown={(e) => {
                      const maxIndex = userMenuItems.length;
                      switch (e.key) {
                        case "ArrowDown":
                          e.stopPropagation();
                          setActiveMenuIndex((prev) =>
                            prev < maxIndex - 1 ? prev + 1 : 0
                          );
                          break;
                        case "ArrowUp":
                          e.stopPropagation();
                          setActiveMenuIndex((prev) =>
                            prev > 0 ? prev - 1 : maxIndex - 1
                          );
                          break;
                        case "Home":
                          e.stopPropagation();
                          setActiveMenuIndex(0);
                          break;
                        case "End":
                          e.stopPropagation();
                          setActiveMenuIndex(maxIndex - 1);
                          break;
                        case "Escape":
                          e.stopPropagation();
                          setUserMenuOpen(false);
                          userMenuButtonRef.current?.focus();
                          break;
                      }
                    }}
                  >
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                    {userMenuItems.map((item, index) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent transition-colors",
                          activeMenuIndex === index && "bg-accent",
                        )}
                        role="menuitem"
                        aria-current={currentPath === item.to ? "page" : undefined}
                        onClick={() => {
                          setUserMenuOpen(false);
                          setActiveMenuIndex(-1);
                        }}
                        onMouseEnter={() => setActiveMenuIndex(index)}
                        onMouseLeave={() => setActiveMenuIndex(-1)}
                      >
                        <User className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent transition-colors text-destructive"
                      role="menuitem"
                      onMouseEnter={() => setActiveMenuIndex(-1)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.stopPropagation();
                        }
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {COPY.NAV.LOGOUT}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
            {!isAuthenticated && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to={ROUTES.LOGIN}>{COPY.NAV.LOGIN}</Link>
                </Button>
                <Button
                  className="hidden sm:flex glow-primary"
                  asChild
                >
                  <Link to={ROUTES.REGISTER}>{COPY.NAV.REGISTER}</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
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
                <X className="h-5 w-5 transition-transform duration-200" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav
            className="md:hidden border-t border-border/50"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="space-y-1 p-4">
              <Link
                to={ROUTES.HOME}
                className={cn(navLinkClass(isProblemsActive), "block")}
                onClick={() => setMobileMenuOpen(false)}
              >
                <List className="h-4 w-4 mr-2 inline" />
                {COPY.NAV.PROBLEMS}
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to={ROUTES.SUBMISSIONS}
                    className={cn(navLinkClass(isSubmissionsActive), "block")}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FileCode className="h-4 w-4 mr-2 inline" />
                    {COPY.NAV.SUBMISSIONS}
                  </Link>
                  <Link
                    to={ROUTES.PROBLEM_LISTS}
                    className={cn(navLinkClass(false), "block")}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bookmark className="h-4 w-4 mr-2 inline" />
                    {COPY.NAV.PROBLEM_LISTS}
                  </Link>
                </>
              )}
              <Link
                to={ROUTES.PROFILE}
                className={cn(navLinkClass(false), "block")}
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-4 w-4 mr-2 inline" />
                {COPY.NAV.PROFILE}
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={closeLoginModal}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {COPY.LOGIN.GATED_TITLE}
            </DialogTitle>
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
                className="text-primary hover:underline font-medium"
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
