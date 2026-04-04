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
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onDismiss}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative z-10 max-w-md mx-4 bg-popover border border-border/60 rounded-xl p-6 shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10 shrink-0 mt-0.5">
            <AlertCircle className="h-5 w-5 text-warning" aria-hidden />
          </div>
          <div className="flex-1">
            <p
              id="login-prompt-title"
              className="font-semibold text-foreground"
            >
              {COPY.LOGIN.GATED_TITLE}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5">
              {COPY.LOGIN.GATED_DESCRIPTION}
            </p>
            <div className="mt-5 flex gap-2">
              <Button size="sm" onClick={onLogin} className="gap-1.5">
                <LogIn className="h-4 w-4" aria-hidden />
                {COPY.NAV.LOGIN}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
