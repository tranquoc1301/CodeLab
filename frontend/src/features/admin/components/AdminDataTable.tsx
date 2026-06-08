import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/utils";

export interface AdminColumn<T> {
  key: string;
  header: ReactNode;
  className?: string;
  cellClassName?: string;
  render: (row: T) => ReactNode;
}

interface AdminDataTableProps<T> {
  columns: AdminColumn<T>[];
  rows: T[] | undefined;
  isLoading?: boolean;
  rowKey: (row: T) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  page: number;
  pageSize?: number;
  total?: number;
  hasNext?: boolean;
  onPageChange: (page: number) => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  skeletonRows?: number;
  getRowClassName?: (row: T) => string | undefined;
}

export function AdminDataTable<T>({
  columns,
  rows,
  isLoading,
  rowKey,
  emptyTitle = "No data",
  emptyDescription = "There are no records to display yet.",
  page,
  pageSize = 20,
  total,
  hasNext,
  onPageChange,
  toolbar,
  footer,
  className,
  skeletonRows = 5,
  getRowClassName,
}: AdminDataTableProps<T>) {
  const totalCount = total ?? rows?.length ?? 0;
  const start = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, totalCount);
  const hasPrev = page > 1;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {toolbar && (
        <div className="border-b border-border bg-muted/30 p-3">{toolbar}</div>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.cellClassName}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows && rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={getRowClassName?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.cellClassName}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8" />
                    <p className="text-sm font-medium">{emptyTitle}</p>
                    <p className="text-xs text-muted-foreground/80">
                      {emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <div className="flex flex-col gap-2 border-t border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {totalCount > 0
            ? `Showing ${start}-${end} of ${totalCount}`
            : "No results"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={!hasPrev}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Previous</span>
          </Button>
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            aria-label="Next page"
          >
            <span className="mr-1 hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {footer && (
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </Card>
  );
}
