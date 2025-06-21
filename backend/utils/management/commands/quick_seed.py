"""
Quick seed command - adds test data without clearing existing data
Works with current model structure
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Quickly seed database with test users'

    def handle(self, *args, **options):
        self.stdout.write('🌱 Quick seeding database...')
        
        try:
            with transaction.atomic():
                # Create admin
                admin, created = User.objects.get_or_create(
                    email='admin@estuary.com',
                    defaults={
                        'first_name': 'Admin',
                        'last_name': 'User',
                        'is_staff': True,
                        'is_superuser': True,
                        'is_active': True
                    }
                )
                if created:
                    admin.set_password('admin123')
                    admin.save()
                    self.stdout.write(self.style.SUCCESS('✓ Created admin user'))
                
                # Create test users
                users_created = 0
                for i in range(1, 11):
                    user, created = User.objects.get_or_create(
                        email=f'user{i}@example.com',
                        defaults={
                            'first_name': f'User{i}',
                            'last_name': 'Test',
                            'is_active': True
                        }
                    )
                    if created:
                        user.set_password('test123')
                        user.save()
                        users_created += 1
                
                self.stdout.write(f'✓ Created {users_created} test users')
                
                # Create test practitioners
                prac_created = 0
                for i in range(1, 6):
                    user, created = User.objects.get_or_create(
                        email=f'practitioner{i}@example.com',
                        defaults={
                            'first_name': f'Practitioner{i}',
                            'last_name': 'Test',
                            'is_active': True,
                            'is_practitioner': True
                        }
                    )
                    if created:
                        user.set_password('test123')
                        user.save()
                        prac_created += 1
                        
                        # Try to create practitioner profile
                        try:
                            from practitioners.models import Practitioner
                            Practitioner.objects.get_or_create(
                                user=user,
                                defaults={
                                    'display_name': f'{user.first_name} {user.last_name}',
                                    'bio': f'Test practitioner #{i}',
                                    'is_verified': True,
                                    'practitioner_status': 'active'
                                }
                            )
                        except Exception as e:
                            self.stdout.write(f'Could not create practitioner profile: {e}')
                
                self.stdout.write(f'✓ Created {prac_created} test practitioners')
                
                self.stdout.write('\n📊 Summary:')
                self.stdout.write(f'  Total users: {User.objects.count()}')
                self.stdout.write(f'  Admin users: {User.objects.filter(is_superuser=True).count()}')
                self.stdout.write(f'  Practitioners: {User.objects.filter(is_practitioner=True).count()}')
                
                self.stdout.write('\n🔑 Test Credentials:')
                self.stdout.write('  Admin: admin@estuary.com / admin123')
                self.stdout.write('  Users: user1@example.com / test123')
                self.stdout.write('  Practitioners: practitioner1@example.com / test123')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            raise