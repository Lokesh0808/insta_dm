import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-lg shadow-primary/25">
        <Instagram className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
      </span>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Insta<span className="gradient-text">flow</span>
        </span>
      )}
    </Link>
  );
}
