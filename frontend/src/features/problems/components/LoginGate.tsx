import { memo } from "react";
import { Lock } from "lucide-react";
import {COPY} from "@/shared/config";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

interface LoginGateProps {
  onLogin: () => void;
}

export const LoginGate = memo(function LoginGate({ onLogin }: LoginGateProps) {
  return (
    <div className="flex items-center justify-center h-full bg-background/50 backdrop-blur-sm">
      <Card className="p-6 text-center max-w-sm w-full border-border/60 bg-card/80 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col items-center">
          <div className="p-3 rounded-full bg-muted/60 mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            {COPY.LOGIN.GATED_TITLE}
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">
            {COPY.LOGIN.GATED_DESCRIPTION}
          </p>
          <Button onClick={onLogin} className="w-full">
            {COPY.NAV.LOGIN}
          </Button>
        </div>
      </Card>
    </div>
  );
});
