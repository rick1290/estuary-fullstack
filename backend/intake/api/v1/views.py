from django.db import models
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from intake.models import FormTemplate, FormQuestion, ConsentDocument, ServiceForm, IntakeResponse, ConsentSignature
from intake.api.v1.serializers import (
    FormTemplateSerializer, FormQuestionSerializer, ConsentDocumentSerializer,
    ServiceFormSerializer, IntakeResponseSerializer, ConsentSignatureSerializer,
    BookingFormsStatusSerializer,
    IntakeResponseCreateSerializer, ConsentSignatureCreateSerializer,
    FormQuestionCreateSerializer, ConsentDocumentCreateSerializer,
)


class FormTemplateViewSet(viewsets.ModelViewSet):
    """Manage form templates."""
    serializer_class = FormTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['form_type', 'is_active', 'is_platform_template']
    search_fields = ['title', 'description']

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'practitioner_profile'):
            # Practitioner sees their own + platform templates
            return FormTemplate.objects.filter(
                models.Q(practitioner=user.practitioner_profile) |
                models.Q(is_platform_template=True)
            ).prefetch_related('questions', 'versions')
        return FormTemplate.objects.filter(is_platform_template=True).prefetch_related('questions', 'versions')

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'practitioner_profile'):
            serializer.save(practitioner=self.request.user.practitioner_profile)
        else:
            raise serializers.ValidationError("Only practitioners can create form templates")

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        """Clone a platform template to practitioner's own templates."""
        template = self.get_object()
        if not hasattr(request.user, 'practitioner_profile'):
            return Response({'error': 'Only practitioners can clone templates'}, status=400)

        # Clone the template
        new_template = FormTemplate.objects.create(
            practitioner=request.user.practitioner_profile,
            title=f"{template.title} (My Copy)",
            description=template.description,
            form_type=template.form_type,
            modality=template.modality,
            is_platform_template=False,
        )

        # Clone questions
        for q in template.questions.all():
            FormQuestion.objects.create(
                template=new_template,
                question_type=q.question_type,
                label=q.label,
                help_text=q.help_text,
                is_required=q.is_required,
                options=q.options,
                order=q.order,
            )

        # Clone latest consent document if consent type
        if template.form_type == 'consent':
            latest = template.versions.first()
            if latest:
                ConsentDocument.objects.create(
                    template=new_template,
                    legal_text=latest.legal_text,
                )

        return Response(FormTemplateSerializer(new_template).data, status=201)

    @action(detail=True, methods=['post'])
    def add_question(self, request, pk=None):
        """Add a question to a template."""
        template = self.get_object()
        serializer = FormQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(template=template)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['post'])
    def update_consent_text(self, request, pk=None):
        """Create a new consent document version."""
        template = self.get_object()
        if template.form_type != 'consent':
            return Response({'error': 'Only consent templates have consent documents'}, status=400)

        legal_text = request.data.get('legal_text')
        if not legal_text:
            return Response({'error': 'legal_text is required'}, status=400)

        doc = ConsentDocument.objects.create(
            template=template,
            legal_text=legal_text,
        )
        return Response(ConsentDocumentSerializer(doc).data, status=201)


class PlatformTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Browse platform-provided templates."""
    serializer_class = FormTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['form_type', 'modality']

    def get_queryset(self):
        return FormTemplate.objects.filter(
            is_platform_template=True, is_active=True
        ).prefetch_related('questions', 'versions')


class ServiceFormViewSet(viewsets.ModelViewSet):
    """Attach/detach forms from services."""
    serializer_class = ServiceFormSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        service_id = self.kwargs.get('service_pk')
        return ServiceForm.objects.filter(
            service_id=service_id
        ).select_related('form_template').prefetch_related('form_template__questions', 'form_template__versions')

    def perform_create(self, serializer):
        """Auto-set service from the URL path parameter."""
        serializer.save(service_id=self.kwargs['service_pk'])


class BookingFormsViewSet(viewsets.ViewSet):
    """Handle form submission for bookings."""
    permission_classes = [IsAuthenticated]

    def list(self, request, booking_uuid=None):
        """Get forms for a booking with previous responses."""
        from bookings.models import Booking

        try:
            booking = Booking.objects.get(public_uuid=booking_uuid, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        service_forms = ServiceForm.objects.filter(
            service=booking.service
        ).select_related('form_template').prefetch_related(
            'form_template__questions', 'form_template__versions'
        ).order_by('order')

        if not service_forms.exists():
            return Response({
                'has_forms': False,
                'consent_required': False,
                'consent_signed': False,
                'intake_completed': False,
                'forms': [],
            })

        forms_data = []
        consent_required = False
        consent_signed = False
        intake_completed = False

        for sf in service_forms:
            template = sf.form_template
            form_info = {
                'service_form_id': sf.id,
                'template': FormTemplateSerializer(template).data,
                'is_required': sf.is_required,
            }

            if template.form_type == 'consent':
                if sf.is_required:
                    consent_required = True
                signature = ConsentSignature.objects.filter(
                    booking=booking, user=request.user
                ).first()
                form_info['signed'] = signature is not None
                if signature:
                    consent_signed = True
                    form_info['signature'] = ConsentSignatureSerializer(signature).data

            elif template.form_type == 'intake':
                response = IntakeResponse.objects.filter(
                    booking=booking, form_template=template, user=request.user
                ).first()
                form_info['completed'] = response is not None
                if response:
                    intake_completed = True
                    form_info['response'] = IntakeResponseSerializer(response).data
                else:
                    # Check for previous responses to pre-fill
                    prev = IntakeResponse.objects.filter(
                        user=request.user, form_template=template
                    ).order_by('-submitted_at').first()
                    if prev:
                        form_info['previous_responses'] = prev.responses

            forms_data.append(form_info)

        return Response({
            'has_forms': True,
            'consent_required': consent_required,
            'consent_signed': consent_signed,
            'intake_completed': intake_completed,
            'forms': forms_data,
        })

    @action(detail=False, methods=['post'], url_path='intake')
    def submit_intake(self, request, booking_uuid=None):
        """Submit intake form responses."""
        from bookings.models import Booking

        try:
            booking = Booking.objects.get(public_uuid=booking_uuid, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        template_id = request.data.get('form_template')
        responses = request.data.get('responses', {})

        if not template_id:
            return Response({'error': 'form_template is required'}, status=400)

        # Check for previous response to link
        prev = IntakeResponse.objects.filter(
            user=request.user, form_template_id=template_id
        ).order_by('-submitted_at').first()

        response_obj = IntakeResponse.objects.create(
            booking=booking,
            form_template_id=template_id,
            user=request.user,
            responses=responses,
            is_prefilled=bool(prev),
            previous_response=prev,
        )

        return Response(IntakeResponseSerializer(response_obj).data, status=201)

    @action(detail=False, methods=['post'], url_path='consent')
    def sign_consent(self, request, booking_uuid=None):
        """Sign a consent form."""
        from bookings.models import Booking

        try:
            booking = Booking.objects.get(public_uuid=booking_uuid, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        consent_document_id = request.data.get('consent_document')
        signer_name = request.data.get('signer_name')

        if not consent_document_id or not signer_name:
            return Response({'error': 'consent_document and signer_name are required'}, status=400)

        # Check not already signed
        existing = ConsentSignature.objects.filter(
            booking=booking, user=request.user,
            consent_document_id=consent_document_id
        ).first()
        if existing:
            return Response(ConsentSignatureSerializer(existing).data)

        signature = ConsentSignature.objects.create(
            booking=booking,
            consent_document_id=consent_document_id,
            user=request.user,
            signer_name=signer_name,
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(ConsentSignatureSerializer(signature).data, status=201)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class PractitionerFormsViewSet(viewsets.ViewSet):
    """Practitioner view of client form responses."""
    permission_classes = [IsAuthenticated]

    def list(self, request, booking_uuid=None):
        """View client's form responses for a booking."""
        from bookings.models import Booking

        try:
            booking = Booking.objects.get(
                public_uuid=booking_uuid,
                practitioner=request.user.practitioner_profile
            )
        except Exception:
            return Response({'error': 'Booking not found'}, status=404)

        responses = IntakeResponse.objects.filter(booking=booking).select_related('form_template')
        signatures = ConsentSignature.objects.filter(booking=booking).select_related('consent_document')

        return Response({
            'intake_responses': IntakeResponseSerializer(responses, many=True).data,
            'consent_signatures': ConsentSignatureSerializer(signatures, many=True).data,
        })


