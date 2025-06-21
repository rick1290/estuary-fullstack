#!/usr/bin/env python
"""
Debug script to test UserFavoritePractitioner relationships
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from users.models import User, UserFavoritePractitioner
from practitioners.models import Practitioner

def debug_favorites():
    # Look for the user
    user_email = "dan+estuarytest01@gmail.com"
    practitioner_name = "Mike Wilson LMT"
    
    print(f"\n=== Debugging Favorites ===")
    print(f"Looking for user: {user_email}")
    print(f"Looking for practitioner: {practitioner_name}")
    
    try:
        # Find user
        user = User.objects.filter(email=user_email).first()
        if user:
            print(f"\n✓ Found user: {user.email} (ID: {user.id})")
        else:
            print(f"\n✗ User not found: {user_email}")
            return
        
        # Find practitioner by display_name
        print(f"\n--- Searching for practitioner by display_name ---")
        practitioners = Practitioner.objects.filter(display_name__icontains="Mike Wilson")
        print(f"Found {practitioners.count()} practitioners matching 'Mike Wilson':")
        for p in practitioners:
            print(f"  - ID: {p.id}, Display Name: '{p.display_name}', User: {p.user.email}")
        
        # Also search by user's name
        print(f"\n--- Searching for practitioner by user name ---")
        practitioners = Practitioner.objects.filter(
            user__first_name__icontains="Mike",
            user__last_name__icontains="Wilson"
        )
        print(f"Found {practitioners.count()} practitioners with user name Mike Wilson:")
        for p in practitioners:
            print(f"  - ID: {p.id}, User Name: '{p.user.first_name} {p.user.last_name}', Display Name: '{p.display_name or 'None'}'")
        
        # List all practitioners for debugging
        print(f"\n--- All practitioners ---")
        all_practitioners = Practitioner.objects.all().select_related('user')[:10]
        for p in all_practitioners:
            print(f"  - ID: {p.id}, Display: '{p.display_name or 'None'}', User: {p.user.first_name} {p.user.last_name} ({p.user.email})")
        
        # Check all favorites for this user
        print(f"\n--- User's favorites ---")
        favorites = UserFavoritePractitioner.objects.filter(user=user).select_related('practitioner', 'practitioner__user')
        print(f"User {user_email} has {favorites.count()} favorited practitioners:")
        for fav in favorites:
            p = fav.practitioner
            print(f"  - Practitioner ID: {p.id}, Display: '{p.display_name or 'None'}', User: {p.user.first_name} {p.user.last_name}")
        
        # Check if specific practitioner exists
        mike_wilson = Practitioner.objects.filter(display_name="Mike Wilson LMT").first()
        if mike_wilson:
            print(f"\n✓ Found practitioner 'Mike Wilson LMT' (ID: {mike_wilson.id})")
            
            # Check if user favorited this practitioner
            favorite = UserFavoritePractitioner.objects.filter(
                user=user,
                practitioner=mike_wilson
            ).first()
            
            if favorite:
                print(f"✓ User {user_email} HAS favorited practitioner {mike_wilson.display_name}")
                print(f"  Created at: {favorite.created_at}")
            else:
                print(f"✗ User {user_email} has NOT favorited practitioner {mike_wilson.display_name}")
        else:
            print(f"\n✗ Practitioner 'Mike Wilson LMT' not found")
            
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_favorites()