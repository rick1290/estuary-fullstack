// Mock data for demonstration purposes
export const mockPractitionerData = {
  testimonials: [
    {
      id: "1",
      content: "Working with this practitioner changed my life. Their approach is both professional and compassionate.",
      author: "Sarah Johnson",
      rating: 5,
      date: "2023-10-15",
    },
    {
      id: "2",
      content: "Incredible experience! I've learned so much about myself through our sessions.",
      author: "Michael Chen",
      rating: 5,
      date: "2023-11-02",
    },
    {
      id: "3",
      content: "Very knowledgeable and patient. Helped me work through some difficult challenges.",
      author: "Priya Patel",
      rating: 4,
      date: "2023-09-28",
    },
  ],
  faqs: [
    {
      id: "faq1",
      question: "What should I expect in my first session?",
      answer:
        "In your first session, we'll spend time getting to know each other and discussing your goals. I'll explain my approach and we'll create a plan together for future sessions. It's a relaxed, conversational environment where you can ask questions and share as much as you're comfortable with.",
    },
    {
      id: "faq2",
      question: "How often should we meet?",
      answer:
        "The frequency of our sessions depends on your specific needs and goals. Some clients benefit from weekly sessions, while others prefer bi-weekly or monthly meetings. We'll discuss what works best for you during our initial consultation and adjust as needed.",
    },
    {
      id: "faq3",
      question: "Do you offer virtual sessions?",
      answer:
        "Yes, I offer both in-person and virtual sessions. Virtual sessions are conducted through a secure, HIPAA-compliant platform that's easy to use. Many clients find virtual sessions just as effective as in-person meetings, with the added convenience of not having to travel.",
    },
  ],
  philosophy:
    "I believe in a holistic approach that addresses the mind, body, and spirit. My practice is founded on the principle that each person has innate wisdom and healing capabilities. My role is to create a safe, supportive environment where you can explore challenges, discover insights, and develop practical strategies for growth and transformation. I combine evidence-based techniques with compassionate presence to meet you where you are and help you move toward where you want to be.",
}

// Mock service data
export const mockServiceData = {
  services_by_type: [
    {
      service_type: { id: "1", name: "course" },
      services: [
        {
          id: "c1",
          name: "Mindfulness Meditation Course",
          description:
            "A comprehensive 8-week course teaching the fundamentals of mindfulness meditation practice for daily life.",
          price: "$299",
          duration: 90,
          location_type: "online",
          image_url: "/serene-meditation-space.png",
          service_type: { id: "1", name: "course" },
        },
        {
          id: "c2",
          name: "Advanced Breathwork Techniques",
          description:
            "Explore advanced breathwork methods to enhance your meditation practice and improve overall wellbeing.",
          price: "$249",
          duration: 75,
          location_type: "hybrid",
          image_url: "/mindful-breathing.png",
          service_type: { id: "1", name: "course" },
        },
      ],
    },
    {
      service_type: { id: "2", name: "workshop" },
      services: [
        {
          id: "w1",
          name: "Weekend Wellness Retreat",
          description:
            "A transformative weekend workshop focused on holistic wellness practices and self-care techniques.",
          price: "$399",
          duration: 480,
          location_type: "in-person",
          image_url: "/serene-mountain-escape.png",
          service_type: { id: "2", name: "workshop" },
        },
        {
          id: "w2",
          name: "Stress Management Workshop",
          description: "Learn practical tools and techniques to manage stress and anxiety in your daily life.",
          price: "$149",
          duration: 180,
          location_type: "online",
          image_url: "/balanced-life.png",
          service_type: { id: "2", name: "workshop" },
        },
      ],
    },
    {
      service_type: { id: "3", name: "session" },
      services: [
        {
          id: "s1",
          name: "Personal Mindfulness Coaching",
          description:
            "One-on-one coaching sessions tailored to your specific needs and goals for mindfulness practice.",
          price: "$120",
          duration: 60,
          location_type: "online",
          image_url: "/mindful-moment.png",
          service_type: { id: "3", name: "session" },
          category: { id: "cat1", name: "Mindfulness" },
        },
        {
          id: "s2",
          name: "Stress Reduction Therapy",
          description:
            "Individual therapy sessions focused on reducing stress and anxiety through evidence-based techniques.",
          price: "$150",
          duration: 50,
          location_type: "hybrid",
          image_url: "/calming-hands.png",
          service_type: { id: "3", name: "session" },
          category: { id: "cat2", name: "Therapy" },
        },
        {
          id: "s3",
          name: "Life Coaching Session",
          description:
            "Personalized coaching to help you clarify goals, overcome obstacles, and create positive change.",
          price: "$135",
          duration: 60,
          location_type: "in-person",
          image_url: "/guiding-path.png",
          service_type: { id: "3", name: "session" },
          category: { id: "cat3", name: "Coaching" },
        },
        {
          id: "s4",
          name: "Meditation Guidance",
          description:
            "Personalized guidance to establish or deepen your meditation practice with techniques suited to your needs.",
          price: "$95",
          duration: 45,
          location_type: "online",
          image_url: "/serene-meditation-space.png",
          service_type: { id: "3", name: "session" },
          category: { id: "cat1", name: "Mindfulness" },
        },
      ],
    },
  ],
  service_categories: [
    { id: "cat1", name: "Mindfulness" },
    { id: "cat2", name: "Therapy" },
    { id: "cat3", name: "Coaching" },
    { id: "cat4", name: "Wellness" },
  ],
}
