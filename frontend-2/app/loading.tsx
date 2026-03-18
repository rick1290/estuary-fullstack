export default function Loading() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-sage-100 rounded-lg" />
          <div className="h-4 w-96 bg-sage-100/60 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-sage-200/60 rounded-xl p-6 space-y-4">
                <div className="h-40 bg-sage-50 rounded-lg" />
                <div className="h-5 w-3/4 bg-sage-100/60 rounded" />
                <div className="h-4 w-1/2 bg-sage-100/40 rounded" />
                <div className="h-3 w-full bg-sage-100/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
