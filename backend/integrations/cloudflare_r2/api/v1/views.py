from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.integrations.cloudflare_r2.utils import (
    upload_file_to_r2, 
    delete_file_from_r2, 
    upload_practitioner_profile_image,
    upload_practitioner_profile_video
)
from .serializers import (
    FileUploadSerializer, 
    FileDeleteSerializer, 
    PractitionerProfileImageUploadSerializer,
    PractitionerProfileVideoUploadSerializer
)


class FileUploadView(APIView):
    """
    API view for uploading files to Cloudflare R2.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        request=FileUploadSerializer,
        responses={201: OpenApiResponse(description="Returns the URL of the uploaded file")},
        description="Upload a file to Cloudflare R2 storage"
    )
    def post(self, request, *args, **kwargs):
        serializer = FileUploadSerializer(data=request.data)
        if serializer.is_valid():
            file = serializer.validated_data['file']
            directory = serializer.validated_data.get('directory', 'uploads')
            
            try:
                url = upload_file_to_r2(file, directory)
                return Response({'url': url}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PractitionerProfileImageUploadView(APIView):
    """
    API view for uploading practitioner profile images to Cloudflare R2.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        request=PractitionerProfileImageUploadSerializer,
        responses={201: OpenApiResponse(description="Returns the URL of the uploaded image")},
        description="Upload a practitioner profile image to Cloudflare R2 storage"
    )
    def post(self, request, *args, **kwargs):
        serializer = PractitionerProfileImageUploadSerializer(data=request.data)
        if serializer.is_valid():
            image = serializer.validated_data['image']
            practitioner_id = serializer.validated_data['practitioner_id']
            
            try:
                url = upload_practitioner_profile_image(image, practitioner_id)
                return Response({'url': url}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileDeleteView(APIView):
    """
    API view for deleting files from Cloudflare R2.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=FileDeleteSerializer,
        responses={204: OpenApiResponse(description="File deleted successfully")},
        description="Delete a file from Cloudflare R2 storage"
    )
    def post(self, request, *args, **kwargs):
        serializer = FileDeleteSerializer(data=request.data)
        if serializer.is_valid():
            file_path = serializer.validated_data['file_path']
            
            try:
                success = delete_file_from_r2(file_path)
                if success:
                    return Response(status=status.HTTP_204_NO_CONTENT)
                return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PractitionerProfileVideoUploadView(APIView):
    """
    API view for uploading practitioner profile videos to Cloudflare R2 with size limit.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        request=PractitionerProfileVideoUploadSerializer,
        responses={
            201: OpenApiResponse(description="Returns the URL of the uploaded video"),
            400: OpenApiResponse(description="Bad request, validation error or file size exceeded"),
        },
        description="Upload a practitioner profile video to Cloudflare R2 storage (max 100MB)"
    )
    def post(self, request, *args, **kwargs):
        serializer = PractitionerProfileVideoUploadSerializer(data=request.data)
        if serializer.is_valid():
            video = serializer.validated_data['video']
            practitioner_id = serializer.validated_data['practitioner_id']
            
            try:
                # Default max size is 100MB, defined in the utility function
                url = upload_practitioner_profile_video(video, practitioner_id)
                return Response({'url': url}, status=status.HTTP_201_CREATED)
            except ValueError as e:
                # This catches the file size exceeded error
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)