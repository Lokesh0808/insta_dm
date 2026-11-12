import { cn } from '@/lib/utils';

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-[3px]',
  };
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-primary/25 border-t-primary',
        sizes[size],
        className,
      )}
    />
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
