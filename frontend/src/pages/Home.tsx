import { useCallback } from "react";
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
    difficulty: difficulty === "all" ? undefined : difficulty,
    topics: selectedTopics.length > 0 ? selectedTopics : undefined,
    sortBy,
    initialLimit: 20,
  });

  const { topics: availableTopics, isLoading: topicsLoading } = useTopics();

  // Computed
  const filteredProblems = search
    ? problems.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()),
      )
    : problems;

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
        {filteredProblems.length} problem
        {filteredProblems.length === 1 ? "" : "s"}
        {search && ` matching "${search}"`}
        {difficulty !== "all" && ` with ${difficulty} difficulty`}
        {selectedTopics.length > 0 &&
          ` in ${selectedTopics.length} topic${selectedTopics.length > 1 ? "s" : ""}`}
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
          : filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onClick={() => handleProblemClick(problem.slug)}
                onKeyDown={(e) => handleProblemKeyDown(e, problem.slug)}
                isAuthenticated={isAuthenticated}
              />
            ))}

        {!isLoading && filteredProblems.length === 0 && (
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
