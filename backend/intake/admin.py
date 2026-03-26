from django.contrib import admin
from .models import FormTemplate, FormQuestion, ConsentDocument, ServiceForm, IntakeResponse, ConsentSignature


class FormQuestionInline(admin.TabularInline):
    model = FormQuestion
    extra = 1
    ordering = ['order']


class ConsentDocumentInline(admin.TabularInline):
    model = ConsentDocument
    extra = 0
    readonly_fields = ['version', 'created_at']


@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ['title', 'form_type', 'practitioner', 'is_platform_template', 'is_active']
    list_filter = ['form_type', 'is_platform_template', 'is_active']
    search_fields = ['title']
    inlines = [FormQuestionInline, ConsentDocumentInline]


@admin.register(ServiceForm)
class ServiceFormAdmin(admin.ModelAdmin):
    list_display = ['service', 'form_template', 'is_required', 'order']
    list_filter = ['is_required']


@admin.register(IntakeResponse)
class IntakeResponseAdmin(admin.ModelAdmin):
    list_display = ['user', 'booking', 'form_template', 'submitted_at', 'is_prefilled']
    list_filter = ['is_prefilled']
    readonly_fields = ['submitted_at']


@admin.register(ConsentSignature)
class ConsentSignatureAdmin(admin.ModelAdmin):
    list_display = ['signer_name', 'user', 'booking', 'consent_document', 'signed_at']
    readonly_fields = ['signed_at', 'ip_address', 'user_agent']
