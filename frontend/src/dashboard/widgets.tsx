import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatNumber } from '@/lib/utils';
import type { ReactNode } from 'react';

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  hint,
  isLoading,
  accent = 'primary',
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  hint?: string;
  isLoading?: boolean;
  accent?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const accents = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-chart-2/10 text-chart-2',
  };

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="mt-2.5 h-8 w-24" />
            ) : (
              <p className="mt-1.5 text-2xl font-bold tracking-tight lg:text-[28px]">
                {typeof value === 'number' ? formatNumber(value) : value}
              </p>
            )}
          </div>
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              accents[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>

        {(change !== undefined || hint) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {change !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
                  change >= 0
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                {change >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
            )}
            {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-destructive">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn('h-9 flex-1', colIndex === 0 ? 'max-w-[220px]' : '')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
