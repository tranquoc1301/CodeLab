import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/app/router";
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

import { LANGUAGES, slugify } from "./constants";
import { EMPTY_FORM, problemFormSchema, type ProblemFormValues } from "./schema";
import { BasicInfoSection } from "./components/BasicInfoSection";
import { CodeSnippetsSection } from "./components/CodeSnippetsSection";
import { ConstraintsSection } from "./components/ConstraintsSection";
import { ExamplesSection } from "./components/ExamplesSection";
import { HintsSection } from "./components/HintsSection";
import { ProblemDriversSection } from "./components/ProblemDriversSection";

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

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const examplesArray = useFieldArray({ control: form.control, name: "examples" });
  const constraintsArray = useFieldArray({ control: form.control, name: "constraints" });
  const hintsArray = useFieldArray({ control: form.control, name: "hints" });
  const snippetsArray = useFieldArray({ control: form.control, name: "code_snippets" });
  const driversArray = useFieldArray({ control: form.control, name: "problem_drivers" });

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
        topics: existingProblem.topics.map((t) => t.name),
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
        problem_drivers: LANGUAGES.map((lang) => {
          const existing = existingProblem.problem_drivers.find(
            (d) => d.language === lang,
          );
          return {
            language: lang,
            prefix_code: existing?.prefix_code ?? "",
            driver_code: existing?.driver_code ?? "",
          };
        }),
      });
    }
  }, [isEdit, existingProblem, form]);

  const titleValue = useWatch({ control: form.control, name: "title" });
  const difficultyValue = useWatch({ control: form.control, name: "difficulty" });
  const topicsValue = useWatch({ control: form.control, name: "topics" });
  const descriptionValue = useWatch({ control: form.control, name: "description" });
  const codeSnippets = useWatch({ control: form.control, name: "code_snippets" });
  const problemDrivers = useWatch({ control: form.control, name: "problem_drivers" });

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
          topics: values.topics,
          examples,
          constraints,
          hints,
          code_snippets: values.code_snippets,
          problem_drivers: values.problem_drivers,
        };
        await updateMutation.mutateAsync({ id: problemId, data });
        form.reset(values);
        navigate(ROUTES.ADMIN_PROBLEMS);
      } else {
        const data: AdminProblemCreate = {
          problem_id: Number(values.problem_id),
          frontend_id: Number(values.frontend_id),
          title: values.title,
          slug: values.slug,
          difficulty: values.difficulty,
          description: values.description?.trim() ? values.description : null,
          topics: values.topics,
          examples,
          constraints,
          hints,
          code_snippets: values.code_snippets,
          problem_drivers: values.problem_drivers,
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
  const filledSnippetsCount = codeSnippets.filter((s) => s.code).length;
  const filledDriversCount = problemDrivers.filter((d) => d.driver_code).length;

  if (isEdit && isLoadingProblem) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleCancel = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        return;
      }
    }
    navigate(ROUTES.ADMIN_PROBLEMS);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit problem" : "Create problem"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Update problem details and content."
              : "Fill in the problem details. Topics will be created if they don't exist."}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <BasicInfoSection
          form={form}
          isEdit={isEdit}
          titleValue={titleValue}
          difficultyValue={difficultyValue}
          topicsValue={topicsValue}
          descriptionValue={descriptionValue}
          slugTouched={slugTouched}
          setSlugTouched={setSlugTouched}
          availableTopics={availableTopics}
        />

        <ExamplesSection
          form={form}
          fields={examplesArray.fields}
          append={examplesArray.append}
          remove={examplesArray.remove}
        />

        <ConstraintsSection
          form={form}
          fields={constraintsArray.fields}
          append={constraintsArray.append}
          remove={constraintsArray.remove}
        />

        <HintsSection
          form={form}
          fields={hintsArray.fields}
          append={hintsArray.append}
          remove={hintsArray.remove}
        />

        <CodeSnippetsSection
          form={form}
          fields={snippetsArray.fields}
          filledCount={filledSnippetsCount}
          totalCount={LANGUAGES.length}
        />

        <ProblemDriversSection
          form={form}
          fields={driversArray.fields}
          filledCount={filledDriversCount}
          totalCount={LANGUAGES.length}
        />

        {form.formState.errors.root && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Create problem"}
          </Button>
        </div>
      </form>
    </div>
  );
}
