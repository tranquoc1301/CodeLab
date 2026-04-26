import { useAuth } from "@/app/store/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {COPY, DEFAULTS} from "@/shared/config";

export default function Profile() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground text-lg">
          {COPY.PROFILE.LOGIN_REQUIRED}
        </p>
      </div>
    );
  }

  return (
    <div className="py-10 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        {COPY.PROFILE.TITLE}
      </h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.username}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">
                  {COPY.PROFILE.USERNAME}
                </span>
                <p className="font-medium">{user?.username}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  {COPY.PROFILE.EMAIL}
                </span>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  {COPY.PROFILE.JOINED}
                </span>
                <p className="font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString(
                        DEFAULTS.LOCALE,
                        DEFAULTS.DATE_FORMAT,
                      )
                    : COPY.PROFILE.NOT_AVAILABLE}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {COPY.PROFILE.SKILL_MAP_TITLE}
          </CardTitle>
          <CardDescription>
            {COPY.PROFILE.SKILL_MAP_DESCRIPTION}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}