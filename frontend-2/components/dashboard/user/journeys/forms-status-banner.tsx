"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle, FileText, ChevronRight } from "lucide-react"

interface FormsStatusBannerProps {
  bookingUuid: string | undefined | null
}

export default function FormsStatusBanner({ bookingUuid }: FormsStatusBannerProps) {
  const [formsStatus, setFormsStatus] = useState<any>(null)

  useEffect(() => {
    if (!bookingUuid) return

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    fetch(`${baseUrl}/api/v1/intake/bookings/${bookingUuid}/forms/`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setFormsStatus(data?.data || data))
      .catch(() => {})
  }, [bookingUuid])

  if (!formsStatus?.has_forms) return null

  const allDone = formsStatus.consent_signed !== false && formsStatus.intake_completed
  const consentNeeded = formsStatus.consent_required && !formsStatus.consent_signed

  if (allDone) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 mb-4">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-800">All pre-session forms completed</span>
      </div>
    )
  }

  return (
    <Link href={`/dashboard/user/bookings/${bookingUuid}/forms`}>
      <div className={`flex items-center justify-between p-3 rounded-lg border mb-4 cursor-pointer hover:shadow-sm transition-shadow ${
        consentNeeded
          ? 'bg-amber-50 border-amber-200'
          : 'bg-sage-50 border-sage-200'
      }`}>
        <div className="flex items-center gap-2">
          <FileText className={`h-4 w-4 ${consentNeeded ? 'text-amber-600' : 'text-sage-600'}`} />
          <span className={`text-sm font-medium ${consentNeeded ? 'text-amber-800' : 'text-sage-800'}`}>
            {consentNeeded ? 'Consent form required before session' : 'Pre-session form available'}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-olive-500" />
      </div>
    </Link>
  )
}
