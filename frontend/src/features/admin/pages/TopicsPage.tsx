import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
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
import { Label } from "@/shared/components/ui/label";
import { extractAdminErrorMessage } from "@/features/admin/api/types";
import {
  useAdminTopics,
  useCreateAdminTopic,
  useDeleteAdminTopic,
  useUpdateAdminTopic,
} from "@/features/admin/hooks/useAdminTopics";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/features/admin/components/AdminDataTable";
import { AdminSearchInput } from "@/features/admin/components/AdminSearchInput";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import type {
  AdminTopicCreate,
  AdminTopicItem,
  AdminTopicUpdate,
} from "@/features/admin/api/types";

const topicSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]*$/i, "Slug must be alphanumeric or hyphen")
    .optional()
    .or(z.literal("")),
});

type TopicFormValues = z.infer<typeof topicSchema>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_FORM: TopicFormValues = { name: "", slug: "" };

export function TopicsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = useAdminTopics({ search });
  const topics = data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTopicItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = useCreateAdminTopic();
  const updateMutation = useUpdateAdminTopic();
  const deleteMutation = useDeleteAdminTopic();

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row: AdminTopicItem) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId == null) return;
    deleteMutation.mutate(deleteId, {
      onSettled: () => setDeleteId(null),
    });
  };

  const columns: AdminColumn<AdminTopicItem>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Tag className="mr-1 h-3 w-3" />
              {row.name}
            </Badge>
          </div>
        ),
      },
      {
        key: "slug",
        header: "Slug",
        className: "w-48",
        render: (row) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {row.slug}
          </code>
        ),
      },
      {
        key: "problems",
        header: "Problems",
        className: "w-28 text-right",
        cellClassName: "text-right",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.problem_count}
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
              aria-label={`Edit topic ${row.name}`}
              onClick={() => handleOpenEdit(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Delete topic ${row.name}`}
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
          <h2 className="text-2xl font-semibold tracking-tight">Topics</h2>
          <p className="text-sm text-muted-foreground">
            Manage problem topics and tags.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="self-start sm:self-auto">
          <Plus className="mr-1 h-4 w-4" />
          Add topic
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to load topics. {extractAdminErrorMessage(error)}
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
        rows={topics}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        page={1}
        pageSize={topics.length || 1}
        total={topics.length}
        hasNext={false}
        onPageChange={() => undefined}
        emptyTitle="No topics yet"
        emptyDescription="Create your first topic to start tagging problems."
        toolbar={
          <AdminSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search topics..."
          />
        }
      />

      <TopicFormDialog
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
        title="Delete topic"
        description="This will remove the topic and unlink it from any problems that reference it."
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

interface TopicFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminTopicItem | null;
  onCreate: (data: AdminTopicCreate) => Promise<void>;
  onUpdate: (id: number, data: AdminTopicUpdate) => Promise<void>;
}

function TopicFormDialog({
  open,
  onOpenChange,
  editing,
  onCreate,
  onUpdate,
}: TopicFormDialogProps) {
  const isEdit = editing != null;
  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({ name: editing.name, slug: editing.slug });
    } else {
      form.reset(EMPTY_FORM);
    }
  }, [open, editing, form]);

  const nameValue = form.watch("name");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (slugTouched) return;
    if (!isEdit && nameValue) {
      form.setValue("slug", slugify(nameValue), { shouldValidate: false });
    }
  }, [nameValue, slugTouched, isEdit, form]);

  const onSubmit = async (values: TopicFormValues) => {
    try {
      if (isEdit && editing) {
        const data: AdminTopicUpdate = {
          name: values.name,
          slug: values.slug || undefined,
        };
        await onUpdate(editing.id, data);
      } else {
        const data: AdminTopicCreate = {
          name: values.name,
          slug: values.slug || undefined,
        };
        await onCreate(data);
      }
    } catch (err) {
      const message = extractAdminErrorMessage(err, "Failed to save topic");
      form.setError("root", { message });
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit topic" : "Create topic"}</DialogTitle>
          <DialogDescription>
            Topics help users discover related problems.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 px-6 pb-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-name">Name</Label>
            <Input id="topic-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-slug">Slug</Label>
            <Input
              id="topic-slug"
              {...form.register("slug", {
                onChange: () => setSlugTouched(true),
              })}
            />
            {!slugTouched && !isEdit && nameValue && (
              <p className="text-xs text-muted-foreground">
                Auto-generated from name. Edit to override.
              </p>
            )}
            {form.formState.errors.slug && (
              <p className="text-xs text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>

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
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Create topic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TopicsPage;
