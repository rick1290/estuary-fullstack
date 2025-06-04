from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class CloudflareR2Storage(S3Boto3Storage):
    """
    Custom storage backend for Cloudflare R2.
    
    This class extends the S3Boto3Storage backend to work with Cloudflare R2,
    which is compatible with the S3 API but has some differences.
    """
    access_key = settings.CLOUDFLARE_R2_ACCESS_KEY_ID
    secret_key = settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    bucket_name = settings.CLOUDFLARE_R2_STORAGE_BUCKET_NAME
    endpoint_url = settings.CLOUDFLARE_R2_ENDPOINT_URL
    region_name = settings.CLOUDFLARE_R2_REGION_NAME
    custom_domain = settings.CLOUDFLARE_R2_CUSTOM_DOMAIN if hasattr(settings, 'CLOUDFLARE_R2_CUSTOM_DOMAIN') else None
    file_overwrite = True
    object_parameters = {'CacheControl': 'max-age=86400'}  # Cache for 24 hours by default