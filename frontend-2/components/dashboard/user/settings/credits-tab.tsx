"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  ShoppingBag,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { format, parseISO } from "date-fns"

export default function CreditsTab() {
  const [page, setPage] = useState(1)
  const limit = 10

  // Fetch credit balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    ...creditsBalanceRetrieveOptions(),
  })

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
        return <Wallet className="h-4 w-4 text-gray-600" />
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
        <h3 className="text-lg font-medium mb-4">Credit Balance</h3>
        <Card className="border-2 border-sage-200 bg-gradient-to-br from-sage-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-olive-600 mb-1">Available Credits</p>
                <p className="text-3xl font-bold text-olive-900">
                  ${balance?.balance?.toFixed(2) || '0.00'}
                </p>
                {balance?.last_transaction_date && (
                  <p className="text-sm text-olive-600 mt-2">
                    Last transaction: {format(parseISO(balance.last_transaction_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-sage-600/10">
                <Wallet className="h-8 w-8 text-sage-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-lg font-medium mb-4">Transaction History</h3>
        
        {transactionsList.length === 0 ? (
          <Card className="border-2 border-sage-200">
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
                        <p className={`text-lg font-bold ${
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