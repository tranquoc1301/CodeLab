import { useState, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Tag, ChevronDown } from "lucide-react";
import api from "@/api";
import { useAuth } from "@/store/auth";
import { setStoredIntent } from "@/store/authGuard";
import {
  Card,
  CardContent,
  Badge,
  Skeleton,
  Button,
  Input,
  toast,
} from "@/components/ui";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { cn } from "@/lib/utils";
import { API, ROUTES, COPY, DEFAULTS } from "@/config";
import type { Problem } from "@/types";

function ProblemCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </Card>
  );
}

export const FilterDropdown = memo(function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
          "hover:bg-accent transition-colors",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value === "all" ? "text-muted-foreground" : ""}>
          {options.find((o) => o.value === value)?.label || label}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-1 w-full min-w-[140px] rounded-md border bg-popover p-1 shadow-lg"
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                value === option.value && "bg-accent",
              )}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const showAuthRequiredPrompt = useCallback(
    (problemSlug: string) => {
      toast(COPY.TOAST.LOGIN_REQUIRED, {
        description: COPY.TOAST.LOGIN_REQUIRED_DESC,
        action: {
          label: COPY.NAV.LOGIN,
          onClick: () => {
            setStoredIntent(ROUTES.problemDetail(problemSlug));
            navigate(ROUTES.LOGIN);
          },
        },
        duration: 6000,
      });
    },
    [navigate],
  );

  const { data: problems, isLoading } = useQuery<Problem[]>({
    queryKey: ["problems", difficulty, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (difficulty !== "all") params.append("difficulty", difficulty);
      params.append("limit", "50");
      const res = await api.get(
        `${API.ENDPOINTS.PROBLEMS}?${params.toString()}`,
      );
      return res.data;
    },
  });

  // Client-side search filtering (could be moved to server for large datasets)
  const filteredProblems = problems?.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  /**
   * Handles problem card click with authentication check.
   * Shows login prompt if user is not authenticated.
   */
  const handleProblemClick = (problemSlug: string) => {
    if (!isAuthenticated) {
      showAuthRequiredPrompt(problemSlug);
      return;
    }
    navigate(ROUTES.problemDetail(problemSlug));
  };

  /**
   * Enables keyboard navigation (Enter/Space) for problem cards.
   * Improves accessibility for screen reader users.
   */
  const handleProblemKeyDown = (e: React.KeyboardEvent, problemSlug: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleProblemClick(problemSlug);
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {COPY.HOME.TITLE}
          </h1>
          <p className="text-muted-foreground mt-1">{COPY.HOME.SUBTITLE}</p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={COPY.HOME.SEARCH_PLACEHOLDER}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search problems"
          />
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label={COPY.FILTERS.DIFFICULTY}
            value={difficulty}
            options={[
              { value: "all", label: COPY.FILTERS.ALL },
              { value: "Easy", label: COPY.FILTERS.EASY },
              { value: "Medium", label: COPY.FILTERS.MEDIUM },
              { value: "Hard", label: COPY.FILTERS.HARD },
            ]}
            onChange={setDifficulty}
          />
          <FilterDropdown
            label="Sort"
            value={sortBy}
            options={[
              { value: "newest", label: COPY.HOME.SORT_NEWEST },
              { value: "oldest", label: COPY.HOME.SORT_OLDEST },
              { value: "title", label: COPY.HOME.SORT_TITLE },
            ]}
            onChange={setSortBy}
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredProblems?.length || 0} problem
        {filteredProblems?.length === 1 ? "" : "s"}
        {search && ` matching "${search}"`}
        {difficulty !== "all" && ` with ${difficulty} difficulty`}
      </p>

      {/* Problem list */}
      <div className="grid gap-3">
        {isLoading
          ? Array.from({ length: DEFAULTS.SKELETON_COUNT }).map((_, i) => (
              <ProblemCardSkeleton key={i} />
            ))
          : filteredProblems?.map((problem) => (
              <button
                key={problem.id}
                type="button"
                onClick={() => handleProblemClick(problem.slug)}
                onKeyDown={(e) => handleProblemKeyDown(e, problem.slug)}
                className="text-left w-full group"
                aria-label={`${problem.title}. Press Enter to ${isAuthenticated ? "view" : "log in and view"}`}
              >
                <Card className="p-5 transition-all hover:border-primary/30 hover:shadow-md hover:ring-2 hover:ring-primary/20 cursor-pointer">
                  <CardContent className="p-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                          {problem.title}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {problem.topics?.slice(0, 3).map((topic) => (
                            <Badge
                              key={topic.id}
                              variant="outline"
                              className="font-normal"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {topic.name}
                            </Badge>
                          ))}
                          {problem.topics?.length > 3 && (
                            <Badge
                              variant="outline"
                              className="font-normal text-muted-foreground"
                            >
                              +{problem.topics.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
        {filteredProblems?.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{COPY.HOME.EMPTY}</p>
            <Button
              variant="link"
              onClick={() => {
                setSearch("");
                setDifficulty("all");
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
