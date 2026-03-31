"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, X, MapPin, Globe, Star, DollarSign } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { modalityCategoriesListOptions, modalitiesListOptions } from "@/src/client/@tanstack/react-query.gen"
import { useMarketplaceFilters } from "@/hooks/use-marketplace-filters"
import { Slider } from "@/components/ui/slider"

// Generic dropdown chip
function FilterChip({
  label,
  active,
  count,
  children,
}: {
  label: string
  active: boolean
  count?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Keep dropdown open across URL-driven re-renders
  const openRef = useRef(false)
  openRef.current = open

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openRef.current && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all border ${
          active
            ? "bg-[#4A3F35] text-white border-[#4A3F35]"
            : "bg-white/70 text-[#6B6560] border-[rgba(74,63,53,0.1)] hover:bg-white hover:border-[rgba(74,63,53,0.2)]"
        }`}
      >
        {label}
        {count && count > 0 ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-[#4A3F35] text-white'}`}>
            {count}
          </span>
        ) : null}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-white/70' : 'text-[#9B9590]'}`} />
      </button>

      <div
        className={`absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl border border-[rgba(74,63,53,0.08)] shadow-[0_12px_40px_rgba(74,63,53,0.12)] p-4 min-w-[260px] max-h-[400px] overflow-y-auto transition-all duration-200 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{ scrollbarWidth: "thin" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default function MarketplaceFilterChips() {
  const { filters, updateFilter, toggleArrayFilter, resetFilters } = useMarketplaceFilters()

  // Fetch modality data
  const { data: categoriesData } = useQuery({
    ...modalityCategoriesListOptions({ query: { page_size: 50 } }),
    staleTime: 1000 * 60 * 10,
  })

  const { data: modalitiesData } = useQuery({
    ...modalitiesListOptions({ query: { page_size: 200 } }),
    staleTime: 1000 * 60 * 10,
  })

  const categories = categoriesData?.results || []
  const modalities = modalitiesData?.results || []

  // Group modalities by category
  const modalitiesByCategory = modalities.reduce<Record<string, typeof modalities>>((acc, mod) => {
    const catSlug = (mod as any).category_slug || "other"
    if (!acc[catSlug]) acc[catSlug] = []
    acc[catSlug].push(mod)
    return acc
  }, {})

  const activeFilterCount =
    filters.modalities.length +
    (filters.locationFormat !== "all" ? 1 : 0) +
    (filters.minPrice > 0 || filters.maxPrice < 2000 ? 1 : 0) +
    (filters.rating !== "any" ? 1 : 0)

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {/* Modality filter */}
      <FilterChip
        label="Modality"
        active={filters.modalities.length > 0}
        count={filters.modalities.length}
      >
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#9B9590] uppercase tracking-wide">Filter by modality</p>
          {categories.map((cat: any) => {
            const catMods = modalitiesByCategory[cat.slug ?? ""] || []
            if (catMods.length === 0) return null
            return (
              <div key={cat.id}>
                <p className="text-[11px] font-semibold text-[#4A3F35] mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || "#9CAF88" }} />
                  {cat.name}
                </p>
                <div className="flex flex-wrap gap-1.5 ml-3.5">
                  {catMods.map((mod: any) => {
                    const isSelected = filters.modalities.includes(String(mod.id))
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggleArrayFilter("modalities", String(mod.id))}
                        className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                          isSelected
                            ? "bg-[#4A3F35] text-white"
                            : "bg-[#f0ede8] text-[#6B6560] hover:bg-[#e5e0d8]"
                        }`}
                      >
                        {mod.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </FilterChip>

      {/* Format filter */}
      <FilterChip label="Format" active={filters.locationFormat !== "all"}>
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#9B9590] uppercase tracking-wide mb-3">Service format</p>
          {[
            { value: "all", label: "All Formats", icon: null },
            { value: "online", label: "Online Only", icon: <Globe className="h-3.5 w-3.5" /> },
            { value: "in-person", label: "In-Person Only", icon: <MapPin className="h-3.5 w-3.5" /> },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("locationFormat", opt.value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                filters.locationFormat === opt.value
                  ? "bg-[#4A3F35] text-white"
                  : "text-[#6B6560] hover:bg-[#f0ede8]"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </FilterChip>

      {/* Price filter */}
      <FilterChip label="Price" active={filters.minPrice > 0 || filters.maxPrice < 2000}>
        <div className="space-y-4">
          <p className="text-xs font-medium text-[#9B9590] uppercase tracking-wide">Price range</p>
          <Slider
            value={[filters.minPrice, filters.maxPrice]}
            onValueChange={([min, max]) => {
              updateFilter("minPrice", min, false)
              updateFilter("maxPrice", max, false)
            }}
            min={0}
            max={2000}
            step={10}
          />
          <div className="flex items-center justify-between text-[12px] text-[#6B6560]">
            <span>${filters.minPrice}</span>
            <span>${filters.maxPrice}+</span>
          </div>
        </div>
      </FilterChip>

      {/* Rating filter */}
      <FilterChip label="Rating" active={filters.rating !== "any"}>
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#9B9590] uppercase tracking-wide mb-3">Minimum rating</p>
          {[
            { value: "any", label: "Any Rating" },
            { value: "4+", label: "4+ Stars" },
            { value: "4.5+", label: "4.5+ Stars" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("rating", opt.value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                filters.rating === opt.value
                  ? "bg-[#4A3F35] text-white"
                  : "text-[#6B6560] hover:bg-[#f0ede8]"
              }`}
            >
              {opt.value !== "any" && <Star className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>
      </FilterChip>

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-[12px] text-[#9B9590] hover:text-[#4A3F35] transition-colors"
        >
          <X className="h-3 w-3" />
          Clear all
        </button>
      )}
    </div>
  )
}
