import { Spinner } from "@/components/ui/spinner"

export default function LoadingSpinner() {
  return (
    <div className="flex h-40 w-full items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
