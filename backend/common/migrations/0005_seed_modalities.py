"""
Data migration: Seed 13 ModalityCategory records and ~113 Modality records
with full taxonomy content.
"""
from django.db import migrations
from django.utils.text import slugify


# ─── Categories ───────────────────────────────────────────────────────────────

CATEGORIES = [
    {
        "name": "Divination & Symbolic Systems",
        "slug": "divination",
        "short_description": "Ancient wisdom traditions using symbolic frameworks to illuminate life patterns, personality dynamics, and personal guidance.",
        "color": "#3C3489",
        "order": 1,
    },
    {
        "name": "Psychic & Spiritual Arts",
        "slug": "psychic",
        "short_description": "Intuitive practices that access non-ordinary channels of information for healing, guidance, and spiritual growth.",
        "color": "#72243E",
        "order": 2,
    },
    {
        "name": "Dreamwork & Altered States",
        "slug": "dreamwork",
        "short_description": "Practices that work with dream content, trance, and altered states of consciousness for insight and transformation.",
        "color": "#0C447C",
        "order": 3,
    },
    {
        "name": "Energy & Vibrational Healing",
        "slug": "energy",
        "short_description": "Modalities that work with the body's subtle energy systems to promote balance, healing, and well-being.",
        "color": "#085041",
        "order": 4,
    },
    {
        "name": "Shamanic & Plant Medicine",
        "slug": "shamanic",
        "short_description": "Earth-based spiritual practices rooted in indigenous wisdom traditions, working with nature and ceremony for healing.",
        "color": "#633806",
        "order": 5,
    },
    {
        "name": "Yoga",
        "slug": "yoga",
        "short_description": "A diverse family of mind-body practices originating from ancient India, integrating postures, breathwork, and meditation.",
        "color": "#27500A",
        "order": 6,
    },
    {
        "name": "Breathwork",
        "slug": "breathwork",
        "short_description": "Intentional breathing techniques ranging from gentle regulation to powerful transformational practices.",
        "color": "#0C447C",
        "order": 7,
    },
    {
        "name": "Somatic & Movement",
        "slug": "somatic",
        "short_description": "Body-centered practices that use movement, awareness, and gentle techniques to release tension and restore balance.",
        "color": "#712B13",
        "order": 8,
    },
    {
        "name": "Bodywork & Touch",
        "slug": "bodywork",
        "short_description": "Hands-on therapeutic practices that address physical tension, pain, and energetic blockages through skilled touch.",
        "color": "#791F1F",
        "order": 9,
    },
    {
        "name": "Mind-Body Practices",
        "slug": "mindbody",
        "short_description": "Integrative practices that harness the connection between mind and body for emotional regulation and healing.",
        "color": "#0C447C",
        "order": 10,
    },
    {
        "name": "Expressive & Creative Arts",
        "slug": "expressive",
        "short_description": "Therapeutic approaches that use art, music, movement, and creative expression as vehicles for healing and self-discovery.",
        "color": "#444441",
        "order": 11,
    },
    {
        "name": "Holistic Health Systems",
        "slug": "holistic",
        "short_description": "Comprehensive health systems that take a whole-person approach, addressing root causes through natural methods.",
        "color": "#085041",
        "order": 12,
    },
    {
        "name": "Coaching & Guidance",
        "slug": "coaching",
        "short_description": "Professional guidance practices that support personal growth, life transitions, and spiritual development.",
        "color": "#3C3489",
        "order": 13,
    },
]


# ─── Modalities ───────────────────────────────────────────────────────────────
# Format: (name, category_slug, cluster, gray_zone, short_description)

