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
        <p className={`text-[15px] font-light text-olive-600 leading-relaxed ${bioExpanded ? "" : "line-clamp-3"}`}>{bio}</p>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 flex items-center gap-1 text-olive-500 hover:text-olive-700"
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
