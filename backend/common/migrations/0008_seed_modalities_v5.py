"""
Data migration: Update modality taxonomy to v5.

Changes from v4 (0005_seed_modalities):
  - 16 categories (was 13) — 5 new, 2 renamed/reorganized
  - 148 modalities (was 113) — 41 new, 6 renamed/reclassified
  - Additive: existing modalities are NOT deleted (practitioners may have linked them)
  - Category updates: renames, new categories, modalities moved between categories

Summary of category changes:
  NEW:      symbolic, shamanism, hypno, movement, natural-medicine
  RENAMED:  shamanic → shamanism (slug stays, name updates)
            holistic → natural-medicine (slug changes, modalities move)
  KEPT:     divination, psychic, dreamwork, energy, yoga, breathwork,
            somatic, bodywork, mindbody, expressive, coaching

Summary of modality changes:
  ADDED:    41 new modalities (mostly yoga styles, breathwork types,
            shamanic practices, natural medicine, somatic/bodywork)
  RENAMED:  "Yoga" → "Yoga (general)", "Breathwork" → "Breathwork (general)",
            "Nadi Shodhana" → "Nadi Shodhana (Alternate Nostril)",
            "Writing as Healing / Journaling" → "Writing as Healing",
            "Coherent Breathing" → "Coherent / Resonance Breathing",
            "Plant Medicine" → moved under shamanism
  MOVED:    Several modalities reassigned to new/different categories
"""
from django.db import migrations
from django.utils.text import slugify


# ─── Category definitions (v5) ───────────────────────────────────────────────

CATEGORIES_V5 = [
    {"slug": "symbolic", "name": "Symbolic Systems & Soul Mapping", "short_description": "Ancient wisdom traditions using symbolic frameworks to illuminate life patterns, personality dynamics, and personal guidance.", "color": "#3C3489", "order": 1},
    {"slug": "divination", "name": "Divination & Oracular Arts", "short_description": "Intuitive divination practices using cards, readings, and oracular tools for guidance and insight.", "color": "#6B2D7B", "order": 2},
    {"slug": "psychic", "name": "Psychic & Spiritual Arts", "short_description": "Intuitive practices that access non-ordinary channels of information for healing, guidance, and spiritual growth.", "color": "#72243E", "order": 3},
    {"slug": "dreamwork", "name": "Dreamwork", "short_description": "Practices that work with dream content, trance, and altered states of consciousness for insight and transformation.", "color": "#0C447C", "order": 4},
    {"slug": "hypno", "name": "Hypnotherapy & Inner Journeying", "short_description": "Guided trance and visualization practices for accessing the subconscious mind and facilitating deep healing.", "color": "#4A3080", "order": 5},
    {"slug": "energy", "name": "Energy & Vibrational Healing", "short_description": "Modalities that work with the body's subtle energy systems to promote balance, healing, and well-being.", "color": "#085041", "order": 6},
    {"slug": "shamanism", "name": "Shamanism", "short_description": "Earth-based spiritual practices rooted in indigenous wisdom traditions, working with nature and ceremony for healing.", "color": "#633806", "order": 7},
    {"slug": "natural-medicine", "name": "Natural Medicine & Healing Traditions", "short_description": "Comprehensive health systems using natural methods, herbs, and traditional healing wisdom.", "color": "#2D5016", "order": 8},
    {"slug": "yoga", "name": "Yoga", "short_description": "A diverse family of mind-body practices originating from ancient India, integrating postures, breathwork, and meditation.", "color": "#27500A", "order": 9},
    {"slug": "breathwork", "name": "Breathwork", "short_description": "Intentional breathing techniques ranging from gentle regulation to powerful transformational practices.", "color": "#0C447C", "order": 10},
    {"slug": "somatic", "name": "Somatic Healing", "short_description": "Body-centered approaches that process trauma and restore nervous system regulation through felt-sense awareness.", "color": "#704214", "order": 11},
    {"slug": "movement", "name": "Movement Arts", "short_description": "Mindful movement practices that integrate body awareness, alignment, and therapeutic motion for healing.", "color": "#3D6B1E", "order": 12},
    {"slug": "bodywork", "name": "Bodywork & Touch", "short_description": "Hands-on therapies that address physical tension, pain, and energy blockages through skilled touch.", "color": "#8B4513", "order": 13},
    {"slug": "mindbody", "name": "Mind-Body Practices", "short_description": "Practices that harness the connection between mental and physical well-being for stress reduction and healing.", "color": "#355E3B", "order": 14},
    {"slug": "expressive", "name": "Expressive & Creative Arts", "short_description": "Creative modalities that use art, music, and movement as pathways to emotional expression and healing.", "color": "#8B2252", "order": 15},
    {"slug": "coaching", "name": "Coaching & Guidance", "short_description": "Professional guidance practices that support personal growth, life transitions, and spiritual development.", "color": "#3C3489", "order": 16},
]


