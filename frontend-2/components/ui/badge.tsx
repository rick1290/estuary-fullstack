import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-sage-600 text-cream-50 hover:bg-sage-700",
        secondary:
          "border-transparent bg-sage-100 text-sage-800 hover:bg-sage-200",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-sage-300 text-sage-700 hover:bg-sage-50",
        sage: "border-transparent bg-sage-100 text-sage-800 hover:bg-sage-200",
        terracotta: "border-transparent bg-terracotta-200 text-olive-900 hover:bg-terracotta-300",
        blush: "border-transparent bg-blush-200 text-olive-900 hover:bg-blush-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
