import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

export const DIFFICULTY_VARIANT: Record<string, BadgeVariant> = {
  Easy: 'success',
  Medium: 'secondary',
  Hard: 'destructive',
} as const;

export const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-600 dark:text-green-400',
  Medium: 'text-yellow-600 dark:text-yellow-400',
  Hard: 'text-red-600 dark:text-red-400',
} as const;
