"""
Management command to debug user favorites and messaging eligibility
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from users.models import User, UserFavoritePractitioner
from practitioners.models import Practitioner
from bookings.models import Booking


class Command(BaseCommand):
    help = 'Debug user favorites and messaging eligibility'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            default='dan+estuarytest01@gmail.com',
            help='Email of the user to check'
        )
        parser.add_argument(
            '--practitioner-name',
            type=str,
            default='Mike Wilson LMT',
            help='Display name of the practitioner'
        )

    def handle(self, *args, **options):
        user_email = options['user_email']
        practitioner_name = options['practitioner_name']

        self.stdout.write(self.style.SUCCESS(f"\n{'='*60}"))
        self.stdout.write(self.style.SUCCESS(f"Debugging Favorites and Messaging Eligibility"))
        self.stdout.write(self.style.SUCCESS(f"{'='*60}"))

        # Find user
        try:
            user = User.objects.get(email=user_email)
            self.stdout.write(self.style.SUCCESS(f"\n✓ Found user: {user.email} (ID: {user.id})"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"\n✗ User not found: {user_email}"))
            return

        # Find practitioner
        practitioner = None
        
        # Try exact match first
        practitioner = Practitioner.objects.filter(display_name=practitioner_name).first()
        
        if practitioner:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Found practitioner by exact display_name: {practitioner.display_name} (ID: {practitioner.id})"))
        else:
            # Try partial match
            practitioners = Practitioner.objects.filter(display_name__icontains=practitioner_name.split()[0])
            if practitioners.exists():
                self.stdout.write(f"\nFound {practitioners.count()} practitioners with partial match:")
                for p in practitioners:
                    self.stdout.write(f"  - ID: {p.id}, Display: '{p.display_name}', User: {p.user.email}")
                    if p.display_name and practitioner_name.lower() in p.display_name.lower():
                        practitioner = p
                        self.stdout.write(self.style.SUCCESS(f"    ^ Selected this one as best match"))

        if not practitioner:
            self.stdout.write(self.style.ERROR(f"\n✗ Practitioner '{practitioner_name}' not found"))
            
            # List all practitioners for debugging
            self.stdout.write(f"\nAll practitioners:")
            for p in Practitioner.objects.all()[:20]:
                self.stdout.write(f"  - ID: {p.id}, Display: '{p.display_name or 'None'}', User: {p.user.email}")
            return

        # Check if user favorited this practitioner
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.WARNING("Checking Favorite Relationship"))
        self.stdout.write(f"{'='*60}")
        
        favorite = UserFavoritePractitioner.objects.filter(
            user=user,
            practitioner=practitioner
        ).first()
        
        if favorite:
            self.stdout.write(self.style.SUCCESS(f"\n✓ User HAS favorited this practitioner"))
            self.stdout.write(f"  - Created at: {favorite.created_at}")
            self.stdout.write(f"  - Favorite ID: {favorite.id}")
        else:
            self.stdout.write(self.style.ERROR(f"\n✗ User has NOT favorited this practitioner"))

        # List all favorites for this user
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.WARNING("All Favorites for User"))
        self.stdout.write(f"{'='*60}")
        
        favorites = UserFavoritePractitioner.objects.filter(user=user).select_related('practitioner', 'practitioner__user')
        self.stdout.write(f"\nUser has {favorites.count()} favorited practitioners:")
        for fav in favorites:
            p = fav.practitioner
            self.stdout.write(f"  - Practitioner ID: {p.id}, Display: '{p.display_name}', Created: {fav.created_at}")

        # Check messaging permissions
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.WARNING("Checking Messaging Permissions"))
        self.stdout.write(f"{'='*60}")
        
        # Check practitioner's subscription tier
        tier = 'basic'
        if hasattr(practitioner, 'current_subscription') and practitioner.current_subscription:
            tier = practitioner.current_subscription.tier.code if practitioner.current_subscription.tier else 'basic'
        
        self.stdout.write(f"\nPractitioner subscription tier: {tier}")
        
        permissions = {
            'basic': {'can_message_clients': True, 'can_message_favorites': False, 'can_message_subscribers': False},
            'professional': {'can_message_clients': True, 'can_message_favorites': True, 'can_message_subscribers': True},
            'premium': {'can_message_clients': True, 'can_message_favorites': True, 'can_message_subscribers': True}
        }.get(tier, {'can_message_clients': True, 'can_message_favorites': False, 'can_message_subscribers': False})
        
        self.stdout.write(f"Permissions: {permissions}")
        
        # Check if practitioner can message favorites
        if permissions['can_message_favorites']:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Practitioner CAN message users who favorited them"))
        else:
            self.stdout.write(self.style.ERROR(f"\n✗ Practitioner CANNOT message users who favorited them (needs Professional or Premium tier)"))

        # Check client relationship
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.WARNING("Checking Client Relationship"))
        self.stdout.write(f"{'='*60}")
        
        bookings = Booking.objects.filter(
            practitioner=practitioner,
            user=user,
            status__in=['confirmed', 'completed']
        )
        
        if bookings.exists():
            self.stdout.write(self.style.SUCCESS(f"\n✓ User IS a client (has {bookings.count()} bookings)"))
            for booking in bookings[:5]:
                self.stdout.write(f"  - Booking ID: {booking.id}, Status: {booking.status}, Date: {booking.start_time}")
        else:
            self.stdout.write(f"\n✗ User is NOT a client (no confirmed/completed bookings)")

        # Summary
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.WARNING("SUMMARY"))
        self.stdout.write(f"{'='*60}")
        
        can_message = False
        reasons = []
        
        if permissions['can_message_clients'] and bookings.exists():
            can_message = True
            reasons.append("client")
        
        if permissions['can_message_favorites'] and favorite:
            can_message = True
            reasons.append("favorite")
        
        if can_message:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Practitioner CAN message this user"))
            self.stdout.write(f"  Reasons: {', '.join(reasons)}")
        else:
            self.stdout.write(self.style.ERROR(f"\n✗ Practitioner CANNOT message this user"))
            if favorite and not permissions['can_message_favorites']:
                self.stdout.write(self.style.WARNING(f"  Note: User has favorited practitioner, but practitioner needs Professional/Premium tier to message favorites"))
            if not bookings.exists():
                self.stdout.write(f"  Note: User has no confirmed/completed bookings with practitioner")

        # Debug the actual query
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.WARNING("Debug Query Execution"))
        self.stdout.write(f"{'='*60}")
        
        # Simulate the get_eligible_users query
        eligible_users = set()
        
        # Check clients
        if permissions['can_message_clients']:
            client_bookings = Booking.objects.filter(
                practitioner=practitioner,
                status__in=['confirmed', 'completed']
            ).select_related('user').distinct()
            
            self.stdout.write(f"\nClient bookings query returned {client_bookings.count()} results")
            for booking in client_bookings[:5]:
                eligible_users.add(booking.user)
                self.stdout.write(f"  - Added client: {booking.user.email}")
        
        # Check favorites
        if permissions['can_message_favorites']:
            try:
                favorites_query = UserFavoritePractitioner.objects.filter(
                    practitioner=practitioner
                ).select_related('user')
                
                self.stdout.write(f"\nFavorites query returned {favorites_query.count()} results")
                for fav in favorites_query[:5]:
                    eligible_users.add(fav.user)
                    self.stdout.write(f"  - Added favorite: {fav.user.email}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"\nError querying favorites: {e}"))
        
        self.stdout.write(f"\n\nTotal eligible users: {len(eligible_users)}")
        if user in eligible_users:
            self.stdout.write(self.style.SUCCESS(f"✓ Target user {user.email} IS in eligible users list"))
        else:
            self.stdout.write(self.style.ERROR(f"✗ Target user {user.email} is NOT in eligible users list"))