# ─── Modality definitions (v5) ───────────────────────────────────────────────
# Format: (name, category_slug, order)

MODALITIES_V5 = [
    # Symbolic Systems & Soul Mapping
    ("Astrology", "symbolic", 0),
    ("Astrocartography", "symbolic", 1),
    ("Kabbalistic Astrology", "symbolic", 2),
    ("Mayan Astrology", "symbolic", 3),
    ("Human Design", "symbolic", 4),
    ("Gene Keys", "symbolic", 5),
    ("Numerology", "symbolic", 6),
    ("Enneagram", "symbolic", 7),
    ("Soul Plan Reading", "symbolic", 8),
    # Divination & Oracular Arts
    ("Tarot", "divination", 9),
    ("Oracle Cards", "divination", 10),
    ("Aura Reading", "divination", 11),
    ("Clairvoyance", "divination", 12),
    ("Clairsentience", "divination", 13),
    ("Clairaudience", "divination", 14),
    ("Claircognizance", "divination", 15),
    ("Psychic Reading", "divination", 16),
    ("Mediumship", "divination", 17),
    ("Akashic Records Reading", "divination", 18),
    ("Palmistry / Hand Reading", "divination", 19),
    ("Channeling", "divination", 20),
    # Psychic & Spiritual Arts
    ("Psychic Healing", "psychic", 21),
    ("Empathic Healing", "psychic", 22),
    ("Cord Cutting", "psychic", 23),
    ("Ancestor Work", "psychic", 24),
    ("Spiritual Direction", "psychic", 25),
    # Dreamwork
    ("Dreamwork", "dreamwork", 26),
    ("Lucid Dreaming", "dreamwork", 27),
    ("Dream Yoga", "dreamwork", 28),
    ("Dream Interpretation", "dreamwork", 29),
    # Hypnotherapy & Inner Journeying
    ("Hypnotherapy", "hypno", 30),
    ("Guided Imagery / Visualization", "hypno", 31),
    ("Past Life Regression Therapy", "hypno", 32),
    ("Regression Therapy", "hypno", 33),
    # Energy & Vibrational Healing
    ("Reiki", "energy", 34),
    ("Energy Healing", "energy", 35),
    ("Bioenergetic Healing", "energy", 36),
    ("Distance Energy Work", "energy", 37),
    ("Quantum Healing", "energy", 38),
    ("Chakra Balancing", "energy", 39),
    ("Energy Clearing", "energy", 40),
    ("Crystal Healing", "energy", 41),
    ("Sound Healing", "energy", 42),
    ("Color Therapy", "energy", 43),
    ("Pranic Healing", "energy", 44),
    ("Healing Touch", "energy", 45),
    ("Jin Shin Jyutsu", "energy", 46),
    ("Matrix Reimprinting", "energy", 47),
    # Shamanism
    ("Shamanic Healing", "shamanism", 48),
    ("Shamanic Journeying", "shamanism", 49),
    ("Soul Retrieval", "shamanism", 50),
    ("Power Animal Retrieval", "shamanism", 51),
    ("Extraction Healing", "shamanism", 52),
    ("Ancestral Healing", "shamanism", 53),
    ("Psychopomp Work", "shamanism", 54),
    ("Core Shamanism", "shamanism", 55),
    ("Shamanic Breathwork", "shamanism", 56),
    # Natural Medicine & Healing Traditions
    ("Naturopathy", "natural-medicine", 57),
    ("Homeopathy", "natural-medicine", 58),
    ("Ayurveda", "natural-medicine", 59),
    ("Aromatherapy", "natural-medicine", 60),
    ("Traditional Chinese Medicine (TCM)", "natural-medicine", 61),
    ("Functional Nutrition", "natural-medicine", 62),
    ("Nutritional Counseling", "natural-medicine", 63),
    ("Herbalism", "natural-medicine", 64),
    ("Herbal Medicine", "natural-medicine", 65),
    ("Flower Essences", "natural-medicine", 66),
    ("Flower Remedies", "natural-medicine", 67),
    ("Bach Flower Therapy", "natural-medicine", 68),
    ("Tinctures & Tonics", "natural-medicine", 69),
    ("Medicinal Mushrooms", "natural-medicine", 70),
    ("Adaptogens", "natural-medicine", 71),
    ("Plant Spirit Medicine", "natural-medicine", 72),
    ("Wildcrafting", "natural-medicine", 73),
    # Yoga
    ("Yoga (general)", "yoga", 74),
    ("Hatha Yoga", "yoga", 75),
    ("Vinyasa Yoga", "yoga", 76),
    ("Ashtanga Yoga", "yoga", 77),
    ("Kundalini Yoga", "yoga", 78),
    ("Yin Yoga", "yoga", 79),
    ("Restorative Yoga", "yoga", 80),
    ("Iyengar Yoga", "yoga", 81),
    ("Power Yoga", "yoga", 82),
    ("Hot Yoga", "yoga", 83),
    ("Yoga Nidra", "yoga", 84),
    ("Prenatal Yoga", "yoga", 85),
    ("Trauma-Informed Yoga", "yoga", 86),
    ("Yoga Therapy", "yoga", 87),
    ("Somatic Yoga", "yoga", 88),
    ("Anusara Yoga", "yoga", 89),
    ("Aerial Yoga", "yoga", 90),
    # Breathwork
    ("Breathwork (general)", "breathwork", 91),
    ("Holotropic Breathwork", "breathwork", 92),
    ("Rebirthing Breathwork", "breathwork", 93),
    ("Transformational Breathwork", "breathwork", 94),
    ("Conscious Connected Breathwork", "breathwork", 95),
    ("Neurodynamic Breathwork", "breathwork", 96),
    ("Clarity Breathwork", "breathwork", 97),
    ("Somatic Breathwork", "breathwork", 98),
    ("Pranayama", "breathwork", 99),
    ("Kapalabhati", "breathwork", 100),
    ("Nadi Shodhana (Alternate Nostril)", "breathwork", 101),
    ("Breath of Fire", "breathwork", 102),
    ("Ujjayi Breath", "breathwork", 103),
    ("Wim Hof Method", "breathwork", 104),
    ("Buteyko Method", "breathwork", 105),
    ("Box Breathing", "breathwork", 106),
    ("4-7-8 Breathing", "breathwork", 107),
    ("Coherent / Resonance Breathing", "breathwork", 108),
    # Somatic Healing
    ("Somatic Therapy", "somatic", 109),
    ("Somatic Experiencing", "somatic", 110),
    ("Somatic Coaching", "somatic", 111),
    ("Hakomi Method", "somatic", 112),
    ("Focusing (Gendlin)", "somatic", 113),
    # Movement Arts
    ("Qigong", "movement", 114),
    ("Tai Chi", "movement", 115),
    ("Alexander Technique", "movement", 116),
    ("Dance / Movement Therapy", "movement", 117),
    ("Thai Yoga Bodywork", "movement", 118),
    ("Feldenkrais Method", "movement", 119),
    ("Pilates (Therapeutic)", "movement", 120),
    ("Continuum Movement", "movement", 121),
    # Bodywork & Touch
    ("Massage Therapy", "bodywork", 122),
    ("Craniosacral Therapy", "bodywork", 123),
    ("Reflexology", "bodywork", 124),
    ("Acupressure", "bodywork", 125),
    ("Acupuncture", "bodywork", 126),
    # Mind-Body Practices
    ("Meditation", "mindbody", 127),
    ("Mindfulness", "mindbody", 128),
    ("Tapping / EFT", "mindbody", 129),
    ("Transcendental Meditation", "mindbody", 130),
    ("MBSR (Mindfulness-Based Stress Reduction)", "mindbody", 131),
    ("Loving-Kindness Meditation", "mindbody", 132),
    ("Body Scan", "mindbody", 133),
    ("Progressive Muscle Relaxation", "mindbody", 134),
    ("Biofeedback", "mindbody", 135),
    ("Autogenic Training", "mindbody", 136),
    ("Gratitude Practice", "mindbody", 137),
    ("Internal Family Systems (IFS)", "mindbody", 138),
    ("Polyvagal / Nervous System Work", "mindbody", 139),
    ("Neurofeedback", "mindbody", 140),
    # Expressive & Creative Arts
    ("Art Therapy", "expressive", 141),
    ("Music Therapy", "expressive", 142),
    ("Expressive Arts Therapy", "expressive", 143),
    ("Writing as Healing", "expressive", 144),
    # Coaching & Guidance
    ("Holistic Life Coaching", "coaching", 145),
    ("Spiritual Counseling / Direction", "coaching", 146),
    ("Spiritual Mentorship", "coaching", 147),
]


