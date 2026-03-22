import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "./seo"

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: `${SITE_URL}/logo.png`,
    foundingDate: "2024",
    knowsAbout: [
      "Wellness", "Yoga", "Meditation", "Breathwork", "Reiki", "Energy Healing",
      "Life Coaching", "Somatic Therapy", "Sound Healing", "Mindfulness",
      "Acupuncture", "Massage Therapy", "Holistic Health", "Ayurveda",
    ],
    sameAs: [
      "https://instagram.com/estuary",
      "https://facebook.com/estuary",
      "https://twitter.com/estuary",
      "https://linkedin.com/company/estuary",
      "https://youtube.com/estuary",
    ],
  }
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/marketplace?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export function itemListSchema(
  name: string,
  items: { name: string; url: string; description?: string; position?: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: item.position || i + 1,
      name: item.name,
      url: item.url,
      ...(item.description && { description: item.description }),
    })),
  }
}

export function personSchema(practitioner: {
  display_name?: string
  full_name?: string
  slug?: string
  bio?: string
  profile_image_url?: string
  specializations?: string[]
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: practitioner.display_name || practitioner.full_name || "Practitioner",
    url: `${SITE_URL}/practitioners/${practitioner.slug}`,
    description: practitioner.bio,
    image: practitioner.profile_image_url,
    jobTitle: "Wellness Practitioner",
    ...(practitioner.specializations?.length && {
      knowsAbout: practitioner.specializations,
    }),
  }
}

export function serviceSchema(
  service: {
    title?: string
    slug?: string
    description?: string
    price?: number | string
    practitioner?: { display_name?: string; full_name?: string }
    cover_image_url?: string
  },
  type: string
) {
  const urlPrefix = type === "one-on-one" ? "sessions" : `${type}s`
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    url: `${SITE_URL}/${urlPrefix}/${service.slug}`,
    description: service.description,
    provider: {
      "@type": "Person",
      name: service.practitioner?.display_name || service.practitioner?.full_name,
    },
    ...(service.cover_image_url && { image: service.cover_image_url }),
    ...(service.price && {
      offers: {
        "@type": "Offer",
        price: service.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    }),
  }
}

export function eventSchema(
  event: {
    title?: string
    slug?: string
    description?: string
    price?: number | string
    practitioner?: { display_name?: string; full_name?: string }
    cover_image_url?: string
    start_date?: string
    end_date?: string
    max_participants?: number
    location_type?: string
  },
  type: "workshop" | "course"
) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    url: `${SITE_URL}/${type}s/${event.slug}`,
    description: event.description,
    ...(event.start_date && { startDate: event.start_date }),
    ...(event.end_date && { endDate: event.end_date }),
    organizer: {
      "@type": "Person",
      name: event.practitioner?.display_name || event.practitioner?.full_name,
    },
    eventAttendanceMode:
      event.location_type === "in_person"
        ? "https://schema.org/OfflineEventAttendanceMode"
        : "https://schema.org/OnlineEventAttendanceMode",
    ...(event.cover_image_url && { image: event.cover_image_url }),
    ...(event.price && {
      offers: {
        "@type": "Offer",
        price: event.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    }),
    ...(event.max_participants && {
      maximumAttendeeCapacity: event.max_participants,
    }),
  }
}

export function breadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}
