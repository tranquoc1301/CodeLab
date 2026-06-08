import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/shared/components/ui/sidebar";

import { AdminSidebar } from "@/features/admin/components/AdminSidebar";

const TITLES: Array<{ match: (path: string) => boolean; label: string }> = [
  { match: (p) => p === "/admin" || p === "/admin/", label: "Overview" },
  { match: (p) => p.startsWith("/admin/problems"), label: "Problems" },
  { match: (p) => p.startsWith("/admin/topics"), label: "Topics" },
  { match: (p) => p.startsWith("/admin/users"), label: "Users" },
  { match: (p) => p.startsWith("/admin/submissions"), label: "Submissions" },
];

function getPageTitle(pathname: string): string {
  for (const t of TITLES) {
    if (t.match(pathname)) return t.label;
  }
  return "Admin";
}

export function AdminLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar currentPath={location.pathname} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Admin
            </span>
            <span className="text-muted-foreground">/</span>
            <h1 className="truncate text-base font-semibold">{title}</h1>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
