"""
Utility functions for Temporal integration.

This module provides utility functions for working with Temporal workflows
and activities across the Estuary platform.
"""
import asyncio
import functools
import importlib
import inspect
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Type, Union

from django.conf import settings
from temporalio.client import Client, WorkflowHandle

from apps.integrations.temporal.client import get_temporal_client

logger = logging.getLogger(__name__)


async def start_workflow(
    workflow_name: str,
    args: Optional[List[Any]] = None,
    kwargs: Optional[Dict[str, Any]] = None,
    workflow_id: Optional[str] = None,
    task_queue: Optional[str] = None,
    domain: Optional[str] = None,
    execution_timeout: Optional[timedelta] = None,
    run_timeout: Optional[timedelta] = None,
    wait_for_result: bool = False,
    result_timeout: Optional[timedelta] = None,
) -> Union[WorkflowHandle, Any]:
    """
    Start a Temporal workflow.
    
    Args:
        workflow_name: Name of the workflow to start
        args: Positional arguments to pass to the workflow
        kwargs: Keyword arguments to pass to the workflow
        workflow_id: Optional custom workflow ID
        task_queue: Task queue to use (defaults to 'default')
        domain: Domain of the workflow (for logging purposes)
        execution_timeout: Maximum time the entire workflow execution can run
        run_timeout: Maximum time a single workflow run can execute
        wait_for_result: Whether to wait for the workflow to complete
        result_timeout: Timeout for waiting for the result
        
    Returns:
        WorkflowHandle if wait_for_result is False, otherwise the workflow result
    """
    # Get the Temporal client
    client = await get_temporal_client()
    
    # Set default task queue
    if task_queue is None:
        task_queue = getattr(settings, "TEMPORAL_DEFAULT_TASK_QUEUE", "default")
    
    # Generate a unique workflow ID if not provided
    if workflow_id is None:
        workflow_id = f"{domain or 'estuary'}-{workflow_name}-{uuid.uuid4()}-{int(time.time())}"
    
    # Set default args and kwargs
    args = args or []
    kwargs = kwargs or {}
    
    # Log the workflow start
    domain_str = f" in domain {domain}" if domain else ""
    logger.info(
        f"Starting workflow {workflow_name}{domain_str} with ID {workflow_id} "
        f"on task queue {task_queue}"
    )
    
    # Start the workflow
    handle = await client.start_workflow(
        f"{workflow_name}.run",
        args=args,
        kwargs=kwargs,
        id=workflow_id,
        task_queue=task_queue,
        execution_timeout=execution_timeout,
        run_timeout=run_timeout,
    )
    
    logger.info(f"Workflow {workflow_name} started with ID {workflow_id}")
    
    if wait_for_result:
        logger.info(f"Waiting for workflow {workflow_id} to complete...")
        result = await handle.result(timeout=result_timeout)
        logger.info(f"Workflow {workflow_id} completed with result: {result}")
        return result
    
    return handle


async def get_workflow_status(workflow_id: str) -> Dict[str, Any]:
    """
    Get the status of a workflow.
    
    Args:
        workflow_id: ID of the workflow
        
    Returns:
        Dict with workflow status information
    """
    # Get the Temporal client
    client = await get_temporal_client()
    
    try:
        # Get the workflow handle
        handle = client.get_workflow_handle(workflow_id)
        
        # Get the workflow description
        desc = await handle.describe()
        
        # Format the result
        result = {
            "workflow_id": workflow_id,
            "run_id": desc.run_id,
            "workflow_type": desc.workflow_type.name,
            "status": desc.status.name,
            "start_time": desc.start_time.isoformat() if desc.start_time else None,
            "close_time": desc.close_time.isoformat() if desc.close_time else None,
            "execution_time": (
                (desc.close_time - desc.start_time).total_seconds()
                if desc.close_time and desc.start_time
                else None
            ),
            "task_queue": desc.task_queue,
        }
        
        return result
    except Exception as e:
        logger.error(f"Error getting workflow status for {workflow_id}: {str(e)}")
        return {
            "workflow_id": workflow_id,
            "error": str(e),
        }


async def terminate_workflow(workflow_id: str, reason: str = "Terminated by user") -> Dict[str, Any]:
    """
    Terminate a workflow.
    
    Args:
        workflow_id: ID of the workflow to terminate
        reason: Reason for termination
        
    Returns:
        Dict with termination result
    """
    # Get the Temporal client
    client = await get_temporal_client()
    
    try:
        # Get the workflow handle
        handle = client.get_workflow_handle(workflow_id)
        
        # Terminate the workflow
        await handle.terminate(reason=reason)
        
        return {
            "workflow_id": workflow_id,
            "success": True,
            "message": f"Workflow terminated: {reason}",
        }
    except Exception as e:
        logger.error(f"Error terminating workflow {workflow_id}: {str(e)}")
        return {
            "workflow_id": workflow_id,
            "success": False,
            "error": str(e),
        }


def get_workflow_class(workflow_name: str, domain: str) -> Optional[Type]:
    """
    Get a workflow class by name and domain.
    
    Args:
        workflow_name: Name of the workflow class
        domain: Domain of the workflow
        
    Returns:
        Workflow class if found, None otherwise
    """
    try:
        # Import the workflow module
        module = importlib.import_module(f"apps.{domain}.temporal_workflows")
        
        # Find the workflow class
        for name, obj in inspect.getmembers(module):
            if (inspect.isclass(obj) and 
                hasattr(obj, '__temporal_workflow_definition__') and
                name == workflow_name):
                return obj
        
        return None
    except ImportError:
        logger.error(f"No temporal_workflows module found for domain {domain}")
        return None
    except Exception as e:
        logger.error(f"Error getting workflow class {workflow_name} in domain {domain}: {str(e)}")
        return None


def get_activity_function(activity_name: str, domain: str) -> Optional[Callable]:
    """
    Get an activity function by name and domain.
    
    Args:
        activity_name: Name of the activity function
        domain: Domain of the activity
        
    Returns:
        Activity function if found, None otherwise
    """
    try:
        # Import the activity module
        module = importlib.import_module(f"apps.{domain}.temporal_activities")
        
        # Find the activity function
        for name, obj in inspect.getmembers(module):
            if (inspect.isfunction(obj) and 
                hasattr(obj, '__temporal_activity_definition__') and
                name == activity_name):
                return obj
        
        return None
    except ImportError:
        logger.error(f"No temporal_activities module found for domain {domain}")
        return None
    except Exception as e:
        logger.error(f"Error getting activity function {activity_name} in domain {domain}: {str(e)}")
        return None
