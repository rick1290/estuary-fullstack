import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-gray-200 bg-background px-4 py-3 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-300",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
