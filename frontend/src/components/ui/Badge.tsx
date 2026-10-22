import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        gold: 'bg-gold/15 text-gold border border-gold/30 shadow-sm shadow-gold/10',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10',
        error: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10',
        emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10',
        ruby: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10',
        sapphire: 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10',
        amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        amethyst: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
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
