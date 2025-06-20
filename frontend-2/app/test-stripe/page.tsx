import TestStripe from "@/components/checkout/test-stripe"

export default function TestStripePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Testing Stripe Integration</h1>
      <TestStripe />
    </div>
  )
}