# ─── Renames for existing modalities ─────────────────────────────────────────
# Old name → New name (for modalities that were renamed between v4 and v5)

RENAMES = {
    "Yoga": "Yoga (general)",
    "Breathwork": "Breathwork (general)",
    "Nadi Shodhana": "Nadi Shodhana (Alternate Nostril)",
    "Coherent Breathing": "Coherent / Resonance Breathing",
    "Writing as Healing / Journaling": "Writing as Healing",
}


# ─── Category slug changes ───────────────────────────────────────────────────
# Old slug → New slug (for categories that changed slug)

CATEGORY_SLUG_RENAMES = {
    "shamanic": "shamanism",
    # "holistic" modalities move to "natural-medicine" (handled in modality reassignment)
}


def seed_v5(apps, schema_editor):
    ModalityCategory = apps.get_model('common', 'ModalityCategory')
    Modality = apps.get_model('common', 'Modality')

    # 1. Create/update categories
    cat_map = {}
    for cat_data in CATEGORIES_V5:
        cat, created = ModalityCategory.objects.update_or_create(
            slug=cat_data["slug"],
            defaults={
                "name": cat_data["name"],
                "short_description": cat_data["short_description"],
                "color": cat_data["color"],
                "order": cat_data["order"],
                "is_active": True,
            },
        )
        cat_map[cat_data["slug"]] = cat

    # Handle "shamanic" → "shamanism" rename (update existing if it exists)
    try:
        old_shamanic = ModalityCategory.objects.get(slug="shamanic")
        # Move any modalities from old category to new
        Modality.objects.filter(category_ref=old_shamanic).update(
            category_ref=cat_map.get("shamanism"),
            category="shamanism",
        )
        # Deactivate old category if it's different from the new one
        if old_shamanic.id != cat_map.get("shamanism", old_shamanic).id:
            old_shamanic.is_active = False
            old_shamanic.save(update_fields=["is_active"])
    except ModalityCategory.DoesNotExist:
        pass

    # Handle "holistic" → "natural-medicine" (move modalities)
    try:
        old_holistic = ModalityCategory.objects.get(slug="holistic")
        Modality.objects.filter(category_ref=old_holistic).update(
            category_ref=cat_map.get("natural-medicine"),
            category="natural-medicine",
        )
        old_holistic.is_active = False
        old_holistic.save(update_fields=["is_active"])
    except ModalityCategory.DoesNotExist:
        pass

    # 2. Rename existing modalities
    for old_name, new_name in RENAMES.items():
        Modality.objects.filter(name=old_name).update(
            name=new_name,
            slug=slugify(new_name),
        )

    # 3. Create/update modalities
    for name, cat_slug, order in MODALITIES_V5:
        mod_slug = slugify(name)
        category = cat_map.get(cat_slug)

        mod, created = Modality.objects.update_or_create(
            slug=mod_slug,
            defaults={
                "name": name,
                "category": cat_slug,
                "category_ref": category,
                "order": order,
                "is_active": True,
            },
        )

    # 4. Handle "Plant Medicine" → keep but move to shamanism
    try:
        plant_med = Modality.objects.get(slug="plant-medicine")
        plant_med.category = "shamanism"
        plant_med.category_ref = cat_map.get("shamanism")
        plant_med.save(update_fields=["category", "category_ref"])
    except Modality.DoesNotExist:
        pass


def reverse_v5(apps, schema_editor):
    # Reversing is complex — just note that this migration ran
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0007_initial'),
    ]

    operations = [
        migrations.RunPython(seed_v5, reverse_v5),
    ]
