from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
import boto3
from botocore.exceptions import ClientError
from typing import Tuple, Dict, Optional
from datetime import datetime, timedelta


class CloudflareR2Storage(S3Boto3Storage):
    """
    Custom storage backend for Cloudflare R2.
    
    This class extends the S3Boto3Storage backend to work with Cloudflare R2,
    which is compatible with the S3 API but has some differences.
    """
    def __init__(self, **kwargs):
        # Import settings here to avoid circular imports
        from django.conf import settings as django_settings
        
        # Override with Cloudflare R2 specific settings
        kwargs.update({
            'access_key': getattr(django_settings, 'CLOUDFLARE_R2_ACCESS_KEY_ID', ''),
            'secret_key': getattr(django_settings, 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', ''),
            'bucket_name': getattr(django_settings, 'CLOUDFLARE_R2_STORAGE_BUCKET_NAME', ''),
            'endpoint_url': getattr(django_settings, 'CLOUDFLARE_R2_ENDPOINT_URL', ''),
            'region_name': getattr(django_settings, 'CLOUDFLARE_R2_REGION_NAME', 'auto'),
            'custom_domain': getattr(django_settings, 'CLOUDFLARE_R2_CUSTOM_DOMAIN', None),
            'file_overwrite': True,
            'object_parameters': {'CacheControl': 'max-age=86400'},  # Cache for 24 hours by default
            'default_acl': None,  # R2 doesn't support ACLs
            'querystring_auth': False,  # Public URLs don't need auth
            'signature_version': 's3v4',
        })
        super().__init__(**kwargs)


class R2MediaStorage:
    """
    Media-specific storage handler for Cloudflare R2.
    
    This class provides media-specific functionality like generating pre-signed URLs,
    handling media uploads, and managing media files.
    """
    
    def __init__(self):
        self.access_key = settings.CLOUDFLARE_R2_ACCESS_KEY_ID
        self.secret_key = settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY
        self.bucket_name = settings.CLOUDFLARE_R2_STORAGE_BUCKET_NAME
        self.endpoint_url = settings.CLOUDFLARE_R2_ENDPOINT_URL
        self.region_name = settings.CLOUDFLARE_R2_REGION_NAME
        self.custom_domain = getattr(settings, 'CLOUDFLARE_R2_CUSTOM_DOMAIN', None)
        
        # Initialize S3 client
        self.client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            endpoint_url=self.endpoint_url,
            region_name=self.region_name,
        )
    
    def generate_upload_url(
        self, 
        key: str, 
        content_type: str,
        expires_in: int = 3600,
        metadata: Optional[Dict[str, str]] = None
    ) -> Tuple[str, Dict[str, str]]:
        """
        Generate a pre-signed URL for uploading media.
        
        Args:
            key: The object key/path in the bucket
            content_type: MIME type of the file
            expires_in: URL expiration time in seconds
            metadata: Optional metadata to attach to the object
            
        Returns:
            Tuple of (upload_url, headers_dict)
        """
        try:
            # Prepare parameters for presigned URL
            params = {
                'Bucket': self.bucket_name,
                'Key': key,
                'ContentType': content_type,
            }
            
            # Add metadata if provided
            if metadata:
                params['Metadata'] = metadata
            
            # Generate presigned URL
            url = self.client.generate_presigned_url(
                'put_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            # Return headers that should be included in the upload request
            headers = {
                'Content-Type': content_type,
            }
            
            return url, headers
            
        except ClientError as e:
            raise Exception(f"Failed to generate upload URL: {str(e)}")
    
    def get_public_url(self, key: str) -> str:
        """
        Get the public URL for accessing a media file.
        
        Args:
            key: The object key/path in the bucket
            
        Returns:
            Public URL string
        """
        if self.custom_domain:
            return f"https://{self.custom_domain}/{key}"
        else:
            # Use the R2 public URL format
            account_id = self.endpoint_url.split('//')[1].split('.')[0]
            return f"https://pub-{account_id}.r2.dev/{key}"
    
    def delete(self, key: str) -> bool:
        """
        Delete a media file from storage.
        
        Args:
            key: The object key/path in the bucket
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            print(f"Failed to delete object {key}: {str(e)}")
            return False
    
    def file_exists(self, key: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            key: The object key/path in the bucket
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def get_file_info(self, key: str) -> Optional[Dict[str, any]]:
        """
        Get information about a file in storage.
        
        Args:
            key: The object key/path in the bucket
            
        Returns:
            Dictionary with file info or None if not found
        """
        try:
            response = self.client.head_object(Bucket=self.bucket_name, Key=key)
            return {
                'size': response.get('ContentLength'),
                'content_type': response.get('ContentType'),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag'),
                'metadata': response.get('Metadata', {}),
            }
        except ClientError:
            return None