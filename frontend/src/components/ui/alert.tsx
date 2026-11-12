import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground border-border',
        destructive: 'border-destructive/50 text-destructive [&>svg]:text-destructive',
        success: 'border-success/50 text-success [&>svg]:text-success',
        warning: 'border-warning/50 text-warning [&>svg]:text-warning',
        info: 'border-chart-2/50 text-chart-2 [&>svg]:text-chart-2',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };

export function AlertIcon({ variant }: { variant?: VariantProps<typeof alertVariants>['variant'] }) {
  if (variant === 'destructive') return <AlertCircle className="h-4 w-4" />;
  if (variant === 'success') return <CheckCircle2 className="h-4 w-4" />;
  if (variant === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function AlertDismiss({ onDismiss }: { onDismiss?: () => void }) {
  if (!onDismiss) return null;
  return (
    <button
      onClick={onDismiss}
      className="absolute right-3 top-3 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
      aria-label="Dismiss"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
