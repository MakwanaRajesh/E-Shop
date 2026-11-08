'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

import { Slot } from '@radix-ui/react-slot'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        primary:
          'bg-obsidian text-white hover:bg-gold hover:text-obsidian font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95',
        secondary:
          'border border-border text-obsidian bg-surface hover:border-gold hover:text-gold hover:bg-background transition-all duration-200',
        ghost:
          'text-slate hover:text-obsidian hover:bg-surface-2 transition-colors',
        danger:
          'bg-bordeaux-blush text-bordeaux border border-bordeaux-border hover:bg-red-100 transition-colors',
        outline:
          'border border-gold text-obsidian bg-transparent hover:bg-gold hover:text-white transition-all duration-200',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded',
        md: 'h-10 px-5 text-sm rounded',
        lg: 'h-12 px-8 text-base rounded',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, asChild = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
