"""
Management command to set up LiveKit integration.
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from rooms.models import RoomTemplate


class Command(BaseCommand):
    help = 'Set up LiveKit integration with default templates'
    
    def handle(self, *args, **options):
        self.stdout.write('Setting up LiveKit integration...')
        
        # Check LiveKit configuration
        self._check_configuration()
        
        # Create default room templates
        self._create_default_templates()
        
        self.stdout.write(self.style.SUCCESS('LiveKit setup completed!'))
    
    def _check_configuration(self):
        """Check if LiveKit is properly configured."""
        required_settings = [
            'LIVEKIT_API_KEY',
            'LIVEKIT_API_SECRET',
            'LIVEKIT_SERVER_URL'
        ]
        
        missing = []
        for setting in required_settings:
            if not hasattr(settings, setting) or not getattr(settings, setting):
                missing.append(setting)
        
        if missing:
            self.stdout.write(
                self.style.WARNING(
                    f"Missing LiveKit settings: {', '.join(missing)}\n"
                    "Please configure these in your settings file."
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS('LiveKit configuration found'))
    
    def _create_default_templates(self):
        """Create default room templates."""
        templates = [
            {
                'name': 'Individual Session',
                'room_type': 'individual',
                'max_participants': 2,
                'empty_timeout': 300,
                'recording_enabled': False,
                'sip_enabled': False,
                'is_default': True
            },
            {
                'name': 'Group Session',
                'room_type': 'group',
                'max_participants': 10,
                'empty_timeout': 600,
                'recording_enabled': True,
                'sip_enabled': True,
                'is_default': True
            },
            {
                'name': 'Webinar',
                'room_type': 'webinar',
                'max_participants': 100,
                'empty_timeout': 1800,
                'recording_enabled': True,
                'sip_enabled': True,
                'streaming_enabled': True,
                'is_default': True
            },
            {
                'name': 'Broadcast',
                'room_type': 'broadcast',
                'max_participants': 1000,
                'empty_timeout': 3600,
                'recording_enabled': True,
                'streaming_enabled': True,
                'is_default': True
            }
        ]
        
        for template_data in templates:
            template, created = RoomTemplate.objects.update_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"Created template: {template.name}")
                )
            else:
                self.stdout.write(f"Updated template: {template.name}")