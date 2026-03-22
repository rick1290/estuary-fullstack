import Link from "next/link"

interface Item {
  id: string
  content: string
}

interface Modality {
  id: string
  name: string
  slug?: string
  category_color?: string | null
  category_name?: string | null
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
        <h3 className="font-serif text-xl font-light text-olive-900 mb-5">Specializations</h3>
        <div className="flex flex-wrap gap-2">
          {specializations.map((specialization) => (
            <span key={specialization.id} className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light">
              {specialization.content}
            </span>
          ))}
          {specializations.length === 0 && <p className="text-sm font-light text-olive-600">No specializations listed.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-serif text-xl font-light text-olive-900 mb-5">Styles</h3>
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <span key={style.id} className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light">
              {style.content}
            </span>
          ))}
          {styles.length === 0 && <p className="text-sm font-light text-olive-600">No styles listed.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-serif text-xl font-light text-olive-900 mb-5">Topics</h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <span key={topic.id} className="text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light">
              {topic.content}
            </span>
          ))}
          {topics.length === 0 && <p className="text-sm font-light text-olive-600">No topics listed.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-serif text-xl font-light text-olive-900 mb-5">Modalities</h3>
        <div className="flex flex-wrap gap-2">
          {modalities.map((modality) => (
            <Link
              key={modality.id}
              href={`/modalities/${modality.slug || modality.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-sage-50 text-olive-600 rounded-full font-light hover:bg-sage-100 hover:text-olive-800 transition-colors"
            >
              {modality.category_color && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: modality.category_color }}
                />
              )}
              {modality.name}
            </Link>
          ))}
          {modalities.length === 0 && <p className="text-sm font-light text-olive-600">No modalities listed.</p>}
        </div>
      </div>
    </div>
  )
}
