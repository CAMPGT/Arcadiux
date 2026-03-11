import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        size === 'sm' ? 'h-5 w-5 border-2' : 'h-8 w-8 border-4',
        className,
      )}
    />
  );
}
