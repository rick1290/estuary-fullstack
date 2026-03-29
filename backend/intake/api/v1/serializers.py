from rest_framework import serializers
from intake.models import FormTemplate, FormQuestion, ConsentDocument, ServiceForm, IntakeResponse, ConsentSignature


class FormQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormQuestion
        fields = ['id', 'question_type', 'label', 'help_text', 'is_required', 'options', 'order']
        read_only_fields = ['id']


class ConsentDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentDocument
        fields = ['id', 'version', 'legal_text', 'created_at']
        read_only_fields = ['id', 'version', 'created_at']


class FormTemplateSerializer(serializers.ModelSerializer):
    questions = FormQuestionSerializer(many=True, read_only=True)
    latest_consent = serializers.SerializerMethodField()

    class Meta:
        model = FormTemplate
        fields = [
            'id', 'title', 'description', 'form_type',
            'is_platform_template', 'modality', 'is_active',
            'questions', 'latest_consent',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_platform_template', 'created_at', 'updated_at']

    def get_latest_consent(self, obj):
        if obj.form_type != 'consent':
            return None
        latest = obj.versions.first()
        if latest:
            return ConsentDocumentSerializer(latest).data
        return None


class ServiceFormSerializer(serializers.ModelSerializer):
    form_template_detail = FormTemplateSerializer(source='form_template', read_only=True)

    class Meta:
        model = ServiceForm
        fields = ['id', 'service', 'form_template', 'form_template_detail', 'is_required', 'order']
        read_only_fields = ['id']
        extra_kwargs = {
            'service': {'required': False},  # Auto-set from URL path in perform_create
        }


class IntakeResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntakeResponse
        fields = [
            'id', 'public_uuid', 'booking', 'form_template', 'user',
            'responses', 'submitted_at', 'is_prefilled', 'previous_response',
            'created_at'
        ]
        read_only_fields = ['id', 'public_uuid', 'user', 'submitted_at', 'is_prefilled', 'previous_response', 'created_at']


class ConsentSignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentSignature
        fields = [
            'id', 'booking', 'consent_document', 'user',
            'signer_name', 'signed_at', 'ip_address', 'user_agent'
        ]
        read_only_fields = ['id', 'user', 'signed_at', 'ip_address', 'user_agent']


class BookingFormsStatusSerializer(serializers.Serializer):
    """Lightweight status of forms for a booking."""
    has_forms = serializers.BooleanField()
    consent_required = serializers.BooleanField()
    consent_signed = serializers.BooleanField()
    intake_completed = serializers.BooleanField()
    forms_url = serializers.CharField()
    forms = serializers.ListField(child=serializers.DictField())


# ── CRUD Serializers (for auto-generated OpenAPI schemas) ────────────────────

class IntakeResponseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating intake responses via standard CRUD."""
    from bookings.models import Booking
    booking_uuid = serializers.SlugRelatedField(
        slug_field='public_uuid',
        source='booking',
        queryset=Booking.objects.all(),
        write_only=True,
    )

    class Meta:
        model = IntakeResponse
        fields = [
            'id', 'public_uuid', 'booking_uuid', 'booking', 'form_template',
            'responses', 'submitted_at', 'is_prefilled', 'previous_response',
            'created_at'
        ]
        read_only_fields = [
            'id', 'public_uuid', 'booking', 'submitted_at',
            'is_prefilled', 'previous_response', 'created_at'
        ]


class ConsentSignatureCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating consent signatures via standard CRUD."""
    from bookings.models import Booking
    booking_uuid = serializers.SlugRelatedField(
        slug_field='public_uuid',
        source='booking',
        queryset=Booking.objects.all(),
        write_only=True,
    )

    class Meta:
        model = ConsentSignature
        fields = [
            'id', 'booking_uuid', 'booking', 'consent_document',
            'signer_name', 'signed_at', 'ip_address', 'user_agent'
        ]
        read_only_fields = ['id', 'booking', 'signed_at', 'ip_address', 'user_agent']


class FormQuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questions via standard CRUD."""
    class Meta:
        model = FormQuestion
        fields = ['id', 'template', 'question_type', 'label', 'help_text', 'is_required', 'options', 'order']
        read_only_fields = ['id']


class ConsentDocumentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating consent document versions via standard CRUD."""
    class Meta:
        model = ConsentDocument
        fields = ['id', 'template', 'legal_text', 'version', 'created_at']
        read_only_fields = ['id', 'version', 'created_at']
