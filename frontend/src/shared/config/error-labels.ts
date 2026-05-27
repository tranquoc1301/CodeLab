import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Timer,
  Bug,
  Repeat,
  Puzzle,
  CornerDownRight,
  HelpCircle,
} from "lucide-react";

export interface ErrorLabelConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const ERROR_LABELS: Record<string, ErrorLabelConfig> = {
  logic_calculation_error: {
    label: "Logic & Calculation",
    icon: AlertTriangle,
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-800/50",
  },
  complexity_error: {
    label: "Complexity & TLE",
    icon: Timer,
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
    borderColor: "border-orange-200 dark:border-orange-800/50",
  },
  memory_reference_error: {
    label: "Memory & Reference",
    icon: Bug,
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-950/40",
    borderColor: "border-red-200 dark:border-red-800/50",
  },
  recursion_error: {
    label: "Recursion Error",
    icon: Repeat,
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
    borderColor: "border-purple-200 dark:border-purple-800/50",
  },
  algorithm_design_error: {
    label: "Algorithm Design",
    icon: Puzzle,
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-800/50",
  },
  boundary_condition_error: {
    label: "Boundary & Edge Case",
    icon: CornerDownRight,
    color: "text-teal-700 dark:text-teal-300",
    bgColor: "bg-teal-50 dark:bg-teal-950/40",
    borderColor: "border-teal-200 dark:border-teal-800/50",
  },
  unknown: {
    label: "Insufficient Signal",
    icon: HelpCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted/40",
    borderColor: "border-border/50",
  },
};

export const ERROR_DETAIL_LABELS: Record<string, string> = {
  compile_syntax: "Compilation Error",
  wrong_answer_boundary: "Boundary Condition",
  wrong_answer_state_index: "Index / State Error",
  wrong_answer_parsing_format: "Output Format Error",
  runtime_reference_type: "Data Access Error",
  runtime_recursion: "Recursion Error",
  tle_complexity: "Algorithm Too Slow",
  logic_calculation: "Logic / Calculation Error",
  algorithm_design: "Algorithm Design Error",
  unknown: "Insufficient Signal",
};

export function getErrorLabelConfig(label: string): ErrorLabelConfig {
  return ERROR_LABELS[label] ?? ERROR_LABELS.unknown;
}

export function getErrorDetailLabel(detail: string): string {
  return ERROR_DETAIL_LABELS[detail] ?? detail;
}

export const TUTOR_JOURNEY_LABEL = "Observe -> Focus -> Correct";

export const HINT_STAGE_LABELS: Record<string, string> = {
  observe: "Observe Error",
  focus: "Focus Area",
  correct: "Fix Direction",
};
