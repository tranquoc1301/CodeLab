import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderPlus, Pencil, Trash2, FolderOpen, ChevronRight } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/utils";
import { useAuth } from "@/app/store/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import {COPY} from "@/shared/config";
import { ROUTES } from "@/app/router";
import { problemListApi, type ProblemList } from "@/shared/api/problem-lists";

export default function ProblemLists() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for modals
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ProblemList | null>(null);

  // Form states
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [editListName, setEditListName] = useState("");
  const [editListDescription, setEditListDescription] = useState("");

  // Fetch user's problem lists
  const { data: lists, isLoading: listsLoading } = useQuery<ProblemList[]>({
    queryKey: ["problemLists", user?.id],
    queryFn: () => problemListApi.getAll().then((r) => r.data),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes - user lists don't change often
  });

  // Create list mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      problemListApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      setCreateDialogOpen(false);
      setNewListName("");
      setNewListDescription("");
      toast.success("List created successfully");
    },
    onError: () => {
      toast.error("Failed to create list. Please try again.");
    },
  });

  // Update list mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; description?: string };
    }) => problemListApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      setEditDialogOpen(false);
      setSelectedList(null);
      toast.success("List updated successfully");
    },
    onError: () => {
      toast.error("Failed to update list. Please try again.");
    },
  });

  // Delete list mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => problemListApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problemLists"] });
      setDeleteDialogOpen(false);
      setSelectedList(null);
      navigate(ROUTES.problemLists());
      toast.success("List deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete list. Please try again.");
    },
  });

  // Handlers
  const handleCreateList = useCallback(() => {
    if (!newListName.trim()) return;
    createMutation.mutate({
      name: newListName.trim(),
      description: newListDescription.trim() || undefined,
    });
  }, [newListName, newListDescription, createMutation]);

  const handleEditList = useCallback(() => {
    if (!selectedList || !editListName.trim()) return;
    updateMutation.mutate({
      id: selectedList.id,
      data: {
        name: editListName.trim(),
        description: editListDescription.trim() || undefined,
      },
    });
  }, [selectedList, editListName, editListDescription, updateMutation]);

  const handleDeleteList = useCallback(() => {
    if (!selectedList) return;
    deleteMutation.mutate(selectedList.id);
  }, [selectedList, deleteMutation]);

  const openEditDialog = useCallback((list: ProblemList) => {
    setSelectedList(list);
    setEditListName(list.name);
    setEditListDescription(list.description || "");
    setEditDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((list: ProblemList) => {
    setSelectedList(list);
    setDeleteDialogOpen(true);
  }, []);

  const handleListClick = useCallback(
    (listId: number) => {
      navigate(ROUTES.problemListDetail(listId));
    },
    [navigate],
  );

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground text-lg">
          {COPY.PROFILE.LOGIN_REQUIRED}
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {COPY.PROFILE.PROBLEM_LISTS_TITLE}
          </h1>
          <p className="text-muted-foreground mt-1">
            {lists?.length ?? 0} list{lists?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <FolderPlus className="h-4 w-4 mr-2" />
          {COPY.PROFILE.CREATE_LIST}
        </Button>
      </div>

      {/* Lists */}
      <Card>
        <CardHeader className="sr-only">
          <CardTitle>{COPY.PROFILE.PROBLEM_LISTS_TITLE}</CardTitle>
          <CardDescription>Your saved problem lists</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {listsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg px-4 py-4"
                >
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/5" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}
            </div>
          ) : lists && lists.length > 0 ? (
            <div className="space-y-1">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className={cn(
                    "group flex items-center gap-4 rounded-lg px-4 py-3.5",
                    "cursor-pointer transition-all duration-200",
                    "hover:bg-muted/60",
                    "border border-transparent hover:border-border/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                  onClick={() => handleListClick(list.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleListClick(list.id);
                    }
                  }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/80 shrink-0 transition-colors duration-200 group-hover:bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors duration-200">
                        {list.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[11px] px-2 py-0 h-5 font-normal"
                      >
                        {list.problem_count}
                      </Badge>
                    </div>
                    {list.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {list.description}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(list);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      aria-label="Edit list"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(list);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label="Delete list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border/30">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">
                {COPY.PROFILE.PROBLEM_LISTS_EMPTY}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                Organize your favorite problems into lists for easy access and focused practice.
              </p>
              <Button
                className="mt-5"
                onClick={() => setCreateDialogOpen(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                {COPY.PROFILE.CREATE_LIST}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create List Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{COPY.PROFILE.CREATE_LIST}</DialogTitle>
            <DialogDescription>
              Create a new list to organize your saved problems
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 px-4">
              <label htmlFor="new-list-name" className="text-sm font-medium">
                {COPY.PROFILE.LIST_NAME}
              </label>
              <Input
                id="new-list-name"
                placeholder={COPY.PROFILE.LIST_NAME_PLACEHOLDER}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
            <div className="space-y-2 px-4">
              <label
                htmlFor="new-list-description"
                className="text-sm font-medium"
              >
                {COPY.PROFILE.LIST_DESCRIPTION}
              </label>
              <Input
                id="new-list-description"
                placeholder={COPY.PROFILE.LIST_DESCRIPTION_PLACEHOLDER}
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                {COPY.PROFILE.CANCEL}
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim() || createMutation.isPending}
              >
                {createMutation.isPending
                  ? COPY.PROFILE.SAVING
                  : COPY.PROFILE.SAVE}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{COPY.PROFILE.EDIT_LIST}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 px-4">
              <label htmlFor="edit-list-name" className="text-sm font-medium">
                {COPY.PROFILE.LIST_NAME}
              </label>
              <Input
                id="edit-list-name"
                placeholder={COPY.PROFILE.LIST_NAME_PLACEHOLDER}
                value={editListName}
                onChange={(e) => setEditListName(e.target.value)}
              />
            </div>
            <div className="space-y-2 px-4">
              <label
                htmlFor="edit-list-description"
                className="text-sm font-medium"
              >
                {COPY.PROFILE.LIST_DESCRIPTION}
              </label>
              <Input
                id="edit-list-description"
                placeholder={COPY.PROFILE.LIST_DESCRIPTION_PLACEHOLDER}
                value={editListDescription}
                onChange={(e) => setEditListDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditListName("");
                  setEditListDescription("");
                  setSelectedList(null);
                }}
                disabled={updateMutation.isPending}
              >
                {COPY.PROFILE.CANCEL}
              </Button>
              <Button
                onClick={handleEditList}
                disabled={!editListName.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? COPY.PROFILE.SAVING
                  : COPY.PROFILE.SAVE}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{COPY.PROFILE.DELETE_CONFIRM_TITLE}</DialogTitle>
            <DialogDescription>
              {COPY.PROFILE.DELETE_CONFIRM_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                {COPY.PROFILE.CANCEL}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteList}
                disabled={deleteMutation.isPending}
              >
                {COPY.PROFILE.DELETE}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
