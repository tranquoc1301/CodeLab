import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Code2,
  Tag,
  Users,
  FileCode,
  LogOut,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";

import { useAuth } from "@/app/store/auth";
import { ROUTES } from "@/app/router";
import { cn } from "@/shared/utils/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
} from "@/shared/components/ui/sidebar";
import type { User } from "@/shared/types";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
}

function buildNavItems(): NavItem[] {
  return [
    {
      label: "Overview",
      to: ROUTES.ADMIN_ROOT,
      icon: <LayoutDashboard className="h-4 w-4" />,
      match: (p) => p === ROUTES.ADMIN_ROOT || p === `${ROUTES.ADMIN_ROOT}/`,
    },
    {
      label: "Problems",
      to: ROUTES.ADMIN_PROBLEMS,
      icon: <Code2 className="h-4 w-4" />,
      match: (p) => p.startsWith(ROUTES.ADMIN_PROBLEMS),
    },
    {
      label: "Topics",
      to: ROUTES.ADMIN_TOPICS,
      icon: <Tag className="h-4 w-4" />,
      match: (p) => p.startsWith(ROUTES.ADMIN_TOPICS),
    },
    {
      label: "Users",
      to: ROUTES.ADMIN_USERS,
      icon: <Users className="h-4 w-4" />,
      match: (p) => p.startsWith(ROUTES.ADMIN_USERS),
    },
    {
      label: "Submissions",
      to: ROUTES.ADMIN_SUBMISSIONS,
      icon: <FileCode className="h-4 w-4" />,
      match: (p) => p.startsWith(ROUTES.ADMIN_SUBMISSIONS),
    },
  ];
}

interface AdminSidebarProps {
  currentPath: string;
}

export function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const items = buildNavItems();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <nav className="flex flex-col gap-1 px-2" aria-label="Admin navigation">
          {items.map((item) => (
            <a
              key={item.to}
              href={item.to}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.to);
              }}
              className={cn(
                "group/item flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                item.match(currentPath)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                "sidebar-collapsed:justify-center sidebar-collapsed:px-0",
              )}
              aria-current={item.match(currentPath) ? "page" : undefined}
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                {item.icon}
              </span>
              <span className="truncate sidebar-collapsed:hidden group-data-[state=collapsed]/sidebar:hidden">
                {item.label}
              </span>
            </a>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <UserFooter user={user} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}

function Brand() {
  return (
    <a
      href={ROUTES.HOME}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = ROUTES.HOME;
      }}
      className="flex items-center gap-2 font-bold text-base group"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Code2 className="h-4 w-4" />
      </div>
      <span className="truncate sidebar-collapsed:hidden group-data-[state=collapsed]/sidebar:hidden">
        CodeLab Admin
      </span>
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground sidebar-collapsed:hidden" />
    </a>
  );
}

function UserFooter({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  const display = user?.username ?? "Admin";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          {user?.username ? (
            <span className="text-sm font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserIcon className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1 sidebar-collapsed:hidden group-data-[state=collapsed]/sidebar:hidden">
          <p className="truncate text-sm font-medium">{display}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>
      <SidebarItem
        icon={<LogOut className="h-4 w-4" />}
        label="Logout"
        onClick={onLogout}
        className="text-destructive hover:bg-destructive/10"
      >
        Logout
      </SidebarItem>
    </div>
  );
}
