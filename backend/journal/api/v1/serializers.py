from rest_framework import serializers
from journal.models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    entry_type_display = serializers.CharField(source='get_entry_type_display', read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'public_uuid', 'user', 'booking', 'service_session', 'service',
            'content', 'entry_type', 'entry_type_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'public_uuid', 'user', 'entry_type_display', 'created_at', 'updated_at']


class JournalEntryCreateSerializer(serializers.ModelSerializer):
    booking_uuid = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    service_session_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    service_uuid = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            'content', 'entry_type',
            'booking_uuid', 'service_session_id', 'service_uuid',
        ]

    def validate(self, data):
        user = self.context['request'].user

        # Resolve booking by UUID
        if data.get('booking_uuid'):
            from bookings.models import Booking
            try:
                booking = Booking.objects.get(public_uuid=data.pop('booking_uuid'), user=user)
                data['booking'] = booking
                # Auto-set service_session and service from booking
                if booking.service_session:
                    data['service_session'] = booking.service_session
                if booking.service:
                    data['service'] = booking.service
            except Booking.DoesNotExist:
                raise serializers.ValidationError({'booking_uuid': 'Booking not found.'})

        # Resolve service by UUID (if not already set from booking)
        if data.get('service_uuid') and not data.get('service'):
            from services.models import Service
            try:
                data['service'] = Service.objects.get(public_uuid=data.pop('service_uuid'))
            except Service.DoesNotExist:
                raise serializers.ValidationError({'service_uuid': 'Service not found.'})
        else:
            data.pop('service_uuid', None)

        # Resolve service_session by ID (if not already set from booking)
        if data.get('service_session_id') and not data.get('service_session'):
            from services.models import ServiceSession
            try:
                data['service_session'] = ServiceSession.objects.get(id=data.pop('service_session_id'))
            except ServiceSession.DoesNotExist:
                raise serializers.ValidationError({'service_session_id': 'Session not found.'})
        else:
            data.pop('service_session_id', None)

        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
