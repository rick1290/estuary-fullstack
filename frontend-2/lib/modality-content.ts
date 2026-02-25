export interface ModalityEditorialContent {
  heroTitle: string
  heroTitleAccent: string
  heroDescription: string
  longDescription: string
  benefits: { title: string; description: string }[]
  faqs: { question: string; answer: string }[]
  ctaHeading: string
  ctaDescription: string
}

const MODALITY_CONTENT: Record<string, ModalityEditorialContent> = {
  yoga: {
    heroTitle: "Discover the Practice of",
    heroTitleAccent: "Yoga",
    heroDescription:
      "Explore yoga sessions, workshops, and courses that cultivate flexibility, strength, and inner peace. Find your perfect practice with experienced practitioners.",
    longDescription:
      "Yoga is an ancient practice that unites body, breath, and mind. Whether you're drawn to the flowing sequences of Vinyasa, the deep holds of Yin, or the precision of Iyengar, our practitioners guide you toward greater awareness and well-being.",
    benefits: [
      { title: "Physical Vitality", description: "Build strength, flexibility, and balance through mindful movement." },
      { title: "Mental Clarity", description: "Reduce stress and cultivate focus through breathwork and meditation." },
      { title: "Inner Peace", description: "Develop a sustainable personal practice that supports lifelong well-being." },
    ],
    faqs: [
      { question: "Do I need to be flexible to start yoga?", answer: "Not at all. Yoga meets you where you are. Flexibility develops over time through consistent practice, and every pose can be modified to suit your body." },
      { question: "What style of yoga is best for beginners?", answer: "Hatha and gentle Vinyasa classes are great starting points. They move at a slower pace and focus on foundational postures and breath awareness." },
      { question: "What should I bring to a yoga session?", answer: "A yoga mat is helpful, though many practitioners provide them. Wear comfortable clothing that allows you to move freely, and bring water if you like." },
      { question: "How often should I practice?", answer: "Even one session per week can make a difference. Many practitioners recommend 2-3 sessions weekly to build consistency and see steady progress." },
    ],
    ctaHeading: "Start Your Yoga Journey",
    ctaDescription: "Connect with experienced yoga practitioners and find sessions, workshops, and courses that match your goals.",
  },
  breathwork: {
    heroTitle: "Experience the Power of",
    heroTitleAccent: "Breathwork",
    heroDescription:
      "Unlock vitality, release tension, and access deeper states of awareness through guided breathwork sessions with skilled facilitators.",
    longDescription:
      "Breathwork encompasses a range of techniques — from Holotropic and Wim Hof to gentle pranayama — that use conscious breathing to shift your physical and emotional state. Guided by trained facilitators, these practices can release stored tension, increase energy, and open pathways to profound self-discovery.",
    benefits: [
      { title: "Stress Release", description: "Activate your parasympathetic nervous system and release stored tension in minutes." },
      { title: "Emotional Clarity", description: "Process and release suppressed emotions through the body's own intelligence." },
      { title: "Renewed Energy", description: "Oxygenate your cells and experience a natural boost in vitality and focus." },
    ],
    faqs: [
      { question: "Is breathwork safe?", answer: "For most people, yes. However, certain techniques are intense. Facilitators on Estuary will review any health considerations before your session. Those with cardiovascular conditions or who are pregnant should consult a doctor first." },
      { question: "What happens during a breathwork session?", answer: "You'll be guided through specific breathing patterns, often accompanied by music. Sessions can range from calming and meditative to deeply energizing, depending on the technique." },
      { question: "Can I do breathwork online?", answer: "Absolutely. Many breathwork sessions are conducted virtually with excellent results. All you need is a quiet space where you can lie down comfortably." },
      { question: "How will I feel afterward?", answer: "Most people report feeling lighter, more relaxed, and emotionally clear. Some experience tingling or mild lightheadedness during the session, which is normal and temporary." },
    ],
    ctaHeading: "Breathe Into Your Potential",
    ctaDescription: "Find breathwork facilitators and sessions that help you release, reset, and reconnect.",
  },
  meditation: {
    heroTitle: "Cultivate Stillness with",
    heroTitleAccent: "Meditation",
    heroDescription:
      "Develop a grounded meditation practice with expert guidance. From mindfulness to transcendental techniques, find the approach that resonates with you.",
    longDescription:
      "Meditation is the practice of training attention and awareness to achieve mental clarity and emotional calm. Whether you're seeking stress relief, spiritual growth, or simply a few minutes of quiet, our practitioners offer diverse traditions and techniques to support your path.",
    benefits: [
      { title: "Calm Mind", description: "Reduce anxiety and cultivate a steady, peaceful inner landscape." },
      { title: "Deeper Awareness", description: "Develop mindfulness that extends into every aspect of daily life." },
      { title: "Emotional Resilience", description: "Build the capacity to respond rather than react to life's challenges." },
    ],
    faqs: [
      { question: "I can't stop my thoughts — can I still meditate?", answer: "The goal of meditation isn't to stop thinking. It's about observing your thoughts without attachment. Every meditator experiences a busy mind — the practice is in gently returning your focus." },
      { question: "How long should I meditate?", answer: "Even 5-10 minutes daily is beneficial. Many practitioners recommend starting with short sessions and gradually increasing as your practice deepens." },
      { question: "What's the difference between guided and silent meditation?", answer: "Guided meditation features a teacher's voice leading you through the practice. Silent meditation provides structure but leaves you in stillness. Both are valuable — beginners often prefer guided sessions." },
      { question: "Do I need any special equipment?", answer: "No special equipment is needed. A quiet space and a comfortable seat are all you need. A cushion or chair works perfectly." },
    ],
    ctaHeading: "Begin Your Meditation Practice",
    ctaDescription: "Connect with meditation teachers and find sessions that bring clarity, calm, and presence into your life.",
  },
  reiki: {
    heroTitle: "Restore Balance with",
    heroTitleAccent: "Reiki",
    heroDescription:
      "Experience gentle energy healing that promotes deep relaxation, emotional balance, and holistic well-being with certified Reiki practitioners.",
    longDescription:
      "Reiki is a Japanese energy healing technique that channels universal life force energy to support the body's natural healing processes. Through light touch or hands hovering above the body, practitioners facilitate the release of energetic blockages, promoting relaxation and balance on physical, emotional, and spiritual levels.",
    benefits: [
      { title: "Deep Relaxation", description: "Enter a state of profound calm that allows your body to rest and restore itself." },
      { title: "Energetic Balance", description: "Release blockages and restore the natural flow of energy throughout your system." },
      { title: "Holistic Healing", description: "Support your overall well-being on physical, emotional, and spiritual levels simultaneously." },
    ],
    faqs: [
      { question: "Do I need to believe in Reiki for it to work?", answer: "You don't need any particular belief system. Reiki works on the principle of energy flow — many skeptics report feeling deeply relaxed and noticing positive shifts after sessions." },
      { question: "Can Reiki be done remotely?", answer: "Yes, distance Reiki is a well-established practice. Many clients find virtual sessions equally effective, as energy is not limited by physical proximity." },
      { question: "What will I feel during a session?", answer: "Experiences vary. Common sensations include warmth, tingling, a sense of floating, or deep relaxation. Some people fall asleep, which is perfectly fine and often a sign of deep healing." },
      { question: "How many sessions do I need?", answer: "Some people feel significant shifts after one session, while others benefit from a series. Your practitioner can recommend a plan based on your goals." },
    ],
    ctaHeading: "Experience Reiki Healing",
    ctaDescription: "Find certified Reiki practitioners and book sessions that support your journey to balance and well-being.",
  },
  "somatic-therapy": {
    heroTitle: "Heal Through the Body with",
    heroTitleAccent: "Somatic Therapy",
    heroDescription:
      "Reconnect with your body's innate wisdom through somatic practices that release stored trauma, reduce chronic tension, and restore nervous system balance.",
    longDescription:
      "Somatic therapy works with the body as a primary avenue for healing. By tuning into physical sensations, movement patterns, and the nervous system, somatic practitioners help you release patterns of tension and trauma held in the body — creating lasting change that talk therapy alone may not reach.",
    benefits: [
      { title: "Trauma Release", description: "Gently process and release stored trauma through body-centered awareness." },
      { title: "Nervous System Regulation", description: "Build capacity to move between activation and calm with greater ease." },
      { title: "Embodied Presence", description: "Develop a deeper, more trusting relationship with your own body and sensations." },
    ],
    faqs: [
      { question: "What happens in a somatic therapy session?", answer: "Sessions typically involve guided awareness of body sensations, gentle movement, breathwork, and sometimes touch. Your practitioner will work at your pace, ensuring you feel safe throughout." },
      { question: "Is somatic therapy the same as massage?", answer: "No. While both involve body awareness, somatic therapy focuses on the connection between physical sensations and emotional or psychological patterns. It's a therapeutic modality, not bodywork." },
      { question: "Can somatic therapy help with anxiety?", answer: "Yes. Anxiety often manifests as physical tension and nervous system dysregulation. Somatic therapy directly addresses these patterns, helping you build resilience and calm from the inside out." },
      { question: "Do I need a referral?", answer: "No referral is needed to book with practitioners on Estuary. However, somatic therapy can be a powerful complement to existing mental health support." },
    ],
    ctaHeading: "Start Your Somatic Healing Journey",
    ctaDescription: "Connect with somatic therapy practitioners who can guide you toward deeper healing and embodied well-being.",
  },
  coaching: {
    heroTitle: "Transform Your Life with",
    heroTitleAccent: "Coaching",
    heroDescription:
      "Work with skilled coaches to clarify your vision, overcome obstacles, and create meaningful change in your personal and professional life.",
    longDescription:
      "Life and wellness coaching is a collaborative process that helps you identify goals, uncover blind spots, and take purposeful action. Whether you're navigating a life transition, building healthier habits, or seeking greater fulfillment, a coach provides accountability, perspective, and proven frameworks for growth.",
    benefits: [
      { title: "Clarity & Direction", description: "Define what matters most and create a roadmap to get there with confidence." },
      { title: "Accountability", description: "Stay on track with structured support that keeps you moving toward your goals." },
      { title: "Breakthrough Growth", description: "Identify and move through the patterns and beliefs that have been holding you back." },
    ],
    faqs: [
      { question: "What's the difference between coaching and therapy?", answer: "Coaching is future-focused and action-oriented — it helps you move from where you are to where you want to be. Therapy often addresses past experiences and mental health conditions. Many people benefit from both." },
      { question: "How long does a coaching engagement last?", answer: "This varies. Some clients achieve their goals in 4-6 sessions, while others work with a coach over several months. Your coach will help you determine the right timeline." },
      { question: "What can I expect from a first session?", answer: "An initial coaching session typically involves exploring your goals, current challenges, and what success looks like for you. It's a conversation — not an interrogation — designed to build trust and clarity." },
      { question: "Is coaching effective online?", answer: "Absolutely. Virtual coaching sessions are just as effective as in-person meetings. Many clients prefer the convenience and comfort of coaching from home." },
    ],
    ctaHeading: "Start Your Coaching Journey",
    ctaDescription: "Find a coach who aligns with your goals and take the first step toward meaningful transformation.",
  },
}

function toTitleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function getModalityContent(
  slug: string,
  name: string,
  description?: string | null
): ModalityEditorialContent {
  if (MODALITY_CONTENT[slug]) {
    return MODALITY_CONTENT[slug]
  }

  const displayName = name || toTitleCase(slug)
  const desc =
    description ||
    `Explore ${displayName} services and connect with experienced practitioners on Estuary.`

  return {
    heroTitle: `Explore the World of`,
    heroTitleAccent: displayName,
    heroDescription: desc,
    longDescription: `${displayName} is a transformative wellness practice. Our community of practitioners offers sessions, workshops, and courses to support your journey.`,
    benefits: [
      { title: "Expert Guidance", description: `Learn from experienced ${displayName.toLowerCase()} practitioners who are passionate about your growth.` },
      { title: "Flexible Formats", description: "Choose from one-on-one sessions, group workshops, and structured courses that fit your schedule." },
      { title: "Supportive Community", description: "Join a community of like-minded individuals exploring wellness and personal transformation." },
    ],
    faqs: [
      { question: `What is ${displayName}?`, answer: desc },
      { question: `Do I need prior experience with ${displayName}?`, answer: `No prior experience is needed. Our practitioners welcome beginners and will meet you where you are in your journey.` },
      { question: "Can I try a single session before committing?", answer: "Absolutely. Many practitioners offer individual sessions so you can find the right fit before committing to a series or course." },
      { question: "Are virtual sessions available?", answer: "Yes, many practitioners offer online sessions that you can attend from the comfort of your own space." },
    ],
    ctaHeading: `Begin Your ${displayName} Journey`,
    ctaDescription: `Connect with ${displayName.toLowerCase()} practitioners and discover services tailored to your wellness goals.`,
  }
}
