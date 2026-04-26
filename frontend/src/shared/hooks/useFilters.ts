import { useState, useCallback } from "react";

export interface UseFiltersOptions {
  defaultSearch?: string;
  defaultDifficulty?: string;
  defaultStatus?: string;
  defaultSort?: string;
}

export interface UseFiltersReturn {
  search: string;
  difficulty: string;
  status: string;
  sortBy: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setDifficulty: React.Dispatch<React.SetStateAction<string>>;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  handleFilterChange: (newDifficulty: string, newSortBy: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useFilters({
  defaultSearch = "",
  defaultDifficulty = "all",
  defaultStatus = "all",
  defaultSort = "newest",
}: UseFiltersOptions = {}): UseFiltersReturn {
  const [search, setSearch] = useState(defaultSearch);
  const [difficulty, setDifficulty] = useState(defaultDifficulty);
  const [status, setStatus] = useState(defaultStatus);
  const [sortBy, setSortBy] = useState(defaultSort);

  const handleFilterChange = useCallback(
    (newDifficulty: string, newSortBy: string) => {
      setDifficulty(newDifficulty);
      setSortBy(newSortBy);
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setDifficulty("all");
    setStatus("all");
    setSortBy("newest");
  }, []);

  const hasActiveFilters =
    search !== "" || difficulty !== "all" || status !== "all";

  return {
    search,
    difficulty,
    status,
    sortBy,
    setSearch,
    setDifficulty,
    setStatus,
    setSortBy,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
  };
}