import { Link } from "react-router-dom";
import { Code2, Heart, ExternalLink, Link as LinkIcon } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { ROUTES, COPY } from '@/app/router';
import { useAuth } from "@/app/store/auth";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const { isAuthenticated } = useAuth();

  return (
    <footer
      className={cn(
        "border-t bg-secondary/30 supports-[backdrop-filter]:bg-secondary/20 mt-auto",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link
              to={ROUTES.HOME}
              className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors duration-200 group"
            >
              <div className="relative">
                <Code2 className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                <div className="absolute inset-0 bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <span className="font-heading">{COPY.APP_NAME}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs text-center md:text-left">
              Build better, ship faster. Practice coding problems and level up your skills.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <nav className="flex items-center gap-6 text-sm">
              <Link
                to={ROUTES.HOME}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:underline underline-offset-4"
              >
                Problems
              </Link>
              {isAuthenticated && (
                <Link
                  to={ROUTES.SUBMISSIONS}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Submissions
                </Link>
              )}
            </nav>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                aria-label="GitHub"
              >
                <LinkIcon className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                aria-label="Twitter"
              >
                <LinkIcon className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Source</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Built with</span>
            <Heart className="h-4 w-4 text-destructive fill-destructive animate-pulse-subtle" aria-hidden="true" />
            <span>using React + TypeScript</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} <span className="font-medium text-foreground">{COPY.APP_NAME}</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}