# ── Standard CRUD ViewSets ───────────────────────────────────────────────────

class IntakeResponseViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for intake form responses.
    POST /api/v1/intake/responses/ — submit intake form answers.
    GET  /api/v1/intake/responses/ — list your responses (filterable by booking).
    """
    serializer_class = IntakeResponseCreateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['form_template']

    def get_queryset(self):
        qs = IntakeResponse.objects.filter(user=self.request.user).select_related(
            'booking', 'form_template'
        ).order_by('-submitted_at')
        # Allow filtering by booking UUID via query param
        booking_uuid = self.request.query_params.get('booking')
        if booking_uuid:
            qs = qs.filter(booking__public_uuid=booking_uuid)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return IntakeResponseCreateSerializer
        return IntakeResponseSerializer

    def perform_create(self, serializer):
        """Auto-set user, link previous response, set is_prefilled."""
        user = self.request.user
        form_template = serializer.validated_data['form_template']

        # Find previous response for pre-fill tracking
        prev = IntakeResponse.objects.filter(
            user=user, form_template=form_template
        ).order_by('-submitted_at').first()

        serializer.save(
            user=user,
            is_prefilled=bool(prev),
            previous_response=prev,
        )


class ConsentSignatureViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for consent signatures.
    POST /api/v1/intake/consent-signatures/ — sign a consent form.
    GET  /api/v1/intake/consent-signatures/ — list your signatures.
    """
    serializer_class = ConsentSignatureCreateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['consent_document']

    def get_queryset(self):
        qs = ConsentSignature.objects.filter(user=self.request.user).select_related(
            'booking', 'consent_document'
        ).order_by('-signed_at')
        booking_uuid = self.request.query_params.get('booking')
        if booking_uuid:
            qs = qs.filter(booking__public_uuid=booking_uuid)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ConsentSignatureCreateSerializer
        return ConsentSignatureSerializer

    def perform_create(self, serializer):
        """Auto-set user, capture IP + user agent, handle duplicates."""
        user = self.request.user
        booking = serializer.validated_data['booking']
        consent_document = serializer.validated_data['consent_document']

        # Check for existing signature (idempotent)
        existing = ConsentSignature.objects.filter(
            booking=booking, user=user, consent_document=consent_document
        ).first()
        if existing:
            # Return existing instead of creating duplicate
            # Raise a validation error that the view will handle
            raise serializers.ValidationError({
                'detail': 'Already signed',
                'signature': ConsentSignatureSerializer(existing).data,
            })

        serializer.save(
            user=user,
            ip_address=self._get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def create(self, request, *args, **kwargs):
        """Override to handle duplicate signature gracefully."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except serializers.ValidationError as e:
            # If it's a duplicate, return the existing signature with 200
            if hasattr(e, 'detail') and isinstance(e.detail, dict) and 'signature' in e.detail:
                return Response(e.detail['signature'], status=status.HTTP_200_OK)
            raise
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class FormQuestionCRUDViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for form questions.
    POST /api/v1/intake/questions/ — add a question to a template.
    """
    serializer_class = FormQuestionCreateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['template']

    def get_queryset(self):
        return FormQuestion.objects.filter(
            template__practitioner__user=self.request.user
        ).select_related('template').order_by('order')


class ConsentDocumentCRUDViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for consent document versions.
    POST /api/v1/intake/consent-documents/ — create new consent version.
    """
    serializer_class = ConsentDocumentCreateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['template']

    def get_queryset(self):
        return ConsentDocument.objects.filter(
            template__practitioner__user=self.request.user
        ).select_related('template').order_by('-version')
