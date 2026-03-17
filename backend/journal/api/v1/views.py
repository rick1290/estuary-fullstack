from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view

from journal.models import JournalEntry
from journal.api.v1.serializers import JournalEntrySerializer, JournalEntryCreateSerializer


@extend_schema_view(
    list=extend_schema(tags=['Journal']),
    create=extend_schema(tags=['Journal']),
    retrieve=extend_schema(tags=['Journal']),
    update=extend_schema(tags=['Journal']),
    partial_update=extend_schema(tags=['Journal']),
    destroy=extend_schema(tags=['Journal']),
)
class JournalEntryViewSet(viewsets.ModelViewSet):
    """
    User journal entries.

    GET /api/v1/journal/ — List entries (filter by booking, service, service_session)
    POST /api/v1/journal/ — Create entry
    GET /api/v1/journal/{id}/ — Get entry
    PATCH /api/v1/journal/{id}/ — Update entry
    DELETE /api/v1/journal/{id}/ — Delete entry
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        'booking': ['exact'],
        'service': ['exact'],
        'service_session': ['exact'],
        'entry_type': ['exact'],
    }
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    lookup_field = 'public_uuid'

    def get_queryset(self):
        return JournalEntry.objects.filter(user=self.request.user).select_related(
            'booking', 'service_session', 'service'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return JournalEntryCreateSerializer
        return JournalEntrySerializer
