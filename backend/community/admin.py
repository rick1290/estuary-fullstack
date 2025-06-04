from django.contrib import admin
from .models import Post, PostComment, PostReaction, PostPurchaseVisibility, CommunityFollow, CommunityTopic


class PostPurchaseVisibilityInline(admin.TabularInline):
    model = PostPurchaseVisibility
    extra = 1


class PostCommentInline(admin.TabularInline):
    model = PostComment
    extra = 0
    readonly_fields = ['user', 'content', 'created_at']
    fields = ['user', 'content', 'created_at', 'is_hidden']
    can_delete = False
    show_change_link = True
    

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['id', 'practitioner', 'title', 'visibility', 'created_at', 'like_count', 'comment_count', 'is_pinned', 'is_featured']
    list_filter = ['visibility', 'is_pinned', 'is_featured', 'is_archived', 'created_at', 'topics']
    search_fields = ['title', 'content', 'practitioner__user__email', 'practitioner__display_name']
    readonly_fields = ['like_count', 'heart_count', 'comment_count', 'created_at', 'updated_at']
    inlines = [PostPurchaseVisibilityInline, PostCommentInline]
    actions = ['pin_posts', 'unpin_posts', 'feature_posts', 'unfeature_posts', 'archive_posts', 'unarchive_posts']
    filter_horizontal = ['topics']
    
    def pin_posts(self, request, queryset):
        queryset.update(is_pinned=True)
    pin_posts.short_description = "Pin selected posts"
    
    def unpin_posts(self, request, queryset):
        queryset.update(is_pinned=False)
    unpin_posts.short_description = "Unpin selected posts"
    
    def feature_posts(self, request, queryset):
        queryset.update(is_featured=True)
    feature_posts.short_description = "Feature selected posts"
    
    def unfeature_posts(self, request, queryset):
        queryset.update(is_featured=False)
    unfeature_posts.short_description = "Unfeature selected posts"
    
    def archive_posts(self, request, queryset):
        queryset.update(is_archived=True)
    archive_posts.short_description = "Archive selected posts"
    
    def unarchive_posts(self, request, queryset):
        queryset.update(is_archived=False)
    unarchive_posts.short_description = "Unarchive selected posts"


@admin.register(PostComment)
class PostCommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'post', 'user', 'content_preview', 'created_at', 'is_hidden']
    list_filter = ['is_hidden', 'created_at']
    search_fields = ['content', 'user__email', 'post__title', 'post__content']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['hide_comments', 'unhide_comments']
    
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = "Content"
    
    def hide_comments(self, request, queryset):
        queryset.update(is_hidden=True)
    hide_comments.short_description = "Hide selected comments"
    
    def unhide_comments(self, request, queryset):
        queryset.update(is_hidden=False)
    unhide_comments.short_description = "Unhide selected comments"


@admin.register(PostReaction)
class PostReactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'post', 'user', 'reaction_type', 'created_at']
    list_filter = ['reaction_type', 'created_at']
    search_fields = ['user__email', 'post__title', 'post__content']
    readonly_fields = ['created_at']


@admin.register(CommunityFollow)
class CommunityFollowAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'practitioner', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'practitioner__user__email', 'practitioner__display_name']
    readonly_fields = ['created_at']


@admin.register(CommunityTopic)
class CommunityTopicAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug', 'post_count', 'is_featured', 'created_at']
    list_filter = ['is_featured', 'created_at']
    search_fields = ['name', 'slug', 'description']
    readonly_fields = ['post_count', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    actions = ['feature_topics', 'unfeature_topics']
    
    def feature_topics(self, request, queryset):
        queryset.update(is_featured=True)
    feature_topics.short_description = "Feature selected topics"
    
    def unfeature_topics(self, request, queryset):
        queryset.update(is_featured=False)
    unfeature_topics.short_description = "Unfeature selected topics"
