"use client"

import { useEffect, useState } from "react"
import { getStripe } from "@/lib/stripe-loader"

export default function TestStripe() {
  const [stripeLoaded, setStripeLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testStripe = async () => {
      try {
        const stripe = await getStripe()
        setStripeLoaded(!!stripe)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Stripe")
      }
    }
    
    testStripe()
  }, [])

  return (
    <div className="p-4">
      {error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <p className="text-green-500">
          Stripe loaded: {stripeLoaded ? "Yes" : "No"}
        </p>
      )}
    </div>
  )
}