import { memo } from "react";
import { AlertCircle, LogIn, X } from "lucide-react";
import { Button } from "@/components/ui";
import { COPY } from "@/config";

interface LoginPromptOverlayProps {
  onLogin: () => void;
  onDismiss: () => void;
}

export const LoginPromptOverlay = memo(function LoginPromptOverlay({
  onLogin,
  onDismiss,
}: LoginPromptOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onDismiss}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="bg-card border border-border/60 rounded-xl p-6 shadow-2xl">
          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-4 top-4 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-warning/10">
                <AlertCircle className="h-6 w-6 text-warning" aria-hidden />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="login-prompt-title"
                className="text-lg font-semibold text-foreground mb-2"
              >
                {COPY.LOGIN.GATED_TITLE}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {COPY.LOGIN.GATED_DESCRIPTION}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={onLogin} className="w-full sm:w-auto gap-2">
                  <LogIn className="h-4 w-4" aria-hidden />
                  {COPY.NAV.LOGIN}
                </Button>
                <Button
                  variant="outline"
                  onClick={onDismiss}
                  className="w-full sm:w-auto"
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
