import { Separator } from "@/components/ui/separator"

interface Question {
  id: string
  question: string
  answer: string
}

interface QATabProps {
  questions: Question[]
}

export default function QATab({ questions }: QATabProps) {
  return (
    <div className="px-1">
      {questions && questions.length > 0 ? (
        <div className="space-y-6">
          {questions.map((qa, index) => (
            <div key={qa.id}>
              {index > 0 && <Separator className="my-6" />}
              <h3 className="font-medium mb-2">{qa.question}</h3>
              <p className="text-muted-foreground">{qa.answer}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No Q&A available.</p>
      )}
    </div>
  )
}
