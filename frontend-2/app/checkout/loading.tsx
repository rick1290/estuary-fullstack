export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-sage-100 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-4">
              <div className="bg-white border border-sage-200/60 rounded-xl p-6 space-y-4">
                <div className="h-5 w-48 bg-sage-100/60 rounded" />
                <div className="h-11 w-full bg-sage-50 rounded-lg" />
                <div className="h-11 w-full bg-sage-50 rounded-lg" />
                <div className="h-24 w-full bg-sage-50 rounded-lg" />
              </div>
              <div className="h-12 w-full bg-sage-100 rounded-full" />
            </div>
            <div className="bg-white border border-sage-200/60 rounded-xl p-6 space-y-4">
              <div className="h-32 bg-sage-50 rounded-lg" />
              <div className="h-4 w-3/4 bg-sage-100/60 rounded" />
              <div className="h-4 w-1/2 bg-sage-100/40 rounded" />
              <div className="h-px bg-sage-200/60" />
              <div className="h-6 w-24 bg-sage-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
