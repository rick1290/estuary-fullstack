"""
Base classes and utilities for Temporal activities.

This module provides base classes and utilities for creating Temporal activities
across different apps in the Estuary platform.
"""
import functools
import logging
import traceback
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar, cast

from django.db import transaction
from temporalio import activity

logger = logging.getLogger(__name__)


def django_activity(func: Callable) -> Callable:
    """
    Decorator for Temporal activities that interact with Django models.
    
    This decorator ensures that the activity is executed in a thread and
    handles Django's synchronous ORM appropriately.
    
    Args:
        func: The activity function to decorate
        
    Returns:
        The decorated function
    """
    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        activity_name = func.__name__
        activity.logger.info(f"Starting Django activity: {activity_name}")
        
        try:
            # Execute the function in a thread since Django ORM is synchronous
            result = await activity.execute_in_thread(func, *args, **kwargs)
            activity.logger.info(f"Django activity {activity_name} completed successfully")
            return result
        except Exception as e:
            activity.logger.error(
                f"Django activity {activity_name} failed: {str(e)}\n{traceback.format_exc()}"
            )
            # Re-raise as ApplicationError for better handling in workflows
            raise activity.ApplicationError(
                f"Activity {activity_name} failed: {str(e)}"
            ) from e
    
    return wrapper


def transactional_activity(func: Callable) -> Callable:
    """
    Decorator for Temporal activities that require database transactions.
    
    This decorator ensures that the activity is executed within a database
    transaction and rolls back if an exception occurs.
    
    Args:
        func: The activity function to decorate
        
    Returns:
        The decorated function
    """
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        activity_name = func.__name__
        logger.info(f"Starting transactional activity: {activity_name}")
        
        try:
            with transaction.atomic():
                result = func(*args, **kwargs)
                logger.info(f"Transactional activity {activity_name} committed successfully")
                return result
        except Exception as e:
            logger.error(
                f"Transactional activity {activity_name} rolled back: {str(e)}\n{traceback.format_exc()}"
            )
            raise
    
    return wrapper


def log_activity_result(func: Callable) -> Callable:
    """
    Decorator for logging activity results.
    
    This decorator logs the result of an activity for debugging purposes.
    
    Args:
        func: The activity function to decorate
        
    Returns:
        The decorated function
    """
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        activity_name = func.__name__
        logger.info(f"Executing activity: {activity_name}")
        
        try:
            result = func(*args, **kwargs)
            
            # Log the result, but be careful with sensitive data
            if isinstance(result, dict):
                # Remove sensitive fields
                safe_result = {k: v for k, v in result.items() if not _is_sensitive_field(k)}
                logger.info(f"Activity {activity_name} result: {safe_result}")
            else:
                logger.info(f"Activity {activity_name} completed successfully")
            
            return result
        except Exception as e:
            logger.error(f"Activity {activity_name} failed: {str(e)}")
            raise
    
    return wrapper


def _is_sensitive_field(field_name: str) -> bool:
    """
    Check if a field name might contain sensitive information.
    
    Args:
        field_name: The field name to check
        
    Returns:
        True if the field might contain sensitive information
    """
    sensitive_patterns = [
        "password", "secret", "token", "key", "auth", "credential",
        "ssn", "social", "credit", "card", "cvv", "security_code"
    ]
    
    return any(pattern in field_name.lower() for pattern in sensitive_patterns)


class ActivityResult:
    """Standard result format for activities."""
    
    def __init__(
        self,
        success: bool,
        entity_id: Optional[int] = None,
        entity_type: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        self.success = success
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.data = data or {}
        self.error = error
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "data": self.data,
            "error": self.error,
            "timestamp": self.timestamp,
        }


# Common activity utilities

@activity.defn
@django_activity
def record_workflow_event(
    workflow_id: str,
    workflow_type: str,
    event_type: str,
    entity_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Record a workflow event for auditing and debugging purposes.
    
    Args:
        workflow_id: The ID of the workflow
        workflow_type: The type of the workflow
        event_type: The type of event (started, completed, failed, etc.)
        entity_id: Optional ID of the entity being processed
        entity_type: Optional type of the entity being processed
        data: Optional additional data to record
        
    Returns:
        Dict with event recording results
    """
    # In a real implementation, you would record this in your database
    # For now, we'll just log it
    logger.info(
        f"WORKFLOW EVENT: {event_type} - {workflow_type} (ID: {workflow_id}) - "
        f"Entity: {entity_type} {entity_id} - Data: {data}"
    )
    
    return {
        "success": True,
        "workflow_id": workflow_id,
        "event_type": event_type,
        "timestamp": datetime.now().isoformat(),
    }


@activity.defn
@django_activity
def send_notification(
    user_id: int,
    notification_type: str,
    message: str,
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Send a notification to a user.
    
    Args:
        user_id: The ID of the user to notify
        notification_type: The type of notification
        message: The notification message
        data: Optional additional data for the notification
        
    Returns:
        Dict with notification results
    """
    # In a real implementation, you would use your notification service
    # For now, we'll just log it
    logger.info(
        f"NOTIFICATION: {notification_type} - User {user_id} - "
        f"Message: {message} - Data: {data}"
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "notification_type": notification_type,
        "timestamp": datetime.now().isoformat(),
    }
