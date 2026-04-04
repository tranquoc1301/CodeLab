import { Link } from "react-router-dom";
import { Code2, Heart, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import { ROUTES, COPY } from "../config";
import { useAuth } from "../store/auth";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const { isAuthenticated } = useAuth();

  return (
    <footer
      className={cn(
        "border-t bg-background/50 supports-[backdrop-filter]:bg-background/40 mt-auto",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link
              to={ROUTES.HOME}
              className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
            >
              <Code2 className="h-5 w-5" aria-hidden="true" />
              <span>{COPY.APP_NAME}</span>
            </Link>
            <p className="text-xs text-muted-foreground">
              Build better, one problem at a time.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-4 text-sm">
              <Link
                to={ROUTES.HOME}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Problems
              </Link>
              {isAuthenticated && (
                <Link
                  to={ROUTES.SUBMISSIONS}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Submissions
                </Link>
              )}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart
              className="h-4 w-4 text-red-500 fill-red-500 mb-0.5"
              aria-hidden="true"
            />
            <span>
              &copy; {new Date().getFullYear()} {COPY.APP_NAME}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
