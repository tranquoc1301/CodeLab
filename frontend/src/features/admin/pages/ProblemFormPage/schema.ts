import { z } from "zod";

import { LANGUAGES } from "./constants";

const exampleSchema = z.object({
  example_num: z.number().int().min(1).optional(),
  example_text: z.string().min(1, "Example text is required"),
  images: z.array(z.string()),
});

const constraintSchema = z.object({
  sort_order: z.number().int().optional(),
  constraint_text: z.string().min(1, "Constraint text is required"),
});

const hintSchema = z.object({
  hint_num: z.number().int().min(1).optional(),
  hint_text: z.string().min(1, "Hint text is required"),
});

const codeSnippetSchema = z.object({
  language: z.string().min(1, "Language is required"),
  code: z.string().min(1, "Code is required"),
});

const problemDriverSchema = z.object({
  language: z.string().min(1, "Language is required"),
  prefix_code: z.string(),
  driver_code: z.string().min(1, "Driver code is required"),
});

export const problemFormSchema = z.object({
  problem_id: z.number().int().positive("Must be positive"),
  frontend_id: z.number().int().positive("Must be positive"),
  title: z.string().min(1, "Title is required").max(300),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(300)
    .regex(/^[a-z0-9-]+$/i, "Slug must be alphanumeric or hyphen"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  description: z.string().optional().nullable(),
  topics: z.array(z.string()),
  examples: z.array(exampleSchema),
  constraints: z.array(constraintSchema),
  hints: z.array(hintSchema),
  code_snippets: z.array(codeSnippetSchema),
  problem_drivers: z.array(problemDriverSchema),
});

export type ProblemFormValues = z.infer<typeof problemFormSchema>;

export const EMPTY_FORM: ProblemFormValues = {
  problem_id: 0,
  frontend_id: 0,
  title: "",
  slug: "",
  difficulty: "Easy",
  description: "",
  topics: [],
  examples: [],
  constraints: [],
  hints: [],
  code_snippets: LANGUAGES.map((lang) => ({ language: lang, code: "" })),
  problem_drivers: LANGUAGES.map((lang) => ({
    language: lang,
    prefix_code: "",
    driver_code: "",
  })),
};
