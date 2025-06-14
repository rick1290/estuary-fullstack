import { Badge } from "@/components/ui/badge"

interface Item {
  id: string
  content: string
}

interface Modality {
  id: string
  name: string
}

interface SpecialtiesTabProps {
  specializations: Item[]
  styles: Item[]
  topics: Item[]
  modalities: Modality[]
}

export default function SpecialtiesTab({ specializations, styles, topics, modalities }: SpecialtiesTabProps) {
  return (
    <div className="px-1 space-y-6">
      <div>
        <h3 className="text-base font-medium mb-3">Specializations</h3>
        <div className="flex flex-wrap gap-2">
          {specializations.map((specialization) => (
            <Badge key={specialization.id} variant="default">
              {specialization.content}
            </Badge>
          ))}
          {specializations.length === 0 && <p className="text-sm text-muted-foreground">No specializations listed.</p>}
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium mb-3">Styles</h3>
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <Badge key={style.id} variant="outline">
              {style.content}
            </Badge>
          ))}
          {styles.length === 0 && <p className="text-sm text-muted-foreground">No styles listed.</p>}
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium mb-3">Topics</h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Badge key={topic.id} variant="secondary">
              {topic.content}
            </Badge>
          ))}
          {topics.length === 0 && <p className="text-sm text-muted-foreground">No topics listed.</p>}
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium mb-3">Modalities</h3>
        <div className="flex flex-wrap gap-2">
          {modalities.map((modality) => (
            <Badge key={modality.id} variant="outline">
              {modality.name}
            </Badge>
          ))}
          {modalities.length === 0 && <p className="text-sm text-muted-foreground">No modalities listed.</p>}
        </div>
      </div>
    </div>
  )
}
