import { Separator } from "@/components/ui/separator"

interface Question {
  id: number
  title: string
  answer: string | null
  order: number
}

interface QATabProps {
  questions: Question[]
}

export default function QATab({ questions }: QATabProps) {
  // Sort by order
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order)

  return (
    <div className="px-1">
      {sortedQuestions && sortedQuestions.length > 0 ? (
        <div className="space-y-6">
          {sortedQuestions.map((qa, index) => (
            <div key={qa.id}>
              {index > 0 && <Separator className="my-4 bg-sage-200/40" />}
              <h3 className="text-[15px] font-light text-olive-900 mb-1">{qa.title}</h3>
              <p className="text-[15px] font-light text-olive-600 leading-relaxed">{qa.answer || "Answer coming soon..."}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-light text-olive-600">No Q&A available yet.</p>
      )}
    </div>
  )
}