MODALITIES = [
    # ── Divination & Symbolic Systems ──
    ("Astrology", "divination", None, False,
     "The study of celestial body positions and their influence on human affairs, offering insight into personality, life cycles, and timing."),
    ("Astrocartography", "divination", None, False,
     "A branch of astrology mapping planetary lines across the globe to reveal how different locations affect your life experience."),
    ("Kabbalistic Astrology", "divination", None, False,
     "An integration of astrological wisdom with the mystical tradition of Kabbalah, exploring soul purpose and spiritual growth."),
    ("Mayan Astrology", "divination", None, False,
     "An ancient Mesoamerican system based on the Tzolkin calendar, revealing personal energy signatures and life purpose."),
    ("Tarot", "divination", None, False,
     "A symbolic card-based system used for reflection, guidance, and accessing intuitive wisdom about life situations."),
    ("Oracle Cards", "divination", None, False,
     "Intuitive card decks with diverse themes used for inspiration, reflection, and accessing inner guidance."),
    ("Numerology", "divination", None, False,
     "The study of numbers and their vibrational significance, revealing patterns in personality, life path, and timing."),
    ("Enneagram", "divination", None, False,
     "A dynamic personality typology system mapping nine interconnected types, revealing core motivations and growth paths."),
    ("Gene Keys", "divination", None, False,
     "A synthesis of the I Ching, astrology, and human genetics revealing your unique genius and life purpose."),
    ("Human Design", "divination", None, False,
     "A modern synthesis of astrology, I Ching, Kabbalah, and the chakra system providing a unique blueprint for decision-making."),
    ("Soul Plan Reading", "divination", None, False,
     "A system based on the numerology of your birth name, revealing your soul's intentions and life challenges."),
    ("Aura Reading", "divination", None, False,
     "The intuitive perception and interpretation of the electromagnetic energy field surrounding the body."),
    ("Clairvoyance", "divination", None, False,
     "The intuitive ability to perceive information beyond the ordinary senses, often through visual imagery and inner sight."),

    # ── Psychic & Spiritual Arts ──
    ("Mediumship", "psychic", None, False,
     "The practice of communicating with spirits of the deceased, providing messages and evidence of continued existence."),
    ("Akashic Records Reading", "psychic", None, False,
     "Accessing the energetic library of every soul's journey, offering insight into past lives, present patterns, and future possibilities."),
    ("Psychic Reading", "psychic", None, False,
     "Intuitive consultation using extrasensory perception to provide guidance on life questions and situations."),
    ("Psychic Healing", "psychic", None, False,
     "Energy-based healing facilitated through psychic perception, addressing imbalances in the mind, body, and spirit."),
    ("Past Life Regression Therapy", "psychic", None, False,
     "A therapeutic technique using guided hypnosis to access memories from past lives for healing current-life patterns."),
    ("Channeling", "psychic", None, False,
     "The practice of receiving and transmitting messages from non-physical beings, higher consciousness, or spiritual guides."),
    ("Ancestor Work", "psychic", None, False,
     "Spiritual practices that honor, heal, and strengthen the connection with ancestral lineages for personal and collective healing."),
    ("Cord Cutting", "psychic", None, False,
     "An energetic practice of releasing unhealthy attachments and energetic connections with people, places, or situations."),
    ("Spiritual Direction", "psychic", None, False,
     "A contemplative practice of accompanying others in deepening their relationship with the sacred and their spiritual life."),

    # ── Dreamwork & Altered States ──
    ("Dreamwork", "dreamwork", None, False,
     "The practice of exploring dream content for psychological insight, creative inspiration, and personal transformation."),
    ("Lucid Dreaming", "dreamwork", None, False,
     "The practice of becoming consciously aware within dreams, enabling intentional exploration and transformation."),
    ("Dream Yoga", "dreamwork", None, False,
     "A Tibetan Buddhist practice of maintaining awareness during sleep and dreams for spiritual development."),
    ("Hypnotherapy", "dreamwork", None, False,
     "A therapeutic technique using guided relaxation and focused attention to access the subconscious mind for positive change."),
    ("Guided Imagery / Visualization", "dreamwork", None, False,
     "A mind-body technique using directed mental imagery to promote relaxation, healing, and personal transformation."),

    # ── Energy & Vibrational Healing ──
    ("Reiki", "energy", None, False,
     "A Japanese energy healing technique using gentle hand placements to channel universal life force energy for balance and healing."),
    ("Energy Healing", "energy", None, False,
     "A broad category of practices working with the body's subtle energy systems to promote physical, emotional, and spiritual well-being."),
    ("Bioenergetic Healing", "energy", None, False,
     "A body-oriented approach combining physical exercises and energy work to release chronic tension and restore vitality."),
    ("Distance Energy Work", "energy", None, False,
     "Energy healing practices performed remotely, working with the principle that energy is not limited by physical proximity."),
    ("Quantum Healing", "energy", None, False,
     "An approach to healing that draws on quantum physics principles, working with consciousness and energy at the subatomic level."),
    ("Chakra Balancing", "energy", None, False,
     "The practice of assessing and harmonizing the body's seven major energy centers for optimal physical and emotional health."),
    ("Energy Clearing", "energy", None, False,
     "Techniques for removing stagnant or negative energy from the body, spaces, or objects to restore positive flow."),
    ("Crystal Healing", "energy", None, False,
     "The use of crystals and gemstones placed on or around the body to facilitate energy balance and healing."),
    ("Sound Healing", "energy", "vibrational", False,
     "The therapeutic use of sound frequencies from instruments like singing bowls, gongs, and tuning forks for deep healing."),
    ("Color Therapy", "energy", "vibrational", False,
     "The use of colors and light frequencies to influence mood, energy, and well-being through the body's response to the visible spectrum."),
    ("Pranic Healing", "energy", None, False,
     "A no-touch energy healing system that works with the body's prana (life force) to accelerate the body's natural healing ability."),
    ("Healing Touch", "energy", None, False,
     "A biofield therapy using gentle touch to influence the human energy system, supporting physical and emotional healing."),
    ("Jin Shin Jyutsu", "energy", None, False,
     "An ancient Japanese art of harmonizing the body's energy by holding specific points on the body in sequence."),
    ("Matrix Reimprinting", "energy", None, False,
     "A technique combining EFT tapping with memory reimprinting to transform the energetic charge of traumatic memories."),

    # ── Shamanic & Plant Medicine ──
    ("Shamanic Journeying", "shamanic", None, False,
     "A meditative practice using rhythmic drumming to enter altered states for accessing guidance from the spirit world."),
    ("Shamanic Healing", "shamanic", None, False,
     "Traditional healing practices rooted in indigenous wisdom, addressing spiritual causes of physical and emotional imbalance."),
    ("Plant Medicine", "shamanic", None, False,
     "Sacred ceremonial use of plant allies for healing, vision, and spiritual growth within traditional frameworks."),
    ("Herbalism", "shamanic", None, False,
     "The practice of using plants and plant extracts for medicinal purposes, drawing on traditional knowledge and modern research."),

    # ── Yoga ──
    ("Yoga", "yoga", "general", False,
     "An ancient mind-body practice integrating physical postures, breathwork, and meditation for holistic well-being."),
    ("Hatha Yoga", "yoga", "traditional", False,
     "The foundational physical yoga practice emphasizing postures and breath control, suitable for all levels."),
    ("Vinyasa Yoga", "yoga", "flow", False,
     "A dynamic, flowing style of yoga that synchronizes breath with movement in creative sequences."),
    ("Ashtanga Yoga", "yoga", "traditional", False,
     "A rigorous, structured yoga practice following a set sequence of postures linked by breath and movement."),
    ("Kundalini Yoga", "yoga", "energetic", False,
     "A dynamic practice combining postures, breathwork, chanting, and meditation to awaken kundalini energy."),
    ("Yin Yoga", "yoga", "gentle", False,
     "A slow-paced practice holding passive postures for extended periods to target deep connective tissues."),
    ("Restorative Yoga", "yoga", "gentle", False,
     "A deeply relaxing practice using props to support the body in restful postures for complete release."),
    ("Iyengar Yoga", "yoga", "traditional", False,
     "A precision-focused practice using props and detailed alignment instructions for therapeutic benefit."),
    ("Power Yoga", "yoga", "athletic", False,
     "A vigorous, fitness-based approach to vinyasa yoga emphasizing strength and flexibility."),
    ("Hot Yoga", "yoga", "athletic", False,
     "Yoga practiced in a heated room to promote flexibility, detoxification, and cardiovascular challenge."),
    ("Yoga Nidra", "yoga", "gentle", False,
     "A guided meditation practice known as 'yogic sleep' that induces deep relaxation while maintaining awareness."),
    ("Prenatal Yoga", "yoga", "specialized", False,
     "Yoga specifically adapted for pregnancy, supporting physical comfort, emotional balance, and birth preparation."),
    ("Trauma-Informed Yoga", "yoga", "specialized", False,
     "Yoga adapted with trauma-sensitive principles, emphasizing choice, safety, and empowerment for healing."),
    ("Yoga Therapy", "yoga", "specialized", False,
     "The therapeutic application of yoga practices tailored to specific health conditions and individual needs."),
    ("Somatic Yoga", "yoga", "specialized", False,
     "A slow, mindful approach to yoga combining somatic awareness techniques with traditional postures."),
    ("Anusara Yoga", "yoga", "flow", False,
     "A heart-centered style of yoga combining precise alignment principles with a celebratory philosophy of intrinsic goodness."),
    ("Aerial Yoga", "yoga", "athletic", False,
     "A creative practice using fabric hammocks suspended from the ceiling for supported inversions and flowing sequences."),

    # ── Breathwork ──
    ("Breathwork", "breathwork", "general", False,
     "Intentional breathing practices used for stress relief, emotional release, and expanded states of awareness."),
    ("Holotropic Breathwork", "breathwork", "conscious_connected", False,
     "A powerful practice using accelerated breathing and evocative music to access non-ordinary states of consciousness for deep healing."),
    ("Rebirthing Breathwork", "breathwork", "conscious_connected", False,
     "A conscious connected breathing technique that releases stored tension and emotional patterns from the body."),
    ("Transformational Breathwork", "breathwork", "conscious_connected", False,
     "An integrative breathing practice combining conscious breathing with body mapping, sound, and movement for deep transformation."),
    ("Shamanic Breathwork", "breathwork", "conscious_connected", False,
     "A breathwork practice combining conscious connected breathing with chakra-attuned music and ceremonial elements."),
    ("Conscious Connected Breathwork", "breathwork", "conscious_connected", False,
     "A foundational technique of continuous circular breathing without pauses, used in many breathwork modalities."),
    ("Neurodynamic Breathwork", "breathwork", "conscious_connected", False,
     "A science-informed approach to connected breathwork integrating neuroscience research with traditional techniques."),
    ("Clarity Breathwork", "breathwork", "conscious_connected", False,
     "A gentle yet powerful form of conscious connected breathing focused on emotional release and mental clarity."),
    ("Somatic Breathwork", "breathwork", "conscious_connected", False,
     "A body-centered breathing practice integrating somatic awareness with breathwork for trauma resolution."),
    ("Pranayama", "breathwork", "pranayama", False,
     "The ancient yogic science of breath control, using specific techniques to direct and expand life force energy."),
    ("Kapalabhati", "breathwork", "pranayama", False,
     "A vigorous yogic breathing technique using rapid abdominal contractions for cleansing and energizing the system."),
    ("Nadi Shodhana", "breathwork", "pranayama", False,
     "Alternate nostril breathing, a balancing pranayama technique that harmonizes the left and right brain hemispheres."),
    ("Breath of Fire", "breathwork", "pranayama", False,
     "A rapid, rhythmic breathing technique from Kundalini Yoga that generates heat, energy, and mental clarity."),
    ("Ujjayi Breath", "breathwork", "pranayama", False,
     "An ocean-sounding breath created by gentle throat constriction, commonly used in yoga for focus and heat generation."),
    ("Wim Hof Method", "breathwork", "functional", False,
     "A method combining specific breathing techniques, cold exposure, and mindset training for health and performance."),
    ("Buteyko Method", "breathwork", "functional", False,
     "A breathing retraining method focused on nasal breathing and reducing breathing volume for respiratory health."),
    ("Box Breathing", "breathwork", "functional", False,
     "A simple four-part breathing technique using equal counts of inhale, hold, exhale, and hold for calm and focus."),
    ("4-7-8 Breathing", "breathwork", "functional", False,
     "A relaxation breathing pattern developed by Dr. Andrew Weil, inhaling for 4, holding for 7, exhaling for 8 counts."),
    ("Coherent Breathing", "breathwork", "functional", False,
     "A practice of breathing at approximately 5 breaths per minute to activate the body's relaxation response."),

    # ── Somatic & Movement ──
    ("Qigong", "somatic", "eastern_movement", False,
     "A Chinese practice combining gentle movement, controlled breathing, and meditation for cultivating life energy."),
    ("Tai Chi", "somatic", "eastern_movement", False,
     "A Chinese martial art practiced as a graceful form of moving meditation for health, balance, and stress reduction."),
    ("Alexander Technique", "somatic", "awareness", False,
     "A method of retraining habitual movement patterns to reduce tension and improve posture, coordination, and ease."),
    ("Somatic Therapy", "somatic", "somatic_healing", False,
     "A body-centered approach to healing that addresses the physical manifestations of stress, trauma, and emotional pain."),
    ("Somatic Experiencing", "somatic", "somatic_healing", True,
     "A body-oriented approach to resolving trauma by tracking physical sensations and completing the body's stress responses."),
    ("Somatic Coaching", "somatic", "somatic_healing", False,
     "A coaching approach integrating body awareness with personal development for embodied transformation."),
    ("Dance / Movement Therapy", "somatic", "expressive_movement", False,
     "A therapeutic approach using movement and dance as a medium for emotional, cognitive, and physical integration."),
    ("Thai Yoga Bodywork", "somatic", "eastern_movement", False,
     "An ancient healing system combining assisted yoga postures, acupressure, and energy work performed on a mat."),

    # ── Bodywork & Touch ──
    ("Massage Therapy", "bodywork", None, False,
     "The manual manipulation of soft body tissues to enhance health, reduce pain, and promote relaxation."),
    ("Craniosacral Therapy", "bodywork", None, False,
     "A gentle, hands-on approach working with the craniosacral system to release restrictions and support healing."),
    ("Reflexology", "bodywork", None, False,
     "A practice applying pressure to specific points on the feet, hands, and ears that correspond to body organs and systems."),
    ("Acupressure", "bodywork", None, False,
     "A traditional healing art applying finger pressure to specific points along the body's meridians to relieve tension."),
    ("Acupuncture", "bodywork", None, False,
     "A traditional Chinese medicine practice inserting thin needles at specific points to balance energy flow and promote healing."),

    # ── Mind-Body Practices ──
    ("Meditation", "mindbody", None, False,
     "The practice of training attention and awareness to achieve mental clarity, emotional calm, and enhanced well-being."),
    ("Mindfulness", "mindbody", None, False,
     "The practice of maintaining non-judgmental present-moment awareness of thoughts, feelings, and sensations."),
    ("Tapping / EFT", "mindbody", None, False,
     "Emotional Freedom Technique combining gentle tapping on acupressure points with focused statements to release emotional distress."),
    ("Internal Family Systems (IFS)", "mindbody", None, True,
     "A transformative, evidence-based model of psychotherapy working with internal 'parts' to heal emotional wounds and restore balance."),
    ("Polyvagal / Nervous System Work", "mindbody", None, False,
     "Practices based on polyvagal theory that regulate the autonomic nervous system for safety, connection, and resilience."),
    ("Neurofeedback", "mindbody", None, True,
     "A non-invasive technique using real-time brainwave monitoring to train the brain toward healthier patterns."),

    # ── Expressive & Creative Arts ──
    ("Art Therapy", "expressive", None, False,
     "A therapeutic practice using art-making as a medium for self-expression, emotional processing, and healing."),
    ("Music Therapy", "expressive", None, False,
     "The clinical use of musical interventions to address physical, emotional, cognitive, and social needs."),
    ("Expressive Arts Therapy", "expressive", None, False,
     "An integrative therapeutic approach using multiple art forms — visual, musical, dramatic, literary — for healing."),
    ("Writing as Healing / Journaling", "expressive", None, False,
     "The practice of using structured writing and journaling as tools for emotional processing and self-discovery."),

    # ── Holistic Health Systems ──
    ("Naturopathy", "holistic", None, False,
     "A system of medicine using natural therapies to support the body's inherent ability to heal itself."),
    ("Homeopathy", "holistic", None, False,
     "A system of alternative medicine using highly diluted substances to stimulate the body's natural healing response."),
    ("Ayurveda", "holistic", None, False,
     "An ancient Indian system of medicine emphasizing balance of body, mind, and spirit through diet, herbs, and lifestyle."),
    ("Aromatherapy", "holistic", None, False,
     "The therapeutic use of essential oils from plants to support physical, emotional, and spiritual well-being."),
    ("Traditional Chinese Medicine (TCM)", "holistic", None, False,
     "A comprehensive health system originating in China, using herbs, acupuncture, diet, and exercise to restore balance."),
    ("Functional Nutrition", "holistic", None, False,
     "An evidence-based approach to nutrition addressing the root causes of health issues through personalized dietary strategies."),
    ("Nutritional Counseling", "holistic", None, False,
     "Professional guidance on dietary choices and nutrition planning to support health goals and manage conditions."),

    # ── Coaching & Guidance ──
    ("Holistic Life Coaching", "coaching", None, False,
     "A comprehensive coaching approach addressing mind, body, and spirit to support personal growth and life fulfillment."),
    ("Spiritual Counseling / Direction", "coaching", None, False,
     "Guidance practices supporting individuals in deepening their spiritual life and navigating spiritual experiences."),
]


