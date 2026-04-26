import api from ".";
import {API} from "@/shared/config";
import type { ProblemSummary } from "@/shared/types/problem";

// Re-export ProblemSummary for convenience
export { type ProblemSummary } from "@/shared/types/problem";

// Types
export interface ProblemList {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  problem_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProblemListCreate {
  name: string;
  description?: string;
}

export interface ProblemListUpdate {
  name?: string;
  description?: string;
}

// API functions
export const problemListApi = {
  // List all user's lists
  getAll: () => api.get<ProblemList[]>(API.ENDPOINTS.PROBLEM_LISTS),
  
  // Create a new list
  create: (data: ProblemListCreate) => 
    api.post<ProblemList>(API.ENDPOINTS.PROBLEM_LISTS, data),
  
  // Get a specific list
  get: (id: number) => api.get<ProblemList>(API.ENDPOINTS.PROBLEM_LIST(id)),
  
  // Update a list
  update: (id: number, data: ProblemListUpdate) =>
    api.patch<ProblemList>(API.ENDPOINTS.PROBLEM_LIST(id), data),
  
  // Delete a list
  delete: (id: number) => 
    api.delete(API.ENDPOINTS.PROBLEM_LIST(id)),
  
  // Add problem to list
  addProblem: (listId: number, problemId: number) =>
    api.post(`${API.ENDPOINTS.LIST_PROBLEMS(listId)}/${problemId}`),
  
  // Remove problem from list
  removeProblem: (listId: number, problemId: number) =>
    api.delete(`${API.ENDPOINTS.LIST_PROBLEMS(listId)}/${problemId}`),
  
  // Get problems in a list
  getProblems: (listId: number) =>
    api.get<{ problems: ProblemSummary[]; total_count: number }>(
      `${API.ENDPOINTS.PROBLEM_LIST(listId)}/problems`
    ),
  
  // Get lists containing a specific problem
  getListsContainingProblem: (problemId: number) =>
    api.get<{ id: number; name: string }[]>(
      API.ENDPOINTS.LIST_CONTAINING_PROBLEM(problemId)
    ),
};
