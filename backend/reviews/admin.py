from django.contrib import admin
from utils.admin_base import BaseModelAdmin, BaseTabularInline
from .models import Review, ReviewQuestion, ReviewAnswer, ReviewVote, ReviewReport


class ReviewAnswerInline(BaseTabularInline):
    model = ReviewAnswer
    readonly_fields = ['id', 'created_at', 'updated_at']
    fields = ['question', 'rating_answer', 'text_answer', 'boolean_answer', 'created_at']
    extra = 0


class ReviewVoteInline(BaseTabularInline):
    model = ReviewVote
    readonly_fields = ['id', 'created_at', 'updated_at']
    fields = ['user', 'is_helpful', 'created_at']
    extra = 0


class ReviewReportInline(BaseTabularInline):
    model = ReviewReport
    readonly_fields = ['id', 'created_at', 'updated_at', 'resolved_at']
    fields = ['user', 'reason', 'details', 'is_resolved', 'resolved_by', 'created_at']
    extra = 0


@admin.register(Review)
class ReviewAdmin(BaseModelAdmin):
    list_display = ['public_uuid_short', 'user_email', 'practitioner_name', 'service_name', 
                   'rating', 'net_helpful_votes', 'is_published', 'created_at']
    list_filter = ['is_verified', 'is_published', 'is_anonymous', 'rating', 'created_at']
    search_fields = ['public_uuid', 'user__email', 'practitioner__user__email', 
                    'practitioner__display_name', 'comment']
    readonly_fields = ['id', 'public_uuid', 'created_at', 'updated_at', 'helpful_votes', 
                      'unhelpful_votes', 'reported_count', 'net_helpful_votes', 'display_name']
    date_hierarchy = 'created_at'
    
    fieldsets = [
        ('Review Information', {
            'fields': ['id', 'public_uuid', 'rating', 'comment']
        }),
        ('Relationships', {
            'fields': ['user', 'practitioner', 'service', 'booking']
        }),
        ('Status', {
            'fields': ['is_verified', 'is_published', 'is_anonymous', 'display_name']
        }),
        ('Engagement Metrics', {
            'fields': ['helpful_votes', 'unhelpful_votes', 'net_helpful_votes', 'reported_count'],
            'classes': ('collapse',)
        }),
        ('System Info', {
            'fields': ['created_at', 'updated_at'],
            'classes': ('collapse',)
        }),
    ]
    inlines = [ReviewAnswerInline, ReviewVoteInline, ReviewReportInline]
    
    def public_uuid_short(self, obj):
        return str(obj.public_uuid)[:8] + '...'
    public_uuid_short.short_description = 'Public UUID'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Reviewer Email'
    user_email.admin_order_field = 'user__email'
    
    def practitioner_name(self, obj):
        return str(obj.practitioner)
    practitioner_name.short_description = 'Practitioner'
    practitioner_name.admin_order_field = 'practitioner__display_name'
    
    def service_name(self, obj):
        return obj.service.name if obj.service else '-'
    service_name.short_description = 'Service'
    service_name.admin_order_field = 'service__name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'practitioner__user', 'service', 'booking'
        )


@admin.register(ReviewQuestion)
class ReviewQuestionAdmin(BaseModelAdmin):
    list_display = ['question', 'question_type', 'applies_to', 'is_required', 'order', 'is_active']
    list_filter = ['question_type', 'applies_to', 'is_required', 'is_active']
    search_fields = ['question', 'description']
    list_editable = ['order', 'is_active']
    ordering = ['order']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ReviewVote)
class ReviewVoteAdmin(BaseModelAdmin):
    list_display = ['review_info', 'user_email', 'is_helpful', 'created_at']
    list_filter = ['is_helpful', 'created_at']
    search_fields = ['review__public_uuid', 'user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    def review_info(self, obj):
        return f"Review {str(obj.review.public_uuid)[:8]}... - {obj.review.rating} stars"
    review_info.short_description = 'Review'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Voter'
    user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('review', 'user')


@admin.register(ReviewReport)
class ReviewReportAdmin(BaseModelAdmin):
    list_display = ['review_info', 'user_email', 'reason', 'is_resolved', 'created_at']
    list_filter = ['reason', 'is_resolved', 'created_at']
    search_fields = ['review__public_uuid', 'user__email', 'details']
    readonly_fields = ['id', 'created_at', 'updated_at', 'resolved_at']
    date_hierarchy = 'created_at'
    
    fieldsets = [
        ('Report Information', {
            'fields': ['review', 'user', 'reason', 'details']
        }),
        ('Resolution', {
            'fields': ['is_resolved', 'resolved_at', 'resolved_by', 'resolution_notes']
        }),
        ('System Info', {
            'fields': ['id', 'created_at', 'updated_at'],
            'classes': ('collapse',)
        }),
    ]
    
    def review_info(self, obj):
        return f"Review {str(obj.review.public_uuid)[:8]}... - {obj.review.rating} stars"
    review_info.short_description = 'Review'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Reporter'
    user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('review', 'user', 'resolved_by')
