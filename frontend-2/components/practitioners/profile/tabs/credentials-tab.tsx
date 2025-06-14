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
        <h3 className="text-lg font-medium text-primary mb-4">Education</h3>
        {educations.length > 0 ? (
          <ul className="space-y-4">
            {educations.map((education) => (
              <li key={education.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{education.degree}</p>
                  <p className="text-sm text-muted-foreground">{education.educational_institute}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No education history listed.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium text-primary mb-4">Certifications</h3>
        {certifications.length > 0 ? (
          <ul className="space-y-4">
            {certifications.map((certification) => (
              <li key={certification.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{certification.certificate}</p>
                  <p className="text-sm text-muted-foreground">{certification.institution}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No certifications listed.</p>
        )}
      </div>
    </div>
  )
}
