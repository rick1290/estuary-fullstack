from django.contrib import admin
from utils.admin_base import BaseModelAdmin, BaseTabularInline
from .models import Review, ReviewQuestion, ReviewAnswer, ReviewVote, ReviewReport


class ReviewAnswerInline(BaseTabularInline):
    model = ReviewAnswer
    readonly_fields = ['created_at']
    fields = ['question', 'rating_answer', 'text_answer', 'boolean_answer', 'created_at']


class ReviewVoteInline(BaseTabularInline):
    model = ReviewVote
    readonly_fields = ['created_at']
    fields = ['user', 'is_helpful', 'created_at']
    extra = 0


class ReviewReportInline(BaseTabularInline):
    model = ReviewReport
    readonly_fields = ['created_at']
    fields = ['user', 'reason', 'details', 'is_resolved', 'created_at']
    extra = 0


@admin.register(Review)
class ReviewAdmin(BaseModelAdmin):
    list_display = ['id', 'user', 'practitioner', 'service', 'rating', 'created_at', 'is_verified', 'is_published']
    list_filter = ['is_verified', 'is_published', 'is_anonymous', 'created_at']
    search_fields = ['user__username', 'user__email', 'practitioner__user__username', 'comment']
    readonly_fields = ['created_at', 'updated_at', 'helpful_votes', 'unhelpful_votes', 'reported_count']
    fieldsets = [
        (None, {
            'fields': ['user', 'practitioner', 'service', 'booking', 'rating', 'comment']
        }),
        ('Status', {
            'fields': ['is_verified', 'is_published', 'is_anonymous']
        }),
        ('Statistics', {
            'fields': ['helpful_votes', 'unhelpful_votes', 'reported_count', 'created_at', 'updated_at']
        }),
    ]
    inlines = [ReviewAnswerInline, ReviewVoteInline, ReviewReportInline]


@admin.register(ReviewQuestion)
class ReviewQuestionAdmin(BaseModelAdmin):
    list_display = ['question', 'question_type', 'applies_to', 'is_required', 'order', 'is_active']
    list_filter = ['question_type', 'applies_to', 'is_required', 'is_active']
    search_fields = ['question', 'description']
    list_editable = ['order', 'is_active']
    ordering = ['order']


@admin.register(ReviewReport)
class ReviewReportAdmin(BaseModelAdmin):
    list_display = ['id', 'review', 'user', 'reason', 'created_at', 'is_resolved']
    list_filter = ['reason', 'is_resolved', 'created_at']
    search_fields = ['review__comment', 'user__username', 'details']
    readonly_fields = ['created_at']
    fieldsets = [
        (None, {
            'fields': ['review', 'user', 'reason', 'details']
        }),
        ('Resolution', {
            'fields': ['is_resolved', 'resolved_at', 'resolution_notes']
        }),
    ]
