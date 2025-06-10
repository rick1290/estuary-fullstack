"""
Admin configuration for media models
"""
from django.contrib import admin
from django.utils.html import format_html
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import Media, MediaVariant, MediaProcessingJob


class MediaVariantInline(admin.TabularInline):
    """Inline admin for media variants"""
    model = MediaVariant
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('variant_name', 'file_url', 'width', 'height', 'file_size', 'format', 'created_at')


class MediaProcessingJobInline(admin.TabularInline):
    """Inline admin for media processing jobs"""
    model = MediaProcessingJob
    extra = 0
    readonly_fields = ('job_id', 'created_at', 'updated_at', 'started_at', 'completed_at')
    fields = ('job_id', 'status', 'operations', 'progress', 'current_operation', 
              'error_message', 'created_at')
    can_delete = False


# @admin.register(Media)
# class MediaAdmin(admin.ModelAdmin):
#     """Admin for Media model"""
#     list_display = ('id', 'public_uuid', 'thumbnail_preview', 'original_filename', 
#                    'media_type', 'status', 'content_object_display', 'is_primary', 
#                    'file_size_display', 'created_at')
#     list_filter = ('media_type', 'status', 'is_primary', 'created_at', 'content_type')
#     search_fields = ('original_filename', 'title', 'description', 'tags', 'public_uuid')
#     readonly_fields = ('public_uuid', 'upload_id', 'file_preview', 'metadata_display', 
#                       'created_at', 'updated_at', 'deleted_at')
#     
#     fieldsets = (
#         ('File Information', {
#             'fields': ('file_url', 'thumbnail_url', 'original_filename', 
#                       'file_size', 'mime_type', 'media_type', 'file_preview')
#         }),
#         ('Content Association', {
#             'fields': ('content_type', 'object_id', 'content_object_display')
#         }),
#         ('Metadata', {
#             'fields': ('title', 'description', 'alt_text', 'tags', 'metadata_display')
#         }),
#         ('Status', {
#             'fields': ('status', 'processing_data', 'is_primary', 'order')
#         }),
#         ('Tracking', {
#             'fields': ('public_uuid', 'upload_id', 'uploaded_by', 
#                       'created_at', 'updated_at', 'is_deleted', 'deleted_at')
#         }),
#     )
#     
#     inlines = [MediaVariantInline, MediaProcessingJobInline]
#     
#     def thumbnail_preview(self, obj):
#         """Display thumbnail preview in list"""
#         if obj.thumbnail_url:
#             return format_html(
#                 '<img src="{}" style="max-width: 100px; max-height: 100px;" />',
#                 obj.thumbnail_url
#             )
#         elif obj.media_type == 'image' and obj.file_url:
#             return format_html(
#                 '<img src="{}" style="max-width: 100px; max-height: 100px;" />',
#                 obj.file_url
#             )
#         return '-'
#     thumbnail_preview.short_description = 'Preview'
#     
#     def file_preview(self, obj):
#         """Display file preview in detail view"""
#         if obj.media_type == 'image' and obj.file_url:
#             return format_html(
#                 '<img src="{}" style="max-width: 500px; max-height: 500px;" />',
#                 obj.file_url
#             )
#         elif obj.media_type == 'video' and obj.file_url:
#             return format_html(
#                 '<video controls style="max-width: 500px; max-height: 500px;">'
#                 '<source src="{}" type="{}">'
#                 'Your browser does not support the video tag.'
#                 '</video>',
#                 obj.file_url, obj.mime_type
#             )
#         elif obj.file_url:
#             return format_html('<a href="{}" target="_blank">View File</a>', obj.file_url)
#         return '-'
#     file_preview.short_description = 'File Preview'
#     
#     def content_object_display(self, obj):
#         """Display the content object"""
#         if obj.content_object:
#             return f"{obj.content_type.model}: {obj.content_object}"
#         return '-'
#     content_object_display.short_description = 'Associated With'
#     
#     def file_size_display(self, obj):
#         """Display file size in human-readable format"""
#         size = obj.file_size
#         for unit in ['B', 'KB', 'MB', 'GB']:
#             if size < 1024.0:
#                 return f"{size:.1f} {unit}"
#             size /= 1024.0
#         return f"{size:.1f} TB"
#     file_size_display.short_description = 'File Size'
#     
#     def metadata_display(self, obj):
#         """Display metadata in formatted way"""
#         import json
#         return format_html(
#             '<pre style="white-space: pre-wrap;">{}</pre>',
#             json.dumps(obj.metadata, indent=2)
#         )
#     metadata_display.short_description = 'Metadata'
#     
#     actions = ['mark_as_primary', 'reprocess_media']
#     
#     def mark_as_primary(self, request, queryset):
#         """Mark selected media as primary"""
#         for media in queryset:
#             media.is_primary = True
#             media.save()
#         self.message_user(request, f"{queryset.count()} media marked as primary.")
#     mark_as_primary.short_description = "Mark as primary"
#     
#     def reprocess_media(self, request, queryset):
#         """Trigger reprocessing of media"""
#         for media in queryset:
#             # Create a new processing job
#             MediaProcessingJob.objects.create(
#                 media=media,
#                 operations=['optimize', 'generate_thumbnails'],
#                 options={'quality': 85}
#             )
#         self.message_user(request, f"{queryset.count()} media queued for reprocessing.")
#     reprocess_media.short_description = "Reprocess media"


