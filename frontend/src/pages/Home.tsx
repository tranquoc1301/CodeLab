import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/store/auth";
import { setStoredIntent } from "@/store/authGuard";
import { Button, Input, toast, LoadMoreControl } from "@/components/ui";
import { TopicFilter } from "@/components/TopicFilter";
import { ROUTES, COPY } from "@/config";
import { useProblemCursorList } from "@/hooks/useProblemCursorList";
import { useTopics } from "@/hooks/useTopics";
import { useProblemFilters } from "@/hooks/useProblemFilters";
import { useDebounce } from "@/hooks/useDebounce";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { ProblemCard } from "@/components/pages/home/ProblemCard";
import { ProblemCardSkeleton } from "@/components/pages/home/ProblemCardSkeleton";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Hooks
  const {
    search,
    difficulty,
    sortBy,
    selectedTopics,
    setSearch,
    handleToggleTopic,
    handleClearTopics,
    handleFilterChange,
    hasActiveFilters,
  } = useProblemFilters();

  // Debounce search input (300ms) to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300);

  const {
    problems,
    isLoading,
    isLoadingMore,
    hasNext,
    error,
    loadMore,
    refresh,
    totalCount,
  } = useProblemCursorList({
    search: debouncedSearch || undefined,
    difficulty: difficulty === "all" ? undefined : difficulty,
    topics: selectedTopics.length > 0 ? selectedTopics : undefined,
    sortBy,
    initialLimit: 20,
  });

  const { topics: availableTopics, isLoading: topicsLoading } = useTopics();

  // Handlers
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

  const handleProblemClick = useCallback(
    (problemSlug: string) => {
      if (!isAuthenticated) {
        showAuthRequiredPrompt(problemSlug);
        return;
      }
      navigate(ROUTES.problemDetail(problemSlug));
    },
    [isAuthenticated, navigate, showAuthRequiredPrompt],
  );

  const handleProblemKeyDown = useCallback(
    (e: React.KeyboardEvent, problemSlug: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleProblemClick(problemSlug);
      }
    },
    [handleProblemClick],
  );

  const handleClearAllFilters = useCallback(() => {
    setSearch("");
    handleFilterChange("all", sortBy);
    handleClearTopics();
  }, [setSearch, handleFilterChange, sortBy, handleClearTopics]);

  // Clear search when no longer has value (user deleted all text)
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch],
  );

  // Memoize filter description for display (uses debounced search for accuracy)
  const filterDescription = useMemo(() => {
    const parts: string[] = [];
    
    if (debouncedSearch) {
      parts.push(`matching "${debouncedSearch}"`);
    }
    if (difficulty !== "all") {
      parts.push(`with ${difficulty} difficulty`);
    }
    if (selectedTopics.length > 0) {
      parts.push(
        `in ${selectedTopics.length} topic${selectedTopics.length > 1 ? "s" : ""}`
      );
    }
    
    return parts.length > 0 ? parts.join(" ") : null;
  }, [debouncedSearch, difficulty, selectedTopics]);

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

      {/* Topic Filter */}
      <TopicFilter
        topics={availableTopics}
        selectedTopics={selectedTopics}
        onToggle={handleToggleTopic}
        onClearAll={handleClearTopics}
        isLoading={topicsLoading}
      />

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label 
            htmlFor="problem-search" 
            className="sr-only"
          >
            Search problems
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            id="problem-search"
            type="search"
            placeholder={COPY.HOME.SEARCH_PLACEHOLDER}
            value={search}
            onChange={handleSearchChange}
            className="pl-10"
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
            onChange={(val) => handleFilterChange(val, sortBy)}
          />
          <FilterDropdown
            label="Sort"
            value={sortBy}
            options={[
              { value: "title", label: COPY.HOME.SORT_TITLE },
              { value: "oldest", label: COPY.HOME.SORT_OLDEST },
              { value: "newest", label: COPY.HOME.SORT_NEWEST },
            ]}
            onChange={(val) => handleFilterChange(difficulty, val)}
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {problems.length} problem{problems.length === 1 ? "" : "s"}
        {filterDescription && ` ${filterDescription}`}
        {totalCount != null && !search && ` of ${totalCount} total`}
      </p>

      {/* Problem list */}
      <div
        className="grid gap-3"
        role="feed"
        aria-label="Problem list"
        aria-busy={isLoadingMore}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <ProblemCardSkeleton key={i} />
            ))
            : problems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onClick={() => handleProblemClick(problem.slug)}
                onKeyDown={(e) => handleProblemKeyDown(e, problem.slug)}
                isAuthenticated={isAuthenticated}
              />
            ))}

        {!isLoading && problems.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {search ? `No problems matching "${search}"` : COPY.HOME.EMPTY}
            </p>
            {hasActiveFilters && (
              <Button
                variant="link"
                onClick={handleClearAllFilters}
                className="mt-2"
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Load More Control */}
      {!isLoading && (
        <LoadMoreControl
          hasNext={hasNext}
          isLoadingMore={isLoadingMore}
          error={error}
          onLoadMore={loadMore}
          onRetry={refresh}
          loadedCount={problems.length}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
