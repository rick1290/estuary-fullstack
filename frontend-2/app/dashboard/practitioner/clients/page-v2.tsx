"use client"

import { PractitionerPageHeader } from "@/components/dashboard/practitioner/practitioner-page-header"
import ClientsList from "@/components/dashboard/practitioner/clients/clients-list"

export default function ClientsPageV2() {
  return (
    <>
      {/* Standardized Header */}
      <PractitionerPageHeader
        title="Clients"
        helpLink="/help/practitioner/clients"
      />

      <div className="px-6 py-4">
        <ClientsList />
      </div>
    </>
  )
}