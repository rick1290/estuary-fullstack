"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  number: number
  title: string
  description: string
  estimatedTime: string
}

const ONBOARDING_STEPS: Step[] = [
  {
    number: 1,
    title: "Basic Profile",
    description: "Tell us about yourself",
    estimatedTime: "3 min"
  },
  {
    number: 2,
    title: "Expertise",
    description: "Your specializations & approach",
    estimatedTime: "3 min"
  },
  {
    number: 3,
    title: "Scheduling",
    description: "Set your preferences",
    estimatedTime: "1 min"
  },
  {
    number: 4,
    title: "Credentials",
    description: "Add certifications & education",
    estimatedTime: "Skip ok"
  },
  {
    number: 5,
    title: "Verification",
    description: "Background check (optional)",
    estimatedTime: "Skip ok"
  },
  {
    number: 6,
    title: "Questions",
    description: "Common client questions",
    estimatedTime: "Skip ok"
  },
  {
    number: 7,
    title: "Payment Setup",
    description: "Connect for payouts",
    estimatedTime: "5 min"
  }
]

interface ProgressStepperProps {
  currentStep: number
  completedSteps: number[]
}

export default function ProgressStepper({ currentStep, completedSteps }: ProgressStepperProps) {
  const totalSteps = ONBOARDING_STEPS.length
  const progressPercentage = ((completedSteps.length) / totalSteps) * 100

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-olive-700">
            Step {currentStep} of {totalSteps}
          </p>
          <p className="text-sm text-olive-600">
            {Math.round(progressPercentage)}% Complete
          </p>
        </div>
        <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-600 to-terracotta-600 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Desktop Horizontal Stepper */}
      <div className="hidden md:flex items-center justify-between">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number)
          const isCurrent = currentStep === step.number
          const isPast = step.number < currentStep
          const isFuture = step.number > currentStep

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted && "bg-terracotta-500 border-terracotta-500",
                    isCurrent && "bg-sage-600 border-sage-600 ring-4 ring-sage-100",
                    isPast && !isCompleted && "bg-sage-600 border-sage-600",
                    isFuture && "bg-white border-sage-200"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-6 w-6 text-white" strokeWidth={3} />
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-bold",
                        (isCurrent || isPast) && "text-white",
                        isFuture && "text-olive-400"
                      )}
                    >
                      {step.number}
                    </span>
                  )}
                </div>

                {/* Step Info */}
                <div className="mt-3 text-center max-w-[120px]">
                  <p className={cn(
                    "text-sm font-medium mb-0.5",
                    (isCurrent || isCompleted) && "text-olive-900",
                    isFuture && "text-olive-500"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-olive-600 mb-1">{step.description}</p>
                  <p className="text-xs text-olive-500 font-medium">{step.estimatedTime}</p>
                </div>
              </div>

              {/* Connector Line */}
              {index < ONBOARDING_STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 mb-16">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isPast || isCompleted ? "bg-sage-400" : "bg-sage-200"
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile Vertical Stepper */}
      <div className="md:hidden space-y-4">
        {ONBOARDING_STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.number)
          const isCurrent = currentStep === step.number
          const isPast = step.number < currentStep
          const isFuture = step.number > currentStep

          return (
            <div key={step.number} className="flex items-start gap-4">
              {/* Step Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0",
                  isCompleted && "bg-terracotta-500 border-terracotta-500",
                  isCurrent && "bg-sage-600 border-sage-600 ring-4 ring-sage-100",
                  isPast && !isCompleted && "bg-sage-600 border-sage-600",
                  isFuture && "bg-white border-sage-200"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 text-white" strokeWidth={3} />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-bold",
                      (isCurrent || isPast) && "text-white",
                      isFuture && "text-olive-400"
                    )}
                  >
                    {step.number}
                  </span>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between mb-1">
                  <p className={cn(
                    "text-sm font-medium",
                    (isCurrent || isCompleted) && "text-olive-900",
                    isFuture && "text-olive-500"
                  )}>
                    {step.title}
                  </p>
                  <span className="text-xs text-olive-500 font-medium">{step.estimatedTime}</span>
                </div>
                <p className="text-xs text-olive-600">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
