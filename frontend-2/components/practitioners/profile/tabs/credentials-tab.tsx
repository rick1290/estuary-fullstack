import { Award, GraduationCap } from "lucide-react"

interface Education {
  id: string
  degree: string
  educational_institute: string
}

interface Certification {
  id: string
  certificate: string
  institution: string
}

interface CredentialsTabProps {
  educations: Education[]
  certifications: Certification[]
}

export default function CredentialsTab({ educations, certifications }: CredentialsTabProps) {
  return (
    <div className="px-1 space-y-8">
      <div>
        <h3 className="font-serif text-xl font-normal text-olive-900 mb-5">Education</h3>
        {educations.length > 0 ? (
          <ul className="space-y-4">
            {educations.map((education) => (
              <li key={education.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <GraduationCap className="h-3.5 w-3.5 text-sage-500" />
                </div>
                <div>
                  <p className="font-light text-olive-900">{education.degree}</p>
                  <p className="text-sm font-light text-olive-600">{education.educational_institute}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-light text-olive-600">No education history listed.</p>
        )}
      </div>

      <div>
        <h3 className="font-serif text-xl font-normal text-olive-900 mb-5">Certifications</h3>
        {certifications.length > 0 ? (
          <ul className="space-y-4">
            {certifications.map((certification) => (
              <li key={certification.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Award className="h-3.5 w-3.5 text-sage-500" />
                </div>
                <div>
                  <p className="font-light text-olive-900">{certification.certificate}</p>
                  <p className="text-sm font-light text-olive-600">{certification.institution}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-light text-olive-600">No certifications listed.</p>
        )}
      </div>
    </div>
  )
}