# ─── Related Modalities Mapping (by slug) ─────────────────────────────────────

RELATED_MODALITIES_MAP = {
    "holotropic-breathwork": [
        "shamanic-breathwork", "rebirthing-breathwork",
        "transformational-breathwork", "sound-healing",
    ],
    "reiki": [
        "energy-healing", "chakra-balancing", "pranic-healing",
        "healing-touch", "crystal-healing",
    ],
    "internal-family-systems-ifs": [
        "somatic-experiencing", "tapping-eft",
        "polyvagal-nervous-system-work", "meditation",
    ],
    # Yoga cross-links
    "yoga": ["hatha-yoga", "vinyasa-yoga", "yin-yoga", "yoga-nidra"],
    "hatha-yoga": ["iyengar-yoga", "ashtanga-yoga", "vinyasa-yoga"],
    "vinyasa-yoga": ["power-yoga", "anusara-yoga", "ashtanga-yoga"],
    "yin-yoga": ["restorative-yoga", "yoga-nidra", "somatic-yoga"],
    "kundalini-yoga": ["pranayama", "breath-of-fire", "meditation"],
    # Breathwork cross-links
    "breathwork": ["pranayama", "holotropic-breathwork", "box-breathing"],
    "pranayama": ["kapalabhati", "nadi-shodhana", "ujjayi-breath", "breath-of-fire"],
    "wim-hof-method": ["box-breathing", "coherent-breathing", "buteyko-method"],
    # Energy cross-links
    "sound-healing": ["crystal-healing", "color-therapy", "chakra-balancing"],
    "energy-healing": ["reiki", "pranic-healing", "healing-touch", "chakra-balancing"],
    # Somatic cross-links
    "somatic-experiencing": ["somatic-therapy", "polyvagal-nervous-system-work", "internal-family-systems-ifs"],
    "qigong": ["tai-chi", "pranayama", "meditation"],
    # Bodywork cross-links
    "massage-therapy": ["craniosacral-therapy", "reflexology", "acupressure"],
    "acupuncture": ["acupressure", "traditional-chinese-medicine-tcm"],
    # Mind-body cross-links
    "meditation": ["mindfulness", "yoga-nidra", "breathwork"],
    "tapping-eft": ["matrix-reimprinting", "polyvagal-nervous-system-work"],
    # Holistic cross-links
    "ayurveda": ["yoga", "pranayama", "aromatherapy"],
    "traditional-chinese-medicine-tcm": ["acupuncture", "acupressure", "qigong", "herbalism"],
}


