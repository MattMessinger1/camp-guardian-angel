import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperProps {
  steps: Array<{
    id: string
    title: string
    description?: string
  }>
  currentStep: number
  className?: string
}

interface StepProps {
  step: {
    id: string
    title: string
    description?: string
  }
  index: number
  currentStep: number
  isLast: boolean
}

const Step = ({ step, index, currentStep, isLast }: StepProps) => {
  const stepNumber = index + 1
  const isActive = stepNumber === currentStep
  const isCompleted = stepNumber < currentStep
  const isUpcoming = stepNumber > currentStep

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all",
            {
              "border-primary bg-primary text-primary-foreground": isCompleted,
              "border-primary bg-background text-primary": isActive,
              "border-border bg-background text-muted-foreground": isUpcoming,
            }
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "mt-2 h-16 w-0.5 transition-all",
              {
                "bg-primary": isCompleted,
                "bg-border": !isCompleted,
              }
            )}
          />
        )}
      </div>
      <div className="ml-4 flex-1 pb-8">
        <h3
          className={cn(
            "text-sm font-medium transition-all",
            {
              "text-foreground": isActive || isCompleted,
              "text-muted-foreground": isUpcoming,
            }
          )}
        >
          {step.title}
        </h3>
        {step.description && (
          <p
            className={cn(
              "mt-1 text-xs transition-all",
              {
                "text-muted-foreground": isActive || isCompleted,
                "text-muted-foreground/60": isUpcoming,
              }
            )}
          >
            {step.description}
          </p>
        )}
      </div>
    </div>
  )
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ steps, currentStep, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-0", className)}
        {...props}
      >
        {steps.map((step, index) => (
          <Step
            key={step.id}
            step={step}
            index={index}
            currentStep={currentStep}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    )
  }
)
Stepper.displayName = "Stepper"

export { Stepper }