from typing import Optional, Dict
from rest_framework import serializers
from apps.locations.models import State, City, ZipCode, PractitionerLocation
from apps.practitioners.models import Practitioner
from drf_spectacular.utils import extend_schema_field


class StateSerializer(serializers.ModelSerializer):
    """
    Serializer for State model.
    """
    class Meta:
        model = State
        fields = ['id', 'name', 'abbreviation', 'slug']


class CitySerializer(serializers.ModelSerializer):
    """
    Serializer for City model.
    """
    state_name = serializers.CharField(source='state.name', read_only=True)
    state_abbreviation = serializers.CharField(source='state.abbreviation', read_only=True)
    
    class Meta:
        model = City
        fields = ['id', 'name', 'slug', 'state', 'state_name', 'state_abbreviation', 
                  'population', 'latitude', 'longitude', 'is_major']


class ZipCodeSerializer(serializers.ModelSerializer):
    """
    Serializer for ZipCode model.
    """
    city_name = serializers.CharField(source='city.name', read_only=True)
    state_abbreviation = serializers.CharField(source='city.state.abbreviation', read_only=True)
    
    class Meta:
        model = ZipCode
        fields = ['id', 'code', 'city', 'city_name', 'state_abbreviation', 'latitude', 'longitude']


class PractitionerLocationSerializer(serializers.ModelSerializer):
    """
    Serializer for PractitionerLocation model.
    """
    city_name = serializers.CharField(source='city.name', read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    state_abbreviation = serializers.CharField(source='state.abbreviation', read_only=True)
    
    class Meta:
        model = PractitionerLocation
        fields = ['id', 'practitioner', 'name', 'address_line1', 'address_line2',
                  'city', 'city_name', 'state', 'state_name', 'state_abbreviation',
                  'zip_code', 'latitude', 'longitude', 'is_primary', 'is_virtual',
                  'is_in_person', 'created_at', 'updated_at']


class PractitionerLocationCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating PractitionerLocation.
    """
    class Meta:
        model = PractitionerLocation
        fields = ['id', 'practitioner', 'name', 'address_line1', 'address_line2',
                  'city', 'state', 'zip_code', 'latitude', 'longitude', 
                  'is_primary', 'is_virtual', 'is_in_person']
        
    def validate(self, data):
        # Ensure at least one service type is selected
        if not data.get('is_virtual', False) and not data.get('is_in_person', False):
            raise serializers.ValidationError(
                "At least one service type (virtual or in-person) must be selected."
            )
        return data


class PractitionerWithLocationSerializer(serializers.ModelSerializer):
    """
    Serializer for Practitioner model with location information.
    Used for proximity search results.
    """
    distance = serializers.FloatField(read_only=True)
    location = serializers.SerializerMethodField()
    
    class Meta:
        model = Practitioner
        fields = ['id', 'user', 'display_name', 'title', 'profile_image_url', 
                  'distance', 'location']
    
    @extend_schema_field({'type': 'object', 'properties': {
        'id': {'type': 'integer'},
        'name': {'type': 'string'},
        'address_line1': {'type': 'string'},
        'address_line2': {'type': 'string', 'nullable': True},
        'city_name': {'type': 'string'},
        'state_name': {'type': 'string'},
        'state_abbreviation': {'type': 'string'},
        'zip_code': {'type': 'string'},
        'latitude': {'type': 'number'},
        'longitude': {'type': 'number'},
        'is_primary': {'type': 'boolean'},
        'is_virtual': {'type': 'boolean'},
        'is_in_person': {'type': 'boolean'}
    }, 'nullable': True})
    def get_location(self, obj) -> Optional[Dict]:
        # Get the closest location that matched the search
        if hasattr(obj, 'matched_location'):
            return PractitionerLocationSerializer(obj.matched_location).data
        
        # Otherwise return the primary location
        location = obj.locations.filter(is_primary=True).first()
        if location:
            return PractitionerLocationSerializer(location).data
        return None


class LocationSearchSerializer(serializers.Serializer):
    """
    Serializer for location search parameters.
    """
    query = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    zip_code = serializers.CharField(required=False, max_length=10)
    city_id = serializers.IntegerField(required=False)
    state_id = serializers.IntegerField(required=False)
    radius = serializers.IntegerField(required=False, default=25)  # miles
    
    def validate(self, data):
        # Ensure at least one search parameter is provided
        if not any([
            'query' in data,
            'latitude' in data and 'longitude' in data,
            'zip_code' in data,
            'city_id' in data,
            'state_id' in data
        ]):
            raise serializers.ValidationError(
                "At least one search parameter (query, coordinates, zip_code, city_id, or state_id) must be provided."
            )
        return data
