from rest_framework import serializers
from django.db import models
from locations.models import Country, State, City, ZipCode, PractitionerLocation
from integrations.google_maps.client import GoogleMapsClient
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class CountrySerializer(serializers.ModelSerializer):
    """Serializer for Country model."""
    
    class Meta:
        model = Country
        fields = [
            'id', 'name', 'code', 'code_3', 'numeric_code',
            'slug', 'phone_code', 'currency_code', 'is_active'
        ]
        read_only_fields = ['id', 'slug']


class StateSerializer(serializers.ModelSerializer):
    """Serializer for State/Province model."""
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)
    
    class Meta:
        model = State
        fields = [
            'id', 'name', 'code', 'slug', 'country',
            'country_name', 'country_code', 'is_active',
            'meta_title', 'meta_description'
        ]
        read_only_fields = ['id', 'slug']


class CitySerializer(serializers.ModelSerializer):
    """Serializer for City model."""
    state_name = serializers.CharField(source='state.name', read_only=True)
    state_code = serializers.CharField(source='state.code', read_only=True)
    country_name = serializers.CharField(source='state.country.name', read_only=True)
    country_code = serializers.CharField(source='state.country.code', read_only=True)
    
    class Meta:
        model = City
        fields = [
            'id', 'name', 'slug', 'state', 'state_name', 'state_code',
            'country_name', 'country_code', 'population',
            'latitude', 'longitude', 'metro_area',
            'is_major', 'is_active', 'service_count',
            'meta_title', 'meta_description', 'seo_url'
        ]
        read_only_fields = ['id', 'slug', 'seo_url']


class ZipCodeSerializer(serializers.ModelSerializer):
    """Serializer for postal/zip codes."""
    city_name = serializers.CharField(source='city.name', read_only=True)
    state_code = serializers.CharField(source='city.state.code', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)
    
    class Meta:
        model = ZipCode
        fields = [
            'id', 'code', 'city', 'city_name', 'state_code',
            'country', 'country_code', 'latitude', 'longitude'
        ]
        read_only_fields = ['id']


class AddressSerializer(serializers.Serializer):
    """Serializer for address components used in location forms."""
    address_line1 = serializers.CharField(max_length=255)
    address_line2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.PrimaryKeyRelatedField(queryset=City.objects.all())
    state = serializers.PrimaryKeyRelatedField(queryset=State.objects.all())
    postal_code = serializers.CharField(max_length=20)
    country = serializers.PrimaryKeyRelatedField(queryset=Country.objects.all())
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)


class PractitionerLocationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner locations."""
    address = AddressSerializer(write_only=True, required=False)

    # Read-only display fields
    city_name = serializers.CharField(source='city.name', read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    state_code = serializers.CharField(source='state.code', read_only=True)
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)
    full_address = serializers.SerializerMethodField()
    location_types = serializers.SerializerMethodField()

    # Write-only fields for name-based location resolution (Google Places)
    input_city_name = serializers.CharField(write_only=True, required=False)
    input_state_name = serializers.CharField(write_only=True, required=False)
    input_state_code = serializers.CharField(write_only=True, required=False, max_length=10)
    input_country_name = serializers.CharField(write_only=True, required=False)
    input_country_code = serializers.CharField(write_only=True, required=False, max_length=2)

    class Meta:
        model = PractitionerLocation
        fields = [
            'id', 'practitioner', 'name',
            'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
            'city_name', 'state_name', 'state_code', 'country_name', 'country_code',
            'latitude', 'longitude', 'is_primary', 'is_virtual', 'is_in_person',
            'service_radius_miles', 'full_address', 'location_types',
            'address', 'created_at', 'updated_at',
            # Write-only fields for name-based input
            'input_city_name', 'input_state_name', 'input_state_code',
            'input_country_name', 'input_country_code',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'practitioner']
        extra_kwargs = {
            # Make ID-based fields optional since we support name-based input
            'city': {'required': False},
            'state': {'required': False},
            'country': {'required': False},
        }
        
    def get_full_address(self, obj):
        """Return formatted full address."""
        parts = [obj.address_line1]
        if obj.address_line2:
            parts.append(obj.address_line2)
        parts.extend([
            f"{obj.city.name}, {obj.state.code} {obj.postal_code}",
            obj.country.name
        ])
        return ", ".join(parts)
    
    def get_location_types(self, obj):
        """Return list of location types."""
        types = []
        if obj.is_in_person:
            types.append('in_person')
        if obj.is_virtual:
            types.append('virtual')
        return types
    
    def validate(self, attrs):
        """Validate location data and geocode if needed."""
        # Handle nested address data
        if 'address' in attrs:
            address_data = attrs.pop('address')
            attrs.update(address_data)

        # Handle name-based location resolution (from Google Places)
        attrs = self._resolve_location_from_names(attrs)

        # Ensure we have city, state, country after resolution
        if not attrs.get('city') or not attrs.get('state') or not attrs.get('country'):
            raise serializers.ValidationError(
                "City, state, and country are required. Provide either IDs or name-based fields."
            )

        # Geocode if coordinates not provided
        if not attrs.get('latitude') or not attrs.get('longitude'):
            try:
                # Build address string for geocoding
                address_parts = [
                    attrs.get('address_line1'),
                    attrs.get('address_line2', ''),
                    attrs.get('city').name if attrs.get('city') else '',
                    attrs.get('state').code if attrs.get('state') else '',
                    attrs.get('postal_code', ''),
                    attrs.get('country').name if attrs.get('country') else ''
                ]
                address_string = ', '.join(filter(None, address_parts))

                # Geocode the address
                if hasattr(settings, 'GOOGLE_MAPS_API_KEY'):
                    client = GoogleMapsClient()
                    geocode_result = client.geocode(address_string)
                    if geocode_result:
                        attrs['latitude'] = geocode_result['lat']
                        attrs['longitude'] = geocode_result['lng']
            except Exception as e:
                logger.warning(f"Geocoding failed: {e}")

        # Ensure at least one service type is selected
        if not attrs.get('is_virtual', True) and not attrs.get('is_in_person', True):
            raise serializers.ValidationError(
                "Location must offer either virtual or in-person services."
            )

        return attrs

    def _resolve_location_from_names(self, attrs):
        """
        Resolve city, state, country from name-based input fields.
        Uses get_or_create to auto-create location entities.
        """
        from django.utils.text import slugify

        input_country_code = attrs.pop('input_country_code', None)
        input_country_name = attrs.pop('input_country_name', None)
        input_state_code = attrs.pop('input_state_code', None)
        input_state_name = attrs.pop('input_state_name', None)
        input_city_name = attrs.pop('input_city_name', None)

        # If no name-based input, return as-is (ID-based flow)
        if not any([input_country_code, input_state_code, input_city_name]):
            return attrs

        # Resolve Country
        country = attrs.get('country')
        if not country and input_country_code:
            country, _ = Country.objects.get_or_create(
                code=input_country_code.upper(),
                defaults={
                    'name': input_country_name or input_country_code.upper(),
                    'code_3': '',  # Can be empty for auto-created
                    'slug': slugify(input_country_name or input_country_code),
                }
            )
            attrs['country'] = country

        # Resolve State
        state = attrs.get('state')
        if not state and input_state_code and country:
            state, _ = State.objects.get_or_create(
                country=country,
                code=input_state_code.upper(),
                defaults={
                    'name': input_state_name or input_state_code.upper(),
                    'slug': slugify(input_state_name or input_state_code),
                }
            )
            attrs['state'] = state

        # Resolve City
        city = attrs.get('city')
        if not city and input_city_name and state:
            city, _ = City.objects.get_or_create(
                state=state,
                slug=slugify(input_city_name),
                defaults={
                    'name': input_city_name,
                }
            )
            attrs['city'] = city

        return attrs
    
    def create(self, validated_data):
        """Create location with practitioner from context."""
        validated_data['practitioner'] = self.context['request'].user.practitioner_profile
        return super().create(validated_data)


class LocationSearchSerializer(serializers.Serializer):
    """Serializer for location search parameters."""
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    address = serializers.CharField(required=False, help_text="Address to search near")
    radius = serializers.DecimalField(
        max_digits=5, decimal_places=1, required=False, default=25.0,
        help_text="Search radius in miles"
    )
    city = serializers.PrimaryKeyRelatedField(queryset=City.objects.all(), required=False)
    state = serializers.PrimaryKeyRelatedField(queryset=State.objects.all(), required=False)
    country = serializers.PrimaryKeyRelatedField(queryset=Country.objects.all(), required=False)
    postal_code = serializers.CharField(max_length=20, required=False)
    location_type = serializers.ChoiceField(
        choices=['in_person', 'virtual', 'both'],
        required=False,
        default='both'
    )
    
    def validate(self, attrs):
        """Validate search parameters."""
        # Ensure we have either coordinates or an address/location
        has_coords = attrs.get('latitude') and attrs.get('longitude')
        has_location = any([
            attrs.get('address'),
            attrs.get('city'),
            attrs.get('postal_code')
        ])
        
        if not has_coords and not has_location:
            raise serializers.ValidationError(
                "Please provide either coordinates (latitude/longitude) or a location (address/city/postal_code)."
            )
        
        # Geocode address if provided without coordinates
        if not has_coords and attrs.get('address'):
            try:
                if hasattr(settings, 'GOOGLE_MAPS_API_KEY'):
                    client = GoogleMapsClient()
                    geocode_result = client.geocode(attrs['address'])
                    if geocode_result:
                        attrs['latitude'] = geocode_result['lat']
                        attrs['longitude'] = geocode_result['lng']
            except Exception as e:
                logger.warning(f"Geocoding failed for search: {e}")
        
        return attrs


class NearbyLocationSerializer(serializers.ModelSerializer):
    """Serializer for nearby locations with distance."""
    distance_miles = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.display_name', read_only=True)
    practitioner_id = serializers.CharField(source='practitioner.public_id', read_only=True)
    full_address = serializers.SerializerMethodField()
    location_types = serializers.SerializerMethodField()
    
    class Meta:
        model = PractitionerLocation
        fields = [
            'id', 'name', 'practitioner_id', 'practitioner_name',
            'address_line1', 'address_line2', 'city', 'state', 'postal_code',
            'latitude', 'longitude', 'is_virtual', 'is_in_person',
            'service_radius_miles', 'distance_miles', 'full_address', 'location_types'
        ]
    
    def get_full_address(self, obj):
        """Return formatted full address."""
        parts = [obj.address_line1]
        if obj.address_line2:
            parts.append(obj.address_line2)
        parts.extend([
            f"{obj.city.name}, {obj.state.code} {obj.postal_code}"
        ])
        return ", ".join(parts)
    
    def get_location_types(self, obj):
        """Return list of location types."""
        types = []
        if obj.is_in_person:
            types.append('in_person')
        if obj.is_virtual:
            types.append('virtual')
        return types