# @admin.register(MediaVariant)
# class MediaVariantAdmin(admin.ModelAdmin):
#     """Admin for MediaVariant model"""
#     list_display = ('id', 'media', 'variant_name', 'dimensions', 'file_size_display', 
#                    'format', 'created_at')
#     list_filter = ('variant_name', 'format', 'created_at')
#     search_fields = ('media__original_filename', 'variant_name')
#     readonly_fields = ('created_at',)
#     
#     def dimensions(self, obj):
#         """Display dimensions"""
#         if obj.width and obj.height:
#             return f"{obj.width}x{obj.height}"
#         return '-'
#     dimensions.short_description = 'Dimensions'
#     
#     def file_size_display(self, obj):
#         """Display file size in human-readable format"""
#         size = obj.file_size
#         for unit in ['B', 'KB', 'MB', 'GB']:
#             if size < 1024.0:
#                 return f"{size:.1f} {unit}"
#             size /= 1024.0
#         return f"{size:.1f} TB"
#     file_size_display.short_description = 'File Size'


@admin.register(MediaProcessingJob)
class MediaProcessingJobAdmin(admin.ModelAdmin):
    """Admin for MediaProcessingJob model"""
    list_display = ('id', 'job_id', 'media', 'status', 'progress_display', 
                   'current_operation', 'created_at', 'duration')
    list_filter = ('status', 'created_at', 'operations')
    search_fields = ('job_id', 'media__original_filename', 'error_message')
    readonly_fields = ('job_id', 'created_at', 'updated_at', 'started_at', 
                      'completed_at', 'duration')
    
    fieldsets = (
        ('Job Information', {
            'fields': ('job_id', 'media', 'status', 'progress', 'current_operation')
        }),
        ('Operations', {
            'fields': ('operations', 'completed_operations', 'options')
        }),
        ('Status', {
            'fields': ('error_message',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at', 'duration')
        }),
    )
    
    def progress_display(self, obj):
        """Display progress bar"""
        return format_html(
            '<div style="width: 100px; height: 20px; background-color: #f0f0f0; '
            'border: 1px solid #ccc; position: relative;">'
            '<div style="width: {}%; height: 100%; background-color: #4CAF50;"></div>'
            '<span style="position: absolute; left: 50%; top: 50%; transform: '
            'translate(-50%, -50%); font-size: 12px;">{:.0f}%</span>'
            '</div>',
            obj.progress, obj.progress
        )
    progress_display.short_description = 'Progress'
    
    def duration(self, obj):
        """Calculate and display job duration"""
        if obj.started_at and obj.completed_at:
            duration = obj.completed_at - obj.started_at
            return str(duration).split('.')[0]  # Remove microseconds
        return '-'
    duration.short_description = 'Duration'
    
    actions = ['retry_failed_jobs', 'cancel_jobs']
    
    def retry_failed_jobs(self, request, queryset):
        """Retry failed jobs"""
        failed_jobs = queryset.filter(status=MediaProcessingJob.JobStatus.FAILED)
        for job in failed_jobs:
            job.status = MediaProcessingJob.JobStatus.QUEUED
            job.error_message = None
            job.progress = 0
            job.save()
        self.message_user(request, f"{failed_jobs.count()} failed jobs queued for retry.")
    retry_failed_jobs.short_description = "Retry failed jobs"
    
    def cancel_jobs(self, request, queryset):
        """Cancel pending/processing jobs"""
        active_jobs = queryset.filter(
            status__in=[MediaProcessingJob.JobStatus.QUEUED, 
                       MediaProcessingJob.JobStatus.PROCESSING]
        )
        active_jobs.update(status=MediaProcessingJob.JobStatus.CANCELLED)
        self.message_user(request, f"{active_jobs.count()} jobs cancelled.")
    cancel_jobs.short_description = "Cancel jobs"


# Generic inline for adding media to other models
class MediaInline(GenericTabularInline):
    """Generic inline for media that can be added to any model"""
    model = Media
    extra = 0
    fields = ('thumbnail_preview', 'original_filename', 'media_type', 'status', 
             'is_primary', 'order')
    readonly_fields = ('thumbnail_preview', 'media_type', 'status')
    
    def thumbnail_preview(self, obj):
        """Display thumbnail preview"""
        if obj.thumbnail_url:
            return format_html(
                '<img src="{}" style="max-width: 50px; max-height: 50px;" />',
                obj.thumbnail_url
            )
        elif obj.media_type == 'image' and obj.file_url:
            return format_html(
                '<img src="{}" style="max-width: 50px; max-height: 50px;" />',
                obj.file_url
            )
        return '-'
    thumbnail_preview.short_description = 'Preview'