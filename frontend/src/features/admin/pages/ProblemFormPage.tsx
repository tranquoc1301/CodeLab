import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Code2,
  Lightbulb,
  AlertTriangle,
  FileText,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/app/router";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  useAdminProblem,
  useCreateAdminProblem,
  useUpdateAdminProblem,
} from "@/features/admin/hooks/useAdminProblems";
import { useAdminTopics } from "@/features/admin/hooks/useAdminTopics";
import {
  extractAdminErrorMessage,
  type AdminProblemCreate,
  type AdminProblemUpdate,
} from "@/features/admin/api/types";

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

const problemFormSchema = z.object({
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
  topics: z.string(),
  examples: z.array(exampleSchema),
  constraints: z.array(constraintSchema),
  hints: z.array(hintSchema),
  code_snippets: z.array(codeSnippetSchema),
});

type ProblemFormValues = z.infer<typeof problemFormSchema>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseTopics(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const EMPTY_FORM: ProblemFormValues = {
  problem_id: 0,
  frontend_id: 0,
  title: "",
  slug: "",
  difficulty: "Easy",
  description: "",
  topics: "",
  examples: [],
  constraints: [],
  hints: [],
  code_snippets: [],
};

export function ProblemFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id != null && id !== "create";
  const problemId = isEdit ? Number(id) : null;

  const { data: existingProblem, isLoading: isLoadingProblem } = useAdminProblem(
    isEdit ? problemId : null,
  );

  const createMutation = useCreateAdminProblem();
  const updateMutation = useUpdateAdminProblem();

  const form = useForm<ProblemFormValues>({
    resolver: zodResolver(problemFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const {
    fields: exampleFields,
    append: appendExample,
    remove: removeExample,
  } = useFieldArray({ control: form.control, name: "examples" });

  const {
    fields: constraintFields,
    append: appendConstraint,
    remove: removeConstraint,
  } = useFieldArray({ control: form.control, name: "constraints" });

  const {
    fields: hintFields,
    append: appendHint,
    remove: removeHint,
  } = useFieldArray({ control: form.control, name: "hints" });

  const {
    fields: snippetFields,
    append: appendSnippet,
    remove: removeSnippet,
  } = useFieldArray({ control: form.control, name: "code_snippets" });

  const { data: topicsData } = useAdminTopics();
  const availableTopics = topicsData ?? [];

  useEffect(() => {
    if (isEdit && existingProblem) {
      form.reset({
        problem_id: existingProblem.problem_id,
        frontend_id: existingProblem.frontend_id,
        title: existingProblem.title,
        slug: existingProblem.slug,
        difficulty: existingProblem.difficulty as ProblemFormValues["difficulty"],
        description: existingProblem.description ?? "",
        topics: existingProblem.topics.map((t) => t.name).join(", "),
        examples: existingProblem.examples.map((e) => ({
          example_text: e.example_text,
          images: e.images ?? [],
        })),
        constraints: existingProblem.constraints.map((c) => ({
          constraint_text: c.constraint_text,
        })),
        hints: existingProblem.hints.map((h) => ({
          hint_text: h.hint_text,
        })),
        code_snippets: existingProblem.code_snippets.map((s) => ({
          language: s.language,
          code: s.code,
        })),
      });
    }
  }, [isEdit, existingProblem, form]);

  const titleValue = form.watch("title");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (slugTouched) return;
    if (!isEdit && titleValue) {
      form.setValue("slug", slugify(titleValue), { shouldValidate: false });
    }
  }, [titleValue, slugTouched, isEdit, form]);

  const onSubmit = async (values: ProblemFormValues) => {
    try {
      const examples = values.examples.map((e, i) => ({
        ...e,
        example_num: i + 1,
      }));
      const constraints = values.constraints.map((c, i) => ({
        ...c,
        sort_order: i,
      }));
      const hints = values.hints.map((h, i) => ({
        ...h,
        hint_num: i + 1,
      }));

      if (isEdit && problemId) {
        const data: AdminProblemUpdate = {
          title: values.title,
          slug: values.slug,
          difficulty: values.difficulty,
          description: values.description?.trim() ? values.description : null,
          topics: parseTopics(values.topics),
          examples,
          constraints,
          hints,
          code_snippets: values.code_snippets,
        };
        await updateMutation.mutateAsync({ id: problemId, data });
        navigate(ROUTES.ADMIN_PROBLEMS);
      } else {
        const data: AdminProblemCreate = {
          problem_id: Number(values.problem_id),
          frontend_id: Number(values.frontend_id),
          title: values.title,
          slug: values.slug,
          difficulty: values.difficulty,
          description: values.description?.trim() ? values.description : null,
          topics: parseTopics(values.topics),
          examples,
          constraints,
          hints,
          code_snippets: values.code_snippets,
        };
        await createMutation.mutateAsync(data);
        navigate(ROUTES.ADMIN_PROBLEMS);
      }
    } catch (err) {
      const message = extractAdminErrorMessage(err, "Failed to save problem");
      form.setError("root", { message });
    }
  };

  const submitting = form.formState.isSubmitting;

  if (isEdit && isLoadingProblem) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(ROUTES.ADMIN_PROBLEMS)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit problem" : "Create problem"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Update problem details and content."
              : "Fill in the problem details. Topics can be new names; they will be created."}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Problem ID"
                error={form.formState.errors.problem_id?.message}
              >
                <Input
                  type="number"
                  min={1}
                  disabled={isEdit}
                  {...form.register("problem_id", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Frontend ID"
                error={form.formState.errors.frontend_id?.message}
              >
                <Input
                  type="number"
                  min={1}
                  disabled={isEdit}
                  {...form.register("frontend_id", { valueAsNumber: true })}
                />
              </Field>
            </div>

            <Field label="Title" error={form.formState.errors.title?.message}>
              <Input {...form.register("title")} />
            </Field>

            <Field label="Slug" error={form.formState.errors.slug?.message}>
              <Input
                {...form.register("slug", {
                  onChange: () => setSlugTouched(true),
                })}
              />
              {!slugTouched && !isEdit && titleValue && (
                <p className="text-xs text-muted-foreground">
                  Auto-generated from title. Edit to override.
                </p>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Difficulty"
                error={form.formState.errors.difficulty?.message}
              >
                <Select
                  value={form.watch("difficulty")}
                  onValueChange={(v) =>
                    form.setValue("difficulty", v as ProblemFormValues["difficulty"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Topics (comma separated)"
                error={form.formState.errors.topics?.message}
              >
                <Input
                  placeholder="Array, Hash Table, Dynamic Programming"
                  {...form.register("topics")}
                />
                {availableTopics.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">
                    Available:{" "}
                    {availableTopics
                      .slice(0, 6)
                      .map((t) => t.name)
                      .join(", ")}
                    {availableTopics.length > 6 && "..."}
                  </p>
                )}
              </Field>
            </div>

            <Field
              label="Description"
              error={form.formState.errors.description?.message}
            >
              <Textarea rows={4} {...form.register("description")} />
            </Field>
          </CardContent>
        </Card>

        {/* Examples Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Examples
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendExample({
                    example_text: "",
                    images: [],
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Example
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exampleFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No examples yet. Click "Add Example" to add one.
              </p>
            )}
            {exampleFields.map((field, index) => (
              <div
                key={field.id}
                className="relative rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Example {index + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeExample(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Example: Input: nums = [2,7,11,15], target = 9&#10;Output: [0,1]&#10;Explanation: Because nums[0] + nums[1] == 9, we return [0, 1]."
                  rows={4}
                  {...form.register(`examples.${index}.example_text`)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Constraints Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Constraints
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendConstraint({
                    constraint_text: "",
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Constraint
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {constraintFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No constraints yet. Click "Add Constraint" to add one.
              </p>
            )}
            {constraintFields.map((field, index) => (
              <div
                key={field.id}
                className="relative rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Constraint {index + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeConstraint(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="e.g., 2 <= nums.length <= 10^4"
                  {...form.register(`constraints.${index}.constraint_text`)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hints Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Hints
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendHint({
                    hint_text: "",
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Hint
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hintFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hints yet. Click "Add Hint" to add one.
              </p>
            )}
            {hintFields.map((field, index) => (
              <div
                key={field.id}
                className="relative rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Hint {index + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeHint(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Enter hint text..."
                  rows={2}
                  {...form.register(`hints.${index}.hint_text`)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Code Snippets Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Code Snippets
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendSnippet({
                    language: "",
                    code: "",
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Snippet
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snippetFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No code snippets yet. Click "Add Snippet" to add one.
              </p>
            )}
            {snippetFields.map((field, index) => (
              <div
                key={field.id}
                className="relative rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Snippet {index + 1}</Badge>
                    <Input
                      placeholder="Language (e.g., python, javascript)"
                      className="w-48"
                      {...form.register(`code_snippets.${index}.language`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeSnippet(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Paste your code here..."
                  rows={8}
                  className="font-mono text-sm"
                  {...form.register(`code_snippets.${index}.code`)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {form.formState.errors.root && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.ADMIN_PROBLEMS)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Create problem"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
