import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        gold: 'bg-gold/20 text-gold border border-gold/30',
        success: 'bg-success/20 text-success border border-success/30',
        error: 'bg-error/20 text-error border border-error/30',
        neutral: 'bg-surface-2 text-beige-muted border border-border',
        outline: 'border border-beige/30 text-beige bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
