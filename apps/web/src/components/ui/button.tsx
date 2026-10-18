'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline:
          'border border-border/80 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent/60 hover:text-accent-foreground active:scale-100',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'h-9 px-4 py-2 min-h-[36px]',
        sm: 'h-8 rounded-md px-3 text-xs min-h-[32px]',
        lg: 'h-10 rounded-lg px-8 min-h-[40px]',
        icon: 'h-9 w-9 min-h-[36px] min-w-[36px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

function hasSpinningLoader(node: React.ReactNode): boolean {
  if (!node) return false;
  if (React.isValidElement(node)) {
    const props = node.props as { className?: string; children?: React.ReactNode };
    if (props?.className && props.className.includes('animate-spin')) {
      return true;
    }
    if (props?.children) {
      return hasSpinningLoader(props.children);
    }
  }
  if (Array.isArray(node)) {
    return node.some(hasSpinningLoader);
  }
  return false;
}

function hasLoadingEllipsis(node: React.ReactNode): boolean {
  if (!node) return false;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    return trimmed.endsWith('...') || trimmed.endsWith('…');
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    if (props?.children) {
      return hasLoadingEllipsis(props.children);
    }
  }
  if (Array.isArray(node)) {
    return node.some(hasLoadingEllipsis);
  }
  return false;
}

function isPromiseLike(val: unknown): val is PromiseLike<unknown> {
  return (
    typeof val === 'object' &&
    val !== null &&
    'then' in val &&
    typeof (val as { then: unknown }).then === 'function'
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      disabled,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [isActionPending, setIsActionPending] = React.useState(false);

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    const isEllipsisLoading = Boolean(disabled && hasLoadingEllipsis(children));
    const showLoader = Boolean(isLoading || isActionPending || isEllipsisLoading);
    const isDisabled = Boolean(disabled || showLoader);
    const alreadyHasSpinner = hasSpinningLoader(children);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (onClick) {
        try {
          const res: unknown = (onClick as (event: React.MouseEvent<HTMLButtonElement>) => unknown)(e);
          if (isPromiseLike(res)) {
            setIsActionPending(true);
            await res;
          }
        } finally {
          setIsActionPending(false);
        }
      }
    };

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={showLoader}
        onClick={handleClick}
        {...props}
      >
        {showLoader && !alreadyHasSpinner && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        )}
        {showLoader && loadingText ? loadingText : children}
      </button>
    );
  },
);
Button.displayName = 'Button';
