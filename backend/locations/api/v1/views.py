from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, F, Value, DecimalField
from django.db.models.functions import Power, Sqrt, Sin, Cos, ATan2, Radians
from django.db import models
from django_filters import rest_framework as django_filters
from locations.models import Country, State, City, ZipCode, PractitionerLocation
from .serializers import (
    CountrySerializer, StateSerializer, CitySerializer, ZipCodeSerializer,
    PractitionerLocationSerializer, LocationSearchSerializer, NearbyLocationSerializer
)
from utils.permissions import IsPractitioner
from .permissions import IsLocationOwnerOrReadOnly, CanManageLocation
import math
import logging

logger = logging.getLogger(__name__)


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for countries.
    Provides read-only access to country data.
    """
    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]
    filterset_fields = ['code', 'currency_code']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']
    ordering = ['name']


class StateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for states/provinces.
    Provides read-only access to state data with filtering by country.
    """
    queryset = State.objects.filter(is_active=True).select_related('country')
    serializer_class = StateSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['country', 'code']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']
    ordering = ['name']


class CityFilter(django_filters.FilterSet):
    """Filter for cities."""
    state = django_filters.ModelChoiceFilter(queryset=State.objects.all())
    country = django_filters.ModelChoiceFilter(
        field_name='state__country',
        queryset=Country.objects.all()
    )
    is_major = django_filters.BooleanFilter()
    metro_area = django_filters.CharFilter(lookup_expr='icontains')
    min_population = django_filters.NumberFilter(field_name='population', lookup_expr='gte')
    
    class Meta:
        model = City
        fields = ['state', 'country', 'is_major', 'metro_area']


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for cities.
    Provides read-only access to city data with advanced filtering.
    """
    queryset = City.objects.filter(is_active=True).select_related('state', 'state__country')
    serializer_class = CitySerializer
    permission_classes = [AllowAny]
    filterset_class = CityFilter
    search_fields = ['name', 'metro_area']
    ordering_fields = ['name', 'population', 'is_major']
    ordering = ['-is_major', '-population', 'name']
    
    @action(detail=False, methods=['get'])
    def major_cities(self, request):
        """Get major cities for SEO/discovery."""
        cities = self.queryset.filter(is_major=True)
        serializer = self.get_serializer(cities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_metro(self, request):
        """Get cities grouped by metro area."""
        metro_area = request.query_params.get('metro_area')
        if not metro_area:
            return Response(
                {"error": "metro_area parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cities = self.queryset.filter(metro_area__icontains=metro_area)
        serializer = self.get_serializer(cities, many=True)
        return Response(serializer.data)


class ZipCodeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for postal codes.
    Provides read-only access to postal code data.
    """
    queryset = ZipCode.objects.all().select_related('city', 'city__state', 'country')
    serializer_class = ZipCodeSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['country', 'city']
    search_fields = ['code']
    ordering = ['code']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by state if provided
        state_id = self.request.query_params.get('state')
        if state_id:
            queryset = queryset.filter(city__state_id=state_id)
        
        return queryset


class PractitionerLocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for practitioner locations.
    Practitioners can manage their own locations.
    """
    serializer_class = PractitionerLocationSerializer
    permission_classes = [IsAuthenticated, CanManageLocation, IsLocationOwnerOrReadOnly]
    filterset_fields = ['is_primary', 'is_virtual', 'is_in_person', 'city', 'state']
    ordering_fields = ['created_at', 'is_primary']
    ordering = ['-is_primary', '-created_at']
    
    def get_queryset(self):
        """Get locations based on user permissions."""
        user = self.request.user
        
        # If listing, show all locations
        if self.action == 'list':
            queryset = PractitionerLocation.objects.all()
            
            # Filter by practitioner if specified
            practitioner_id = self.request.query_params.get('practitioner')
            if practitioner_id:
                queryset = queryset.filter(practitioner__public_id=practitioner_id)
        else:
            # For other actions, only show user's own locations
            if hasattr(user, 'practitioner_profile'):
                queryset = PractitionerLocation.objects.filter(
                    practitioner=user.practitioner_profile
                )
            else:
                queryset = PractitionerLocation.objects.none()
        
        return queryset.select_related(
            'practitioner', 'city', 'state', 'country',
            'city__state', 'city__state__country'
        )
    
    def perform_create(self, serializer):
        """Create location for the current practitioner."""
        serializer.save(practitioner=self.request.user.practitioner_profile)
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """Set a location as primary."""
        location = self.get_object()
        
        # Check if user owns this location
        if location.practitioner != request.user.practitioner_profile:
            return Response(
                {"error": "You can only modify your own locations"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        location.is_primary = True
        location.save()
        
        serializer = self.get_serializer(location)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """
        Search for nearby practitioner locations.
        Supports searching by coordinates, address, or city.
        """
        search_serializer = LocationSearchSerializer(data=request.data)
        search_serializer.is_valid(raise_exception=True)
        params = search_serializer.validated_data
        
        queryset = PractitionerLocation.objects.filter(
            practitioner__practitioner_status='active'
        )
        
        # Filter by location type
        location_type = params.get('location_type', 'both')
        if location_type == 'in_person':
            queryset = queryset.filter(is_in_person=True)
        elif location_type == 'virtual':
            queryset = queryset.filter(is_virtual=True)
        
        # Filter by city/state/country if provided
        if params.get('city'):
            queryset = queryset.filter(city=params['city'])
        elif params.get('state'):
            queryset = queryset.filter(state=params['state'])
        elif params.get('country'):
            queryset = queryset.filter(country=params['country'])
        
        # If we have coordinates, calculate distances
        if params.get('latitude') and params.get('longitude'):
            lat = float(params['latitude'])
            lng = float(params['longitude'])
            radius = float(params.get('radius', 25.0))
            
            # Haversine formula for distance calculation
            # Convert to radians
            lat_rad = math.radians(lat)
            lng_rad = math.radians(lng)
            
            # Annotate with distance using database functions
            queryset = queryset.annotate(
                distance_miles=Value(3959.0, output_field=DecimalField()) * 
                ATan2(
                    Sqrt(
                        Power(Sin((Radians(F('latitude')) - lat_rad) / 2), 2) +
                        Cos(lat_rad) * Cos(Radians(F('latitude'))) *
                        Power(Sin((Radians(F('longitude')) - lng_rad) / 2), 2)
                    ),
                    Sqrt(
                        1 - (
                            Power(Sin((Radians(F('latitude')) - lat_rad) / 2), 2) +
                            Cos(lat_rad) * Cos(Radians(F('latitude'))) *
                            Power(Sin((Radians(F('longitude')) - lng_rad) / 2), 2)
                        )
                    )
                ) * 2
            )
            
            # Filter by radius
            queryset = queryset.filter(distance_miles__lte=radius)
            
            # Order by distance
            queryset = queryset.order_by('distance_miles')
        
        # Limit results
        queryset = queryset[:100]
        
        serializer = NearbyLocationSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        Get nearby locations based on user's IP or provided coordinates.
        This is a simplified version of search for quick lookups.
        """
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = float(request.query_params.get('radius', 10.0))
        
        if not lat or not lng:
            return Response(
                {"error": "Latitude and longitude parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response(
                {"error": "Invalid latitude or longitude values"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use the search action logic
        return self.search(request)
    
    @action(detail=False, methods=['post'])
    def validate_address(self, request):
        """Validate and geocode an address."""
        from integrations.google_maps.client import GoogleMapsClient
        from django.conf import settings
        
        address = request.data.get('address')
        if not address:
            return Response(
                {"error": "Address is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if hasattr(settings, 'GOOGLE_MAPS_API_KEY'):
                client = GoogleMapsClient()
                result = client.geocode(address)
                
                if result:
                    return Response({
                        "valid": True,
                        "formatted_address": result.get('formatted_address', address),
                        "latitude": result['lat'],
                        "longitude": result['lng'],
                        "components": result.get('components', {})
                    })
                else:
                    return Response({
                        "valid": False,
                        "error": "Address could not be found"
                    })
            else:
                return Response({
                    "valid": False,
                    "error": "Geocoding service not configured"
                })
        except Exception as e:
            logger.error(f"Address validation error: {e}")
            return Response({
                "valid": False,
                "error": "Error validating address"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)