import * as React from "react"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SecurityBadgeProps {
  className?: string
  variant?: "default" | "small"
}

const SecurityBadge = React.forwardRef<HTMLDivElement, SecurityBadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
          {
            "px-2 py-1 text-xs": variant === "small",
            "px-3 py-1.5 text-sm": variant === "default",
          },
          className
        )}
        {...props}
      >
        <Lock className={cn("flex-shrink-0", {
          "h-3 w-3": variant === "small",
          "h-4 w-4": variant === "default",
        })} />
        <span className="font-medium">Encrypted</span>
      </div>
    )
  }
)
SecurityBadge.displayName = "SecurityBadge"

export { SecurityBadge }