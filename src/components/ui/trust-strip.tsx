import * as React from "react"
import { Shield, Users, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrustStripProps {
  className?: string
}

const trustItems = [
  {
    icon: Shield,
    title: "Secure & encrypted",
    description: "Your data is protected with bank-level encryption"
  },
  {
    icon: Users,
    title: "Human-driven",
    description: "Real humans review and process your requests"
  },
  {
    icon: DollarSign,
    title: "Success-based fee",
    description: "You only pay when we successfully register your child"
  }
]

const TrustStrip = React.forwardRef<HTMLDivElement, TrustStripProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "border border-border/50 bg-gradient-to-r from-background/80 to-muted/30 backdrop-blur-sm rounded-lg p-6",
          className
        )}
        {...props}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trustItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
TrustStrip.displayName = "TrustStrip"

export { TrustStrip }