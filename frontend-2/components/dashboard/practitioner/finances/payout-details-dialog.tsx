import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PayoutDetails } from "./payout-details"
import type { Payout } from "@/types/payout"

interface PayoutDetailsDialogProps {
  payout: Payout | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PayoutDetailsDialog({ payout, open, onOpenChange }: PayoutDetailsDialogProps) {
  if (!payout) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0 sm:max-h-[85vh]">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4">
          <DialogTitle>Payout Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] p-6">
          <PayoutDetails payout={payout} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
