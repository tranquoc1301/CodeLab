export interface Example {
  id: number;
  example_num: number;
  example_text: string;
  images: string[];
}

export interface Constraint {
  id: number;
  sort_order: number;
  constraint_text: string;
}

export interface Hint {
  id: number;
  hint_num: number;
  hint_text: string;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
}

export interface CodeSnippet {
  id: number;
  language: string;
  code: string;
}

export interface Problem {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  topics: Topic[];
  examples: Example[];
  constraints: Constraint[];
  hints: Hint[];
  code_snippets: CodeSnippet[];
  created_at: string;
}
