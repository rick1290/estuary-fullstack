"""
Service-related enums for better type safety and OpenAPI generation
"""
from django.db import models


class ServiceTypeEnum(models.TextChoices):
    """
    Enum for service types matching ServiceType.code field
    """
    SESSION = 'session', 'Session'
    WORKSHOP = 'workshop', 'Workshop'
    COURSE = 'course', 'Course'
    PACKAGE = 'package', 'Package'
    BUNDLE = 'bundle', 'Bundle'


class ServiceStatusEnum(models.TextChoices):
    """
    Enum for service status
    """
    DRAFT = 'draft', 'Draft'
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    ARCHIVED = 'archived', 'Archived'