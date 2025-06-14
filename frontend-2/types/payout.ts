export interface PayoutTransaction {
  id: string
  serviceName: string
  serviceType: string
  clientName: string
  date: string
  timeSlot: string | null
  amount: number
}

export interface Payout {
  id: string
  amount: number
  grossAmount: number
  commissionAmount: number
  commissionRate: number
  status: "pending" | "processing" | "completed" | "failed"
  requestedDate: string
  processedDate: string | null
  processingTime: number
  transferId: string | null
  transactions: PayoutTransaction[]
}