def seed_modalities(apps, schema_editor):
    ModalityCategory = apps.get_model('common', 'ModalityCategory')
    Modality = apps.get_model('common', 'Modality')

    # 1. Create categories
    cat_map = {}  # slug -> instance
    for cat_data in CATEGORIES:
        cat, _ = ModalityCategory.objects.get_or_create(
            slug=cat_data["slug"],
            defaults={
                "name": cat_data["name"],
                "short_description": cat_data["short_description"],
                "color": cat_data["color"],
                "order": cat_data["order"],
            },
        )
        cat_map[cat_data["slug"]] = cat

    # 2. Clear existing seed modalities (only the 8 dev seeds)
    Modality.objects.all().delete()

    # 3. Create modalities
    mod_map = {}  # slug -> instance
    for i, (name, cat_slug, cluster, gray_zone, short_desc) in enumerate(MODALITIES):
        mod_slug = slugify(name)
        mod = Modality.objects.create(
            name=name,
            slug=mod_slug,
            category=cat_slug,  # legacy CharField
            category_ref=cat_map[cat_slug],
            cluster=cluster,
            short_description=short_desc,
            description=short_desc,  # populate legacy field too
            gray_zone=gray_zone,
            is_active=True,
            order=i,
        )
        mod_map[mod_slug] = mod

    # 4. Set up related_modalities M2M links
    for source_slug, related_slugs in RELATED_MODALITIES_MAP.items():
        source = mod_map.get(source_slug)
        if not source:
            continue
        for rel_slug in related_slugs:
            target = mod_map.get(rel_slug)
            if target:
                source.related_modalities.add(target)


def reverse_seed(apps, schema_editor):
    ModalityCategory = apps.get_model('common', 'ModalityCategory')
    Modality = apps.get_model('common', 'Modality')
    # Clear seeded data
    Modality.objects.all().delete()
    ModalityCategory.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0004_modality_category_and_fields'),
    ]

    operations = [
        migrations.RunPython(seed_modalities, reverse_seed),
    ]
