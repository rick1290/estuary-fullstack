"""
Data migration: Update modality taxonomy to v6.

Changes from v5 (0008_seed_modalities_v5):
  - Adds new "Meditation & Contemplative Practice" category (slug: meditation)
  - Splits meditation modalities out of "mindbody" into the dedicated category
  - Adds 16 new modalities (12 meditation traditions + NLP, PSYCH-K, RTT, Yoga Nidra move)
  - Renames "Meditation" → "Meditation (general)"
  - Additive: existing modalities are NOT deleted; "mindbody" category remains
    for the residual mind-body practices (Tai Chi, Qigong, etc.)

Resolves CMO feedback:
  - Onboarding ISSUE 1 + 2: Meditation missing from modalities
  - service.md #4: Meditation missing from modality dropdown
"""
from django.db import migrations
from django.utils.text import slugify


# ─── New category (v6) ───────────────────────────────────────────────────────

NEW_CATEGORY = {
    "slug": "meditation",
    "name": "Meditation & Contemplative Practice",
    "short_description": (
        "Meditation traditions and contemplative lineages from gentle mindfulness "
        "to nondual awareness. Covers seated, walking, and devotional practices."
    ),
    "color": "#4A3080",
    "order": 5,  # Sits with the inner-work cluster (after dreamwork)
}


# ─── Modalities to move from another category into "meditation" ──────────────
# These already exist in v5 — we re-home them and bump order.

MOVE_TO_MEDITATION = [
    # (current_name, new_order)
    ("Mindfulness", 1),
    ("MBSR (Mindfulness-Based Stress Reduction)", 2),
    ("Transcendental Meditation", 3),
    ("Loving-Kindness Meditation", 11),
    ("Body Scan", 16),
    ("Gratitude Practice", 18),
    ("Yoga Nidra", 17),  # Moved from yoga category per v1.7
]


# ─── Modalities to add (16 new) ──────────────────────────────────────────────
# Format: (name, category_slug, order)

NEW_MODALITIES = [
    # Meditation category
    ("Meditation (general)", "meditation", 0),
    ("Vedic Meditation", "meditation", 4),
    ("Vipassana", "meditation", 5),
    ("Insight Meditation", "meditation", 6),
    ("Zen Meditation / Zazen", "meditation", 7),
    ("Kundalini Meditation", "meditation", 8),
    ("Mantra Meditation", "meditation", 9),
    ("Japa Meditation", "meditation", 10),
    ("Metta Meditation", "meditation", 12),
    ("Nondual Meditation", "meditation", 13),
    ("Open Awareness Meditation", "meditation", 14),
    ("Contemplative Prayer", "meditation", 15),
    ("Walking Meditation", "meditation", 19),
    # Somatic category (NLP, PSYCH-K, RTT live here per v1.7)
    ("Neurolinguistic Programming (NLP)", "somatic", 148),
    ("PSYCH-K", "somatic", 149),
    ("Rapid Transformational Therapy (RTT)", "somatic", 150),
]


# ─── Renames ─────────────────────────────────────────────────────────────────

RENAMES = {
    "Meditation": "Meditation (general)",
}


def seed_v6(apps, schema_editor):
    ModalityCategory = apps.get_model('common', 'ModalityCategory')
    Modality = apps.get_model('common', 'Modality')

    # 1. Create the new "meditation" category
    meditation_cat, _ = ModalityCategory.objects.update_or_create(
        slug=NEW_CATEGORY["slug"],
        defaults={
            "name": NEW_CATEGORY["name"],
            "short_description": NEW_CATEGORY["short_description"],
            "color": NEW_CATEGORY["color"],
            "order": NEW_CATEGORY["order"],
            "is_active": True,
        },
    )

    # 2. Rename the legacy "Meditation" entry before re-homing it.
    # update_or_create on slug below would otherwise hit a unique conflict.
    for old_name, new_name in RENAMES.items():
        Modality.objects.filter(name=old_name).update(
            name=new_name,
            slug=slugify(new_name),
        )

    # 3. Move existing modalities to the new meditation category
    for current_name, new_order in MOVE_TO_MEDITATION:
        Modality.objects.filter(name=current_name).update(
            category="meditation",
            category_ref=meditation_cat,
            order=new_order,
        )

    # 4. Create/update the 16 new modalities
    for name, cat_slug, order in NEW_MODALITIES:
        category = ModalityCategory.objects.filter(slug=cat_slug).first()
        Modality.objects.update_or_create(
            slug=slugify(name),
            defaults={
                "name": name,
                "category": cat_slug,
                "category_ref": category,
                "order": order,
                "is_active": True,
            },
        )


def reverse_v6(apps, schema_editor):
    # Reversing is not safe — practitioners may have linked the new modalities.
    # Mark the new category inactive instead of deleting it.
    ModalityCategory = apps.get_model('common', 'ModalityCategory')
    ModalityCategory.objects.filter(slug="meditation").update(is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0008_seed_modalities_v5'),
    ]

    operations = [
        migrations.RunPython(seed_v6, reverse_v6),
    ]
