"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface AboutTabProps {
  bio: string
}

export default function AboutTab({ bio }: AboutTabProps) {
  const [bioExpanded, setBioExpanded] = useState(false)

  return (
    <div className="px-1">
      <div className="mb-4">
        <p className={`text-base ${bioExpanded ? "" : "line-clamp-5"}`}>{bio}</p>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 flex items-center gap-1"
          onClick={() => setBioExpanded(!bioExpanded)}
        >
          {bioExpanded ? (
            <>
              <span>Show Less</span>
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Read More</span>
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
