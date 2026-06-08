import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Code2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
import { DIFFICULTY_VARIANT } from "@/shared/config/difficulty";
import { extractAdminErrorMessage } from "@/features/admin/api/types";
import {
  useAdminProblems,
  useCreateAdminProblem,
  useDeleteAdminProblem,
  useUpdateAdminProblem,
} from "@/features/admin/hooks/useAdminProblems";
import { useAdminTopics } from "@/features/admin/hooks/useAdminTopics";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/features/admin/components/AdminDataTable";
import { AdminSearchInput } from "@/features/admin/components/AdminSearchInput";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import type {
  AdminProblemCreate,
  AdminProblemListItem,
  AdminProblemUpdate,
} from "@/features/admin/api/types";

const problemSchema = z.object({
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
});

type ProblemFormValues = z.infer<typeof problemSchema>;

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
};

export function ProblemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = Number(searchParams.get("page") ?? "1") || 1;
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (search) next.search = search;
    if (page > 1) next.page = String(page);
    setSearchParams(next, { replace: true });
  }, [search, page, setSearchParams]);

  const { data, isLoading, error, refetch } = useAdminProblems({ search, page });
  const problems = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = data?.has_next ?? false;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProblemListItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = useCreateAdminProblem();
  const updateMutation = useUpdateAdminProblem();
  const deleteMutation = useDeleteAdminProblem();

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row: AdminProblemListItem) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId == null) return;
    deleteMutation.mutate(deleteId, {
      onSettled: () => setDeleteId(null),
    });
  };

  const columns: AdminColumn<AdminProblemListItem>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        className: "w-16",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.frontend_id}
          </span>
        ),
      },
      {
        key: "title",
        header: "Title",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        ),
      },
      {
        key: "difficulty",
        header: "Difficulty",
        className: "w-28",
        render: (row) => (
          <Badge
            variant={DIFFICULTY_VARIANT[row.difficulty] ?? "outline"}
            className="capitalize"
          >
            {row.difficulty}
          </Badge>
        ),
      },
      {
        key: "topics",
        header: "Topics",
        render: (row) => (
          <div className="flex max-w-xs flex-wrap gap-1">
            {row.topics.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              row.topics.slice(0, 3).map((t) => (
                <Badge key={t.id} variant="secondary" className="text-xs">
                  {t.name}
                </Badge>
              ))
            )}
            {row.topics.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{row.topics.length - 3}
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: "created",
        header: "Created",
        className: "w-40",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        className: "w-24 text-right",
        cellClassName: "text-right",
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Edit problem ${row.title}`}
              onClick={() => handleOpenEdit(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Delete problem ${row.title}`}
              onClick={() => setDeleteId(row.id)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Problems</h2>
          <p className="text-sm text-muted-foreground">
            Create, edit, and remove problems.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="self-start sm:self-auto">
          <Plus className="mr-1 h-4 w-4" />
          Add problem
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to load problems. {extractAdminErrorMessage(error)}
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        rows={problems}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        page={page}
        pageSize={20}
        total={total}
        hasNext={hasNext}
        onPageChange={setPage}
        emptyTitle="No problems yet"
        emptyDescription="Create your first problem using the Add problem button."
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <AdminSearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by title..."
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Code2 className="h-4 w-4" />
              <span>{total} total</span>
            </div>
          </div>
        }
      />

      <ProblemFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
          setDialogOpen(o);
        }}
        editing={editing}
        onCreate={(data) =>
          new Promise<void>((resolve, reject) => {
            createMutation.mutate(data, {
              onSuccess: () => {
                setDialogOpen(false);
                resolve();
              },
              onError: (err) => reject(err),
            });
          })
        }
        onUpdate={(id, data) =>
          new Promise<void>((resolve, reject) => {
            updateMutation.mutate(
              { id, data },
              {
                onSuccess: () => {
                  setDialogOpen(false);
                  setEditing(null);
                  resolve();
                },
                onError: (err) => reject(err),
              },
            );
          })
        }
      />

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
        title="Delete problem"
        description="This action cannot be undone. The problem and all related data will be permanently removed."
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

interface ProblemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminProblemListItem | null;
  onCreate: (data: AdminProblemCreate) => Promise<void>;
  onUpdate: (id: number, data: AdminProblemUpdate) => Promise<void>;
}

function ProblemFormDialog({
  open,
  onOpenChange,
  editing,
  onCreate,
  onUpdate,
}: ProblemFormDialogProps) {
  const isEdit = editing != null;
  const form = useForm<ProblemFormValues>({
    resolver: zodResolver(problemSchema),
    defaultValues: EMPTY_FORM,
  });

  const { data: topicsData } = useAdminTopics();
  const availableTopics = topicsData ?? [];

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        problem_id: editing.problem_id,
        frontend_id: editing.frontend_id,
        title: editing.title,
        slug: editing.slug,
        difficulty: (editing.difficulty as ProblemFormValues["difficulty"]) ?? "Easy",
        description: "",
        topics: editing.topics.map((t) => t.name).join(", "),
      });
    } else {
      form.reset(EMPTY_FORM);
    }
  }, [open, editing, form]);

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
      if (isEdit && editing) {
        const data: AdminProblemUpdate = {
          title: values.title,
          slug: values.slug,
          difficulty: values.difficulty,
          description: values.description?.trim() ? values.description : null,
          topics: parseTopics(values.topics),
        };
        await onUpdate(editing.id, data);
      } else {
        const data: AdminProblemCreate = {
          problem_id: Number(values.problem_id),
          frontend_id: Number(values.frontend_id),
          title: values.title,
          slug: values.slug,
          difficulty: values.difficulty,
          description: values.description?.trim() ? values.description : null,
          topics: parseTopics(values.topics),
        };
        await onCreate(data);
      }
    } catch (err) {
      const message = extractAdminErrorMessage(err, "Failed to save problem");
      form.setError("root", { message });
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit problem" : "Create problem"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update problem details. Slug must remain unique."
              : "Provide the basic problem metadata. Topics can be new names; they will be created."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 px-6 pb-2"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Problem ID"
              error={form.formState.errors.problem_id?.message}
            >
              <Input
                type="number"
                min={1}
                disabled={isEdit}
                {...form.register("problem_id")}
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
                {...form.register("frontend_id")}
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  Available: {availableTopics.slice(0, 6).map((t) => t.name).join(", ")}
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

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Create problem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

export default ProblemsPage;
