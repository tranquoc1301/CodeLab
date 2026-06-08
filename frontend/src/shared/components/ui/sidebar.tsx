import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/shared/utils/utils";
import { Button } from "@/shared/components/ui/button";

const SIDEBAR_COOKIE_NAME = "admin:sidebar:collapsed";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "3.5rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("Sidebar components must be used within SidebarProvider");
  }
  return context;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

interface SidebarProviderProps {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  children,
}: SidebarProviderProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState<boolean>(() => {
    const stored = readCookie(SIDEBAR_COOKIE_NAME);
    if (stored === "true") return false;
    if (stored === "false") return true;
    return defaultOpen;
  });
  const open = openProp ?? _open;

  React.useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const setOpen = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(next);
      } else {
        _setOpen(next);
      }
      writeCookie(SIDEBAR_COOKIE_NAME, String(!next), SIDEBAR_COOKIE_MAX_AGE);
    },
    [setOpenProp, open],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen((prev) => !prev);
    }
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleSidebar]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, setOpen, openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={cn(
          "flex min-h-svh w-full text-foreground",
          "group/sidebar-wrapper",
          className,
        )}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  side?: "left" | "right";
  collapsible?: "icon" | "none";
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, children, ...props }, ref) => {
    const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

    if (isMobile) {
      return (
        <>
          {openMobile && (
            <div
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              onClick={() => setOpenMobile(false)}
              role="presentation"
            />
          )}
          <aside
            ref={ref}
            data-mobile="true"
            data-state={openMobile ? "open" : "closed"}
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-lg transition-transform duration-200 md:hidden",
              openMobile ? "translate-x-0" : "-translate-x-full",
              className,
            )}
            {...props}
          >
            {children}
          </aside>
        </>
      );
    }

    return (
      <aside
        ref={ref}
        data-state={state}
        className={cn(
          "hidden md:flex shrink-0 flex-col bg-card border-r border-border transition-[width] duration-200",
          state === "expanded" ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-icon)]",
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    );
  },
);
Sidebar.displayName = "Sidebar";

type SidebarHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-14 items-center border-b border-border px-3", className)}
      {...props}
    />
  ),
);
SidebarHeader.displayName = "SidebarHeader";

type SidebarContentProps = React.HTMLAttributes<HTMLDivElement>;
export const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto py-3", className)}
      {...props}
    />
  ),
);
SidebarContent.displayName = "SidebarContent";

type SidebarFooterProps = React.HTMLAttributes<HTMLDivElement>;
export const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("border-t border-border p-3", className)}
      {...props}
    />
  ),
);
SidebarFooter.displayName = "SidebarFooter";

interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
  label: string;
}

export const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, active, icon, label, children, ...props }, ref) => {
    const { state } = useSidebar();
    const isIconMode = state === "collapsed";
    return (
      <button
        ref={ref}
        type="button"
        aria-current={active ? "page" : undefined}
        aria-label={isIconMode ? label : undefined}
        title={isIconMode ? label : undefined}
        className={cn(
          "group/item flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isIconMode && "justify-center px-0",
          className,
        )}
        {...props}
      >
        {icon && (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
            {icon}
          </span>
        )}
        {!isIconMode && <span className="truncate">{children ?? label}</span>}
      </button>
    );
  },
);
SidebarItem.displayName = "SidebarItem";

interface SidebarTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ className, onClick, ...props }, ref) => {
    const { toggleSidebar, state } = useSidebar();
    return (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
        className={className}
        {...props}
      >
        {state === "expanded" ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </Button>
    );
  },
);
SidebarTrigger.displayName = "SidebarTrigger";

interface SidebarInsetProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SidebarInset = React.forwardRef<HTMLDivElement, SidebarInsetProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-1 flex-col min-w-0", className)}
      {...props}
    />
  ),
);
SidebarInset.displayName = "SidebarInset";
