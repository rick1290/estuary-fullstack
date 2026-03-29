"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  creditsBalanceRetrieveOptions,
  creditsTransactionsRetrieveOptions
} from "@/src/client/@tanstack/react-query.gen"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  ShoppingBag,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2
} from "lucide-react"
import { format, parseISO } from "date-fns"

const CREDIT_AMOUNTS = [
  { dollars: 10, label: "$10" },
  { dollars: 25, label: "$25" },
  { dollars: 50, label: "$50" },
  { dollars: 100, label: "$100" },
]

export default function CreditsTab() {
  const [page, setPage] = useState(1)
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const limit = 10
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch credit balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    ...creditsBalanceRetrieveOptions(),
  })

  const handlePurchase = async () => {
    if (!selectedAmount) return
    setPurchasing(true)
    try {
      const { creditsPurchaseCreate } = await import("@/src/client/sdk.gen")
      const response = await creditsPurchaseCreate({
        body: { amount_cents: selectedAmount * 100 } as any,
      })
      if (response.error) {
        throw new Error((response.error as any)?.detail || 'Purchase failed')
      }
      toast({
        title: "Credits purchased",
        description: `$${selectedAmount} in credits has been added to your account.`,
      })
      queryClient.invalidateQueries({ queryKey: creditsBalanceRetrieveOptions().queryKey })
      queryClient.invalidateQueries({ queryKey: ['credits', 'transactions'] })
      setBuyModalOpen(false)
      setSelectedAmount(null)
    } catch (err: any) {
      toast({
        title: "Purchase failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setPurchasing(false)
    }
  }

  // Fetch credit transactions
  const { data: transactions, isLoading: transactionsLoading, error } = useQuery({
    ...creditsTransactionsRetrieveOptions({
      query: {
        limit,
        offset: (page - 1) * limit,
        ordering: "-created_at"
      }
    }),
  })

  const isLoading = balanceLoading || transactionsLoading

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'usage':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'refund':
        return <TrendingUp className="h-4 w-4 text-blue-600" />
      case 'transfer':
        return <ShoppingBag className="h-4 w-4 text-purple-600" />
      default:
        return <Wallet className="h-4 w-4 text-olive-600" />
    }
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Badge variant="default" className="bg-green-100 text-green-800">Purchase</Badge>
      case 'usage':
        return <Badge variant="destructive">Usage</Badge>
      case 'refund':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Refund</Badge>
      case 'transfer':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Transfer</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatAmount = (amountCents: number) => {
    const amount = amountCents / 100
    const sign = amount >= 0 ? '+' : ''
    return `${sign}$${Math.abs(amount).toFixed(2)}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Credit Balance</h3>
          <Skeleton className="h-24 w-full" />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-4">Transaction History</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load credit information. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  const transactionsList = transactions?.results || []
  const totalCount = transactions?.count || 0

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Credit Balance</h3>
          <Button
            onClick={() => setBuyModalOpen(true)}
            className="bg-olive-800 hover:bg-olive-700 rounded-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Buy Credits
          </Button>
        </div>
        <Card className="border border-sage-200/60 bg-cream-50/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-olive-600 mb-1">Available Credits</p>
                <p className="font-serif text-3xl font-normal text-olive-900">
                  ${balance?.balance?.toFixed(2) || '0.00'}
                </p>
                {balance?.last_transaction_date && (
                  <p className="text-sm text-olive-600 mt-2">
                    Last transaction: {format(parseISO(balance.last_transaction_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-olive-800/10">
                <Wallet className="h-8 w-8 text-olive-800" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buy Credits Modal */}
      <Dialog open={buyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy Credits</DialogTitle>
            <DialogDescription>
              Select an amount to add to your credit balance. Credits are applied 1:1 with dollars.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {CREDIT_AMOUNTS.map((option) => (
              <Card
                key={option.dollars}
                className={`cursor-pointer border-2 transition-all hover:border-olive-600 ${
                  selectedAmount === option.dollars
                    ? 'border-olive-800 bg-olive-50'
                    : 'border-sage-200'
                }`}
                onClick={() => setSelectedAmount(option.dollars)}
              >
                <CardContent className="p-4 text-center">
                  <p className="font-serif text-2xl font-normal text-olive-900">
                    {option.label}
                  </p>
                  <p className="text-sm text-olive-600 mt-1">
                    {option.dollars} credits
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            onClick={handlePurchase}
            disabled={!selectedAmount || purchasing}
            className="w-full bg-olive-800 hover:bg-olive-700 rounded-full"
          >
            {purchasing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              selectedAmount ? `Purchase $${selectedAmount} in Credits` : 'Select an Amount'
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Transaction History */}
      <div>
        <h3 className="text-lg font-medium mb-4">Transaction History</h3>
        
        {transactionsList.length === 0 ? (
          <Card className="border border-sage-200/60">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-sage-300 mb-4" />
              <p className="text-olive-600">No credit transactions yet</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {transactionsList.map((transaction: any) => (
                <Card key={transaction.id} className="border border-sage-200 hover:border-sage-300 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTransactionBadge(transaction.transaction_type)}
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(transaction.created_at), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-olive-900">
                            {transaction.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-serif text-lg font-normal ${
                          transaction.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatAmount(transaction.amount_cents)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalCount > limit && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <Button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(totalCount / limit)}
                </span>
                <Button
                  onClick={() => setPage(prev => prev + 1)}
                  variant="outline"
                  size="sm"
                  disabled={!transactions?.next}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}