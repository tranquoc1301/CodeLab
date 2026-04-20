import { useState, useMemo, useCallback } from "react";
import type { Submission } from "@/types";
import { useFilters } from "./useFilters";

interface UseSubmissionFiltersReturn {
  statusFilter: string;
  languageFilter: string;
  sortBy: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  setLanguageFilter: React.Dispatch<React.SetStateAction<string>>;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  clearFilters: () => void;
  filteredSubmissions: Submission[];
  uniqueStatuses: string[];
  uniqueLanguages: string[];
  hasActiveFilters: boolean;
}

export function useSubmissionFilters(
  submissions: Submission[] | undefined,
): UseSubmissionFiltersReturn {
  const { sortBy, setSortBy, clearFilters: clearBaseFilters, hasActiveFilters: baseHasFilters } = useFilters({
    defaultStatus: "all",
    defaultSort: "newest",
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];

    let filtered = [...submissions];

    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (languageFilter !== "all") {
      filtered = filtered.filter((s) => s.language === languageFilter);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [submissions, statusFilter, languageFilter, sortBy]);

  const uniqueStatuses = useMemo(() => {
    if (!submissions) return [];
    const statuses = new Set(
      submissions.map((s) => s.status ?? "").filter((s) => s !== ""),
    );
    return Array.from(statuses);
  }, [submissions]);

  const uniqueLanguages = useMemo(() => {
    if (!submissions) return [];
    const languages = new Set(
      submissions.map((s) => s.language).filter((l): l is string => Boolean(l)),
    );
    return Array.from(languages);
  }, [submissions]);

  const clearFilters = useCallback(() => {
    clearBaseFilters();
    setStatusFilter("all");
    setLanguageFilter("all");
  }, [clearBaseFilters]);

  const hasActiveFilters = statusFilter !== "all" || languageFilter !== "all" || baseHasFilters;

  return {
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
  };
}
