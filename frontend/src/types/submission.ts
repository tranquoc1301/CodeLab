export interface Submission {
  id: number;
  problem_id: number | null;
  problem_slug: string | null;
  language: string;
  status: string | null;
  created_at: string;
  execution_time_ms: number | null;
  memory_used_kb: number | null;
}

export interface SubmissionResult {
  status: string | null;
  stdout: string | null;
  stderr: string | null;
  error_type: string | null;
  execution_time_ms?: number;
  memory_used_kb?: number;
}
