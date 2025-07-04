"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"

interface PractitionerPageHeaderProps {
  title: string
  helpLink?: string
  action?: {
    label: string
    icon?: ReactNode
    href?: string
    onClick?: () => void
  }
  tabs?: {
    value: string
    label: string
  }[]
  activeTab?: string
  onTabChange?: (value: string) => void
  className?: string
  children?: ReactNode
}

export function PractitionerPageHeader({
  title,
  helpLink,
  action,
  tabs,
  activeTab,
  onTabChange,
  className,
  children
}: PractitionerPageHeaderProps) {
  return (
    <div className={cn("bg-muted/30", className)}>
      <div className="px-6">
        {/* Title row with action - compact spacing */}
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {helpLink && (
              <Link 
                href={helpLink} 
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Help docs
                <HelpCircle className="h-3 w-3" />
              </Link>
            )}
          </div>
          
          {action && (
            <Button
              onClick={action.onClick}
              asChild={!!action.href}
            >
              {action.href ? (
                <Link href={action.href}>
                  {action.icon}
                  <span className={action.icon ? "ml-2" : ""}>{action.label}</span>
                </Link>
              ) : (
                <>
                  {action.icon}
                  <span className={action.icon ? "ml-2" : ""}>{action.label}</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Tabs directly below - no gap */}
        {tabs && tabs.length > 0 ? (
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="h-auto p-0 bg-transparent border-0 rounded-none w-full justify-start">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : children ? (
          children
        ) : null}
      </div>
    </div>
  )
}