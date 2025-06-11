#!/usr/bin/env python
"""
Test script to debug drf-spectacular schema generation
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from drf_spectacular.openapi import AutoSchema
from rest_framework import viewsets, serializers
from django.contrib.auth import get_user_model

User = get_user_model()

# Create a simple test serializer and viewset
class TestUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name']

class TestUserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = TestUserSerializer

# Try to generate schema for this viewset
try:
    viewset = TestUserViewSet()
    viewset.basename = 'test-user'
    viewset.action = 'list'
    
    schema = AutoSchema()
    schema.path = '/test-users/'
    schema.method = 'get'
    schema.view = viewset
    
    # Try to get the operation
    operation = schema.get_operation(path='/test-users/', method='GET')
    print("✅ Schema generation successful!")
    print(f"Operation: {operation}")
    
except Exception as e:
    print(f"❌ Schema generation failed: {e}")
    import traceback
    traceback.print_exc()