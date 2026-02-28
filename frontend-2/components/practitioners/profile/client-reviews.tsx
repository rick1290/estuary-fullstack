import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Star, ChevronDown } from "lucide-react"
import type { Practitioner } from "@/types/practitioner"

interface Review {
  id: string
  content: string
  author: string
  rating: number
  date: string
}

interface ClientReviewsProps {
  practitioner: Practitioner
}

export default function ClientReviews({ practitioner }: ClientReviewsProps) {
  // TODO: Fetch reviews from API when available
  const testimonials: Review[] = []
  return (
    <div className="mb-10">
      <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-2">Feedback</p>
      <h2 className="font-serif text-xl font-light text-olive-900 mb-5">Client Reviews</h2>

      {/* Overall Rating Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="bg-sage-50 text-olive-900 border border-sage-200/60 p-4 rounded-lg flex items-center">
          <span className="text-2xl font-light mr-2">{Number(practitioner.average_rating || practitioner.average_rating_float || 0).toFixed(1)}</span>
          <span className="text-xs font-light text-olive-600">out of 5</span>
        </div>

        <div>
          <div className="flex items-center gap-1">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.round(Number(practitioner.average_rating || practitioner.average_rating_float || 0)) ? "text-amber-500" : "text-olive-600/30"
                  }`}
                  fill={i < Math.round(Number(practitioner.average_rating || practitioner.average_rating_float || 0)) ? "currentColor" : "none"}
                />
              ))}
            <span className="ml-2 text-xs font-light text-olive-600">Based on {practitioner.total_reviews || 0} reviews</span>
          </div>
        </div>
      </div>

      {/* Reviews Grid or Empty State */}
      {testimonials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((review) => (
          <Card key={review.id} className="h-full transition-all border border-sage-200/60">
            <CardContent className="p-5 flex flex-col h-full">
              {/* Rating Stars */}
              <div className="flex mb-3">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < review.rating ? "text-amber-500" : "text-olive-600/30"}`}
                      fill={i < review.rating ? "currentColor" : "none"}
                    />
                  ))}
              </div>

              {/* Review Content */}
              <p className="text-[15px] font-light text-olive-600 leading-relaxed italic mb-4 flex-grow">"{review.content}"</p>

              {/* Author & Date */}
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="font-light text-olive-900">{review.author}</span>
                <span className="text-olive-500 font-light">
                  {new Date(review.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      ) : (
        <Card className="p-8 text-center border border-sage-200/60">
          <p className="text-olive-600 font-light">No reviews yet. Be the first to share your experience!</p>
        </Card>
      )}

      {/* View More Button */}
      {practitioner.total_reviews > testimonials.length && (
        <div className="flex justify-center mt-6">
          <Button variant="ghost" className="flex items-center gap-1 text-olive-500 hover:text-olive-700">
            <span>View More Reviews</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
