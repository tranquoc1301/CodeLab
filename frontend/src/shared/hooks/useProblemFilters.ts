import { useState, useCallback } from "react";
import { useFilters } from "./useFilters";

interface UseProblemFiltersReturn {
  search: string;
  difficulty: string;
  sortBy: string;
  selectedTopics: string[];
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setDifficulty: React.Dispatch<React.SetStateAction<string>>;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  handleToggleTopic: (slug: string) => void;
  handleClearTopics: () => void;
  handleFilterChange: (newDifficulty: string, newSortBy: string) => void;
  hasActiveFilters: boolean;
}

export function useProblemFilters(): UseProblemFiltersReturn {
  const { search, difficulty, sortBy, setSearch, setDifficulty, setSortBy, handleFilterChange, hasActiveFilters: baseHasActiveFilters } = useFilters({
    defaultSearch: "",
    defaultDifficulty: "all",
    defaultSort: "oldest",
  });
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const handleToggleTopic = useCallback((slug: string) => {
    setSelectedTopics((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug],
    );
  }, []);

  const handleClearTopics = useCallback(() => {
    setSelectedTopics([]);
  }, []);

  const hasActiveFilters =
    difficulty !== "all" || selectedTopics.length > 0 || search !== "" || baseHasActiveFilters;

  return {
    search,
    difficulty,
    sortBy,
    selectedTopics,
    setSearch,
    setDifficulty,
    setSortBy,
    handleToggleTopic,
    handleClearTopics,
    handleFilterChange,
    hasActiveFilters,
  };
}
