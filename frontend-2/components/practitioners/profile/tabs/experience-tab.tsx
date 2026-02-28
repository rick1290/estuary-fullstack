import { Clock, User, CheckCircle, Leaf } from "lucide-react"

interface ExperienceTabProps {
  years_of_experience: number
  completed_sessions: number
  is_verified: boolean
  practitioner_status: string
}

export default function ExperienceTab({
  years_of_experience,
  completed_sessions,
  is_verified,
  practitioner_status,
}: ExperienceTabProps) {
  return (
    <div className="px-1">
      <ul className="space-y-5">
        <li className="flex items-start gap-3">
          <div className="mt-0.5">
            <Clock className="h-3.5 w-3.5 text-sage-500" />
          </div>
          <div>
            <p className="font-light text-olive-900">Years of Experience</p>
            <p className="text-sm font-light text-olive-600">{years_of_experience} years</p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <div className="mt-0.5">
            <User className="h-3.5 w-3.5 text-sage-500" />
          </div>
          <div>
            <p className="font-light text-olive-900">Sessions Completed</p>
            <p className="text-sm font-light text-olive-600">{completed_sessions}</p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <div className="mt-0.5">
            <CheckCircle className="h-3.5 w-3.5 text-sage-500" />
          </div>
          <div>
            <p className="font-light text-olive-900">Verification Status</p>
            <p className="text-sm font-light text-olive-600">
              {is_verified ? "Verified Practitioner" : "Verification Pending"}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <div className="mt-0.5">
            <Leaf className="h-3.5 w-3.5 text-sage-500" />
          </div>
          <div>
            <p className="font-light text-olive-900">Practitioner Status</p>
            <p className="text-sm font-light text-olive-600">
              {practitioner_status ? practitioner_status.charAt(0).toUpperCase() + practitioner_status.slice(1) : 'Not specified'}
            </p>
          </div>
        </li>
      </ul>
    </div>
  )
}
