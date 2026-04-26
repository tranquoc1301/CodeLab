import { cn } from '@/shared/utils/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
