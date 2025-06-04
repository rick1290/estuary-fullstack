"""
Decorators for Temporal workflows and activities.

This module provides decorators for creating Temporal workflows and activities
with standardized logging, error handling, and monitoring.
"""
import functools
import logging
import time
import traceback
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar, cast

from temporalio import activity, workflow

logger = logging.getLogger(__name__)


def monitored_workflow(name: Optional[str] = None, version: Optional[str] = None):
    """
    Decorator for monitoring Temporal workflows.
    
    This decorator adds standardized logging, error handling, and monitoring
    to Temporal workflows.
    
    Args:
        name: Optional name for the workflow
        version: Optional version for the workflow
        
    Returns:
        Decorated workflow class
    """
    def decorator(cls):
        # Apply the Temporal workflow decorator
        workflow_cls = workflow.defn(name=name, version=version)(cls)
        
        # Get the original run method
        original_run = workflow_cls.run
        
        # Define a new run method with monitoring
        @functools.wraps(original_run)
        async def monitored_run(self, *args, **kwargs):
            workflow_id = workflow.info().workflow_id
            workflow_type = workflow.info().workflow_type
            start_time = time.time()
            
            workflow.logger.info(
                f"Starting workflow {workflow_type} (ID: {workflow_id}) "
                f"with args={args} kwargs={kwargs}"
            )
            
            try:
                # Run the original method
                result = await original_run(self, *args, **kwargs)
                
                # Log the result
                duration = time.time() - start_time
                workflow.logger.info(
                    f"Workflow {workflow_type} (ID: {workflow_id}) completed successfully "
                    f"in {duration:.2f}s"
                )
                
                return result
            except Exception as e:
                # Log the error
                duration = time.time() - start_time
                workflow.logger.error(
                    f"Workflow {workflow_type} (ID: {workflow_id}) failed after {duration:.2f}s: {str(e)}"
                )
                
                # Re-raise the exception
                raise
        
        # Replace the run method
        workflow_cls.run = monitored_run
        
        return workflow_cls
    
    return decorator


def monitored_activity(name: Optional[str] = None, version: Optional[str] = None):
    """
    Decorator for monitoring Temporal activities.
    
    This decorator adds standardized logging, error handling, and monitoring
    to Temporal activities.
    
    Args:
        name: Optional name for the activity
        version: Optional version for the activity
        
    Returns:
        Decorated activity function
    """
    def decorator(func):
        # Apply the Temporal activity decorator
        activity_func = activity.defn(name=name, version=version)(func)
        
        @functools.wraps(activity_func)
        async def wrapper(*args, **kwargs):
            activity_type = activity.info().activity_type
            start_time = time.time()
            
            activity.logger.info(
                f"Starting activity {activity_type} with args={args} kwargs={kwargs}"
            )
            
            try:
                # Run the original function
                result = await activity_func(*args, **kwargs)
                
                # Log the result
                duration = time.time() - start_time
                activity.logger.info(
                    f"Activity {activity_type} completed successfully in {duration:.2f}s"
                )
                
                return result
            except Exception as e:
                # Log the error
                duration = time.time() - start_time
                activity.logger.error(
                    f"Activity {activity_type} failed after {duration:.2f}s: {str(e)}\n"
                    f"{traceback.format_exc()}"
                )
                
                # Re-raise the exception
                raise
        
        return wrapper
    
    return decorator


def retry_on_exception(
    max_attempts: int = 3,
    exceptions: List[Type[Exception]] = None,
    delay_seconds: float = 1.0,
    backoff_factor: float = 2.0,
):
    """
    Decorator for retrying a function on exception.
    
    This decorator can be used with both regular functions and Temporal activities.
    
    Args:
        max_attempts: Maximum number of attempts
        exceptions: List of exceptions to retry on (defaults to Exception)
        delay_seconds: Initial delay between retries in seconds
        backoff_factor: Factor to increase delay by after each attempt
        
    Returns:
        Decorated function
    """
    if exceptions is None:
        exceptions = [Exception]
    
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            delay = delay_seconds
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except tuple(exceptions) as e:
                    last_exception = e
                    
                    # Log the error
                    logger.warning(
                        f"Attempt {attempt}/{max_attempts} failed for {func.__name__}: {str(e)}"
                    )
                    
                    if attempt < max_attempts:
                        # Sleep before retrying
                        logger.info(f"Retrying in {delay:.2f}s...")
                        
                        # Use the appropriate sleep function
                        if hasattr(workflow, "sleep"):
                            # We're in a workflow
                            from datetime import timedelta
                            await workflow.sleep(timedelta(seconds=delay))
                        else:
                            # We're in an activity or regular function
                            import asyncio
                            await asyncio.sleep(delay)
                        
                        # Increase the delay for the next attempt
                        delay *= backoff_factor
                    else:
                        # Log the final failure
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}: {str(e)}"
                        )
            
            # Re-raise the last exception
            raise last_exception
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None
            delay = delay_seconds
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except tuple(exceptions) as e:
                    last_exception = e
                    
                    # Log the error
                    logger.warning(
                        f"Attempt {attempt}/{max_attempts} failed for {func.__name__}: {str(e)}"
                    )
                    
                    if attempt < max_attempts:
                        # Sleep before retrying
                        logger.info(f"Retrying in {delay:.2f}s...")
                        time.sleep(delay)
                        
                        # Increase the delay for the next attempt
                        delay *= backoff_factor
                    else:
                        # Log the final failure
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}: {str(e)}"
                        )
            
            # Re-raise the last exception
            raise last_exception
        
        # Check if the function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
