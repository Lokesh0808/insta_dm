import { Toaster as SonnerToaster, toast } from 'sonner';
import { useTheme } from '@/store/theme.store';

export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme as 'light' | 'dark' | 'system'}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border border-border bg-card text-card-foreground shadow-lg backdrop-blur',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
    />
  );
}

export { toast };
