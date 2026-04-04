import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileCode, Filter, AlertCircle, RefreshCw } from "lucide-react";
import api from "@/api";
import { Button } from "@/components/ui";
import { API, ROUTES, COPY } from "@/config";
import { useSubmissionFilters } from "@/hooks/useSubmissionFilters";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { SubmissionCard } from "@/components/pages/submissions/SubmissionCard";
import { SubmissionSkeleton } from "@/components/pages/submissions/SubmissionSkeleton";
import type { Submission } from "@/types";
import { useState } from "react";

export default function Submissions() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  // Data fetching
  const {
    data: submissions,
    isLoading,
    error,
    refetch,
  } = useQuery<Submission[]>({
    queryKey: ["submissions", page],
    queryFn: async () => {
      const res = await api.get(API.ENDPOINTS.SUBMISSIONS, {
        params: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
      });
      return res.data;
    },
  });

  // Filter state
  const {
    statusFilter,
    languageFilter,
    sortBy,
    setStatusFilter,
    setLanguageFilter,
    setSortBy,
    clearFilters,
    filteredSubmissions,
    uniqueStatuses,
    uniqueLanguages,
    hasActiveFilters,
  } = useSubmissionFilters(submissions);

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {COPY.SUBMISSIONS.TITLE}
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your code submissions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter by:</span>
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            value={statusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              ...uniqueStatuses.map((status) => ({
                value: status!,
                label: status!,
              })),
            ]}
            onChange={setStatusFilter}
          />
          <FilterDropdown
            label="Language"
            value={languageFilter}
            options={[
              { value: "all", label: "All Languages" },
              ...uniqueLanguages.map((lang) => ({
                value: lang,
                label: lang,
              })),
            ]}
            onChange={setLanguageFilter}
          />
          <FilterDropdown
            label="Sort"
            value={sortBy}
            options={[
              { value: "newest", label: "Newest First" },
              { value: "oldest", label: "Oldest First" },
            ]}
            onChange={setSortBy}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-muted-foreground text-lg mb-2">
            Failed to load submissions
          </p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred"}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredSubmissions.length} submission
        {filteredSubmissions.length === 1 ? "" : "s"}
        {hasActiveFilters &&
          ` (filtered from ${submissions?.length || 0} total)`}
      </p>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <SubmissionSkeleton key={i} />
            ))
          : filteredSubmissions.length === 0 && (
              <div className="text-center py-16">
                <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  {hasActiveFilters
                    ? "No submissions match your filters"
                    : COPY.SUBMISSIONS.EMPTY}
                </p>
                {hasActiveFilters ? (
                  <Button
                    variant="link"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Clear all filters
                  </Button>
                ) : (
                  <Button asChild className="mt-4">
                    <Link to={ROUTES.HOME}>Browse Problems</Link>
                  </Button>
                )}
              </div>
            )}
        {filteredSubmissions.map((submission) => (
          <SubmissionCard key={submission.id} submission={submission} />
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 rounded border disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!submissions || submissions.length < PAGE_SIZE}
          className="px-3 py-1 rounded border disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
