"use client"

import React, { Suspense, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import ClientProfile from "@/components/dashboard/practitioner/clients/client-profile"
import ClientServiceHistory from "@/components/dashboard/practitioner/clients/client-service-history"
import ClientNotes from "@/components/dashboard/practitioner/clients/client-notes"
import LoadingSpinner from "@/components/ui/loading-spinner"

interface ClientDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = React.use(params)
  const [activeTab, setActiveTab] = useState("history")

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/dashboard/practitioner/clients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Client Profile</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Suspense fallback={<LoadingSpinner />}>
            <ClientProfile clientId={id} />
          </Suspense>
        </div>
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Service History</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-6">
              <Suspense fallback={<LoadingSpinner />}>
                <ClientServiceHistory clientId={id} />
              </Suspense>
            </TabsContent>
            <TabsContent value="notes" className="mt-6">
              <Suspense fallback={<LoadingSpinner />}>
                <ClientNotes clientId={id} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
