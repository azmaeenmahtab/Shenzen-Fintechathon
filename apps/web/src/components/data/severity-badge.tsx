import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'info';

const severityBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors',
  {
    variants: {
      severity: {
        critical:
          'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
        high:
          'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300',
        medium:
          'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
        info:
          'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300',
      },
    },
    defaultVariants: {
      severity: 'info',
    },
  },
);

export interface SeverityBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof severityBadgeVariants> {
  severity: SeverityLevel;
}

export function SeverityBadge({
  severity,
  className,
  children,
  ...props
}: SeverityBadgeProps) {
  const dotColor = {
    critical: 'bg-red-600 dark:bg-red-400',
    high: 'bg-orange-500 dark:bg-orange-400',
    medium: 'bg-amber-500 dark:bg-amber-400',
    info: 'bg-sky-500 dark:bg-sky-400',
  }[severity ?? 'info'];

  return (
    <span
      className={cn(severityBadgeVariants({ severity }), 'gap-1.5 font-medium tracking-normal capitalize', className)}
      {...props}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)} aria-hidden="true" />
      {children ?? severity}
    </span>
  );
}
