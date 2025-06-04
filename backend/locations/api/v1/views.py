from django.db.models import F, ExpressionWrapper, FloatField, Q
from django.db.models.functions import ACos, Cos, Sin, Radians
from django.contrib.postgres.search import SearchVector, SearchQuery
from rest_framework import viewsets, mixins, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.locations.models import State, City, ZipCode, PractitionerLocation
from apps.practitioners.models import Practitioner
from .serializers import (
    StateSerializer, CitySerializer, ZipCodeSerializer,
    PractitionerLocationSerializer, PractitionerLocationCreateUpdateSerializer,
    PractitionerWithLocationSerializer, LocationSearchSerializer
)


class StateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing states.
    """
    queryset = State.objects.all()
    serializer_class = StateSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'abbreviation']


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing cities.
    """
    queryset = City.objects.all()
    serializer_class = CitySerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    
    def get_queryset(self):
        queryset = City.objects.all()
        
        # Filter by state if provided
        state_slug = self.request.query_params.get('state', None)
        if state_slug:
            queryset = queryset.filter(state__slug=state_slug)
            
        # Filter major cities only if requested
        major_only = self.request.query_params.get('major_only', 'false').lower() == 'true'
        if major_only:
            queryset = queryset.filter(is_major=True)
            
        return queryset


class ZipCodeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing zip codes.
    """
    queryset = ZipCode.objects.all()
    serializer_class = ZipCodeSerializer
    lookup_field = 'code'
    
    def get_queryset(self):
        queryset = ZipCode.objects.all()
        
        # Filter by state if provided
        state_slug = self.request.query_params.get('state', None)
        if state_slug:
            queryset = queryset.filter(city__state__slug=state_slug)
            
        # Filter by city if provided
        city_slug = self.request.query_params.get('city', None)
        if city_slug and state_slug:
            queryset = queryset.filter(city__slug=city_slug)
            
        return queryset


class PractitionerLocationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing practitioner locations.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Practitioners can only see their own locations
        if hasattr(self.request.user, 'practitioner'):
            return PractitionerLocation.objects.filter(practitioner=self.request.user.practitioner)
        # Admin users can see all locations
        return PractitionerLocation.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PractitionerLocationCreateUpdateSerializer
        return PractitionerLocationSerializer


class LocationSearchViewSet(viewsets.ViewSet):
    """
    API endpoint for location-based searches.
    """
    def get_serializer_class(self):
        if self.action == 'search_locations':
            return LocationSearchSerializer
        elif self.action == 'find_practitioners':
            return PractitionerWithLocationSerializer
        return None
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='q',
                type=str,
                location=OpenApiParameter.QUERY,
                description='Search query for locations (min 2 characters)',
                required=True
            )
        ],
        responses=LocationSearchSerializer,
        description='Search for locations by text query'
    )
    @action(detail=False, methods=['get'])
    def search_locations(self, request):
        """
        Search for locations by text query.
        """
        query = request.query_params.get('q', '')
        if not query or len(query) < 2:
            return Response({"error": "Query must be at least 2 characters"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Search cities
        cities = City.objects.annotate(
            search=SearchVector('name', 'state__name', 'state__abbreviation')
        ).filter(search=SearchQuery(query))[:10]
        
        # Search zip codes
        zip_codes = ZipCode.objects.filter(code__startswith=query)[:10]
        
        # Search states
        states = State.objects.annotate(
            search=SearchVector('name', 'abbreviation')
        ).filter(search=SearchQuery(query))[:10]
        
        results = {
            'cities': CitySerializer(cities, many=True).data,
            'zip_codes': ZipCodeSerializer(zip_codes, many=True).data,
            'states': StateSerializer(states, many=True).data
        }
        
        return Response(results)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='zip_code',
                type=str,
                location=OpenApiParameter.QUERY,
                description='ZIP code to search near',
                required=False
            ),
            OpenApiParameter(
                name='city_id',
                type=int,
                location=OpenApiParameter.QUERY,
                description='City ID to search near',
                required=False
            ),
            OpenApiParameter(
                name='state_id',
                type=int,
                location=OpenApiParameter.QUERY,
                description='State ID to search near',
                required=False
            ),
            OpenApiParameter(
                name='radius',
                type=float,
                location=OpenApiParameter.QUERY,
                description='Search radius in miles (default: 50)',
                required=False
            )
        ],
        responses=PractitionerWithLocationSerializer(many=True),
        description='Find practitioners near a location'
    )
    @action(detail=False, methods=['get', 'post'])
    def find_practitioners(self, request):
        """
        Find practitioners near a location.
        """
        # Handle both GET and POST methods
        if request.method == 'POST':
            serializer = LocationSearchSerializer(data=request.data)
        else:
            serializer = LocationSearchSerializer(data=request.query_params)
            
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        radius = data.get('radius', 25)  # Default radius in miles
        
        # Get coordinates based on the provided parameters
        lat, lng = None, None
        
        # Direct coordinates
        if 'latitude' in data and 'longitude' in data:
            lat, lng = data['latitude'], data['longitude']
            
        # Zip code lookup
        elif 'zip_code' in data:
            try:
                zip_obj = ZipCode.objects.get(code=data['zip_code'])
                lat, lng = zip_obj.latitude, zip_obj.longitude
            except ZipCode.DoesNotExist:
                return Response(
                    {"error": f"Zip code {data['zip_code']} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
                
        # City lookup
        elif 'city_id' in data:
            try:
                city = City.objects.get(id=data['city_id'])
                lat, lng = city.latitude, city.longitude
            except City.DoesNotExist:
                return Response(
                    {"error": f"City with ID {data['city_id']} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
                
        # State lookup (will use center point of state)
        elif 'state_id' in data:
            try:
                # For states, we'll use the most populous city as a proxy for the center
                city = City.objects.filter(state_id=data['state_id']).order_by('-population').first()
                if not city:
                    return Response(
                        {"error": f"No cities found for state with ID {data['state_id']}"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                lat, lng = city.latitude, city.longitude
            except Exception as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # If we have coordinates, perform the proximity search
        if lat is not None and lng is not None:
            # Calculate distance using Haversine formula
            practitioners = Practitioner.objects.filter(
                locations__isnull=False
            ).annotate(
                distance=ExpressionWrapper(
                    3959 * ACos(  # 3959 is Earth's radius in miles
                        Cos(Radians(lat)) * 
                        Cos(Radians(F('locations__latitude'))) * 
                        Cos(Radians(F('locations__longitude')) - Radians(lng)) + 
                        Sin(Radians(lat)) * 
                        Sin(Radians(F('locations__latitude')))
                    ),
                    output_field=FloatField()
                )
            ).filter(
                distance__lte=radius,
                # Only include practitioners with in-person services
                locations__is_in_person=True
            ).order_by('distance').distinct()
            
            # Attach the matched location to each practitioner
            for practitioner in practitioners:
                # Find the closest location for this practitioner
                closest_location = PractitionerLocation.objects.filter(
                    practitioner=practitioner,
                    is_in_person=True
                ).annotate(
                    loc_distance=ExpressionWrapper(
                        3959 * ACos(
                            Cos(Radians(lat)) * 
                            Cos(Radians(F('latitude'))) * 
                            Cos(Radians(F('longitude')) - Radians(lng)) + 
                            Sin(Radians(lat)) * 
                            Sin(Radians(F('latitude')))
                        ),
                        output_field=FloatField()
                    )
                ).order_by('loc_distance').first()
                
                practitioner.matched_location = closest_location
            
            return Response({
                'practitioners': PractitionerWithLocationSerializer(practitioners, many=True).data,
                'search_coordinates': {
                    'latitude': lat,
                    'longitude': lng,
                    'radius': radius
                }
            })
            
        return Response(
            {"error": "Could not determine coordinates for search"},
            status=status.HTTP_400_BAD_REQUEST
        )
