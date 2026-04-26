export type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' | null;

export interface Submission {
  id: number;
  problem_id: number | null;
  problem_slug: string | null;
  problem_title: string | null;
  language: string;
  status: SubmissionStatus;
  created_at: string;
  execution_time_ms: number | null;
  memory_used_kb: number | null;
}

export interface TestCaseResult {
  index: number;
  status: string;
  stdout: string;
  stderr: string;
  error_message: string | null;
  time_ms: number | null;
  memory_kb: number | null;
}

export interface VerdictResult {
  status: string;
  passed_test_cases: number;
  total_test_cases: number;
  runtime_ms: number | null;
  memory_kb: number | null;
  submission_type: "run" | "submit" | null;
  last_test_case_output: string | null;
  expected_output: string | null;
  error_message: string | null;
  stdin: string;
  stdout: string;
  stderr: string;
  test_case_results: TestCaseResult[];
}

export interface TestCaseResult {
  index: number;
  status: string;
  input: string;
  stdout: string;
  stderr: string;
  expected_output: string;
  error_message: string | null;
}

export interface SubmissionResult {
  id: number;
  user_id: number;
  problem_id: number | null;
  problem_slug: string | null;
  source_code: string;
  language: string;
  status: SubmissionStatus;
  stdout: string | null;
  stderr: string | null;
  error_type: string | null;
  execution_time_ms: number | null;
  memory_used_kb: number | null;
  judge0_token: string | null;
  passed_count: number | null;
  total_count: number | null;
  created_at: string;
  test_case_results: TestCaseResult[];
}