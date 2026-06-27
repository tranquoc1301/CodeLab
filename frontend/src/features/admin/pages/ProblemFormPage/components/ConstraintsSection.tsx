import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/utils";

import type { ProblemFormValues } from "../schema";

interface ConstraintsSectionProps {
  form: UseFormReturn<ProblemFormValues>;
  fields: { id: string }[];
  append: (value: { constraint_text: string }) => void;
  remove: (index: number) => void;
}

export function ConstraintsSection({
  form,
  fields,
  append,
  remove,
}: ConstraintsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Constraints
            {fields.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {fields.length}
              </Badge>
            )}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ constraint_text: "" })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No constraints yet. Click &quot;Add&quot; to add one.
          </p>
        )}
        {fields.map((field, index) => {
          const error = form.formState.errors.constraints?.[index];
          return (
            <div key={field.id} className="relative rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Constraint {index + 1}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="e.g., 2 <= nums.length <= 10^4"
                className={cn(error?.constraint_text && "border-destructive")}
                {...form.register(`constraints.${index}.constraint_text`)}
              />
              {error?.constraint_text && (
                <p className="text-xs text-destructive">{error.constraint_text.message}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
