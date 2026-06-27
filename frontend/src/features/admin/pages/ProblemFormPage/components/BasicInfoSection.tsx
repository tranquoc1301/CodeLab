import { FileText } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { TopicSelectable } from "@/features/admin/api/types";

import type { ProblemFormValues } from "../schema";
import { Field } from "./Field";
import { TopicsInput } from "./TopicsInput";
import { DescriptionInput } from "./DescriptionInput";

interface BasicInfoSectionProps {
  form: UseFormReturn<ProblemFormValues>;
  isEdit: boolean;
  titleValue: string;
  difficultyValue: string;
  topicsValue: string[];
  descriptionValue: string | null | undefined;
  slugTouched: boolean;
  setSlugTouched: (value: boolean) => void;
  availableTopics: TopicSelectable[];
}

export function BasicInfoSection({
  form,
  isEdit,
  titleValue,
  difficultyValue,
  topicsValue,
  descriptionValue,
  slugTouched,
  setSlugTouched,
  availableTopics,
}: BasicInfoSectionProps) {
  return (
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
              value={difficultyValue}
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
          <TopicsInput
            value={topicsValue}
            onChange={(topics) => form.setValue("topics", topics, { shouldDirty: true })}
            availableTopics={availableTopics.map((t) => t.name)}
            error={form.formState.errors.topics?.message}
          />
        </div>

        <DescriptionInput
          value={descriptionValue ?? ""}
          onChange={(val) => form.setValue("description", val, { shouldDirty: true })}
          error={form.formState.errors.description?.message}
        />
      </CardContent>
    </Card>
  );
}
