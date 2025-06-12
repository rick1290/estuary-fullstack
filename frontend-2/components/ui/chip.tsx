"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { type VariantProps, cva } from "class-variance-authority"

const chipVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-secondary data-[state=open]:text-secondary-foreground",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-6",
        sm: "h-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(({ className, variant, size, ...props }, ref) => {
  return <span className={cn(chipVariants({ variant, size, className }))} ref={ref} {...props} />
})
Chip.displayName = "Chip"

export { Chip, chipVariants }
