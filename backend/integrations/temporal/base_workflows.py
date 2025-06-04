"""
Base classes and utilities for Temporal workflows.

This module provides base classes and utilities for creating Temporal workflows
across different apps in the Estuary platform.
"""
import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Union

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError, FailureError
from temporalio.workflow import execute_activity, sleep

logger = logging.getLogger(__name__)

# Define standard retry policies that can be used across workflows
STANDARD_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    maximum_interval=timedelta(minutes=10),
    maximum_attempts=10,
    coefficient=2.0,
)

PAYMENT_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(minutes=5),
    maximum_interval=timedelta(hours=24),
    maximum_attempts=20,
    coefficient=2.0,
)

INTEGRATION_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(seconds=5),
    maximum_interval=timedelta(minutes=30),
    maximum_attempts=50,
    coefficient=2.0,
)

# No retry policy for activities that should never be retried
NO_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    maximum_interval=timedelta(seconds=1),
    maximum_attempts=1,
    coefficient=1.0,
)


class WorkflowResult:
    """Standard result format for workflows."""
    
    def __init__(
        self,
        success: bool,
        entity_id: Optional[Union[int, str]] = None,
        entity_type: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        self.success = success
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.result = result or {}
        self.error = error
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "result": self.result,
            "error": self.error,
        }


T = TypeVar('T')


@workflow.defn
class BaseWorkflow(Generic[T]):
    """Base class for all Estuary workflows."""
    
    @workflow.run
    async def run(self, *args, **kwargs) -> Dict[str, Any]:
        """
        Run the workflow.
        
        This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement run()")
    
    async def execute_activity_with_logging(
        self,
        activity_fn: Any,
        *args: Any,
        retry_policy: Optional[RetryPolicy] = None,
        start_to_close_timeout: Optional[timedelta] = None,
        **kwargs: Any
    ) -> Any:
        """
        Execute an activity with standardized logging and error handling.
        
        Args:
            activity_fn: The activity function to execute
            *args: Arguments to pass to the activity
            retry_policy: Optional retry policy
            start_to_close_timeout: Optional timeout
            **kwargs: Keyword arguments to pass to the activity
            
        Returns:
            The result of the activity
        """
        activity_name = getattr(activity_fn, "__name__", str(activity_fn))
        workflow.logger.info(f"Executing activity: {activity_name}")
        
        # Set default timeout if not provided
        if start_to_close_timeout is None:
            start_to_close_timeout = timedelta(minutes=5)
        
        # Set default retry policy if not provided
        if retry_policy is None:
            retry_policy = STANDARD_RETRY_POLICY
        
        try:
            result = await execute_activity(
                activity_fn,
                *args,
                start_to_close_timeout=start_to_close_timeout,
                retry_policy=retry_policy,
                **kwargs
            )
            workflow.logger.info(f"Activity {activity_name} completed successfully")
            return result
        except ApplicationError as e:
            workflow.logger.error(f"Activity {activity_name} failed with ApplicationError: {str(e)}")
            raise
        except FailureError as e:
            workflow.logger.error(f"Activity {activity_name} failed with FailureError: {str(e)}")
            raise
        except Exception as e:
            workflow.logger.error(f"Activity {activity_name} failed with unexpected error: {str(e)}")
            raise
    
    async def sleep_with_logging(self, duration: timedelta, reason: str = ""):
        """
        Sleep for the specified duration with logging.
        
        Args:
            duration: Duration to sleep
            reason: Optional reason for sleeping
        """
        if reason:
            workflow.logger.info(f"Sleeping for {duration} ({reason})")
        else:
            workflow.logger.info(f"Sleeping for {duration}")
        
        await sleep(duration)
        workflow.logger.info("Sleep completed")


@workflow.defn
class PeriodicWorkflow(BaseWorkflow):
    """Base class for workflows that need to run periodically."""
    
    @workflow.run
    async def run(
        self,
        interval: int = 86400,  # Default: 1 day in seconds
        max_executions: int = 0,  # 0 means infinite
        *args: Any,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Run a periodic workflow.
        
        Args:
            interval: Interval between executions in seconds
            max_executions: Maximum number of executions (0 = infinite)
            *args: Arguments to pass to execute_periodic_task
            **kwargs: Keyword arguments to pass to execute_periodic_task
            
        Returns:
            Dict with workflow results
        """
        execution_count = 0
        
        while max_executions == 0 or execution_count < max_executions:
            workflow.logger.info(f"Starting periodic execution #{execution_count + 1}")
            
            try:
                result = await self.execute_periodic_task(*args, **kwargs)
                workflow.logger.info(f"Periodic execution #{execution_count + 1} completed")
            except Exception as e:
                workflow.logger.error(f"Periodic execution #{execution_count + 1} failed: {str(e)}")
                # Continue with the next iteration despite the error
            
            execution_count += 1
            
            # If we've reached the maximum number of executions, stop
            if max_executions > 0 and execution_count >= max_executions:
                break
            
            # Sleep until the next execution
            await self.sleep_with_logging(
                timedelta(seconds=interval),
                reason="waiting for next periodic execution"
            )
            
            # Continue as a new workflow to avoid workflow history getting too large
            if max_executions == 0 or execution_count < max_executions:
                return await workflow.continue_as_new(
                    interval, max_executions, *args, **kwargs
                )
        
        return {"success": True, "executions_completed": execution_count}
    
    async def execute_periodic_task(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        """
        Execute the periodic task.
        
        This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement execute_periodic_task()")


@workflow.defn
class BatchWorkflow(BaseWorkflow):
    """Base class for workflows that process items in batches."""
    
    @workflow.run
    async def run(
        self,
        batch_size: int = 10,
        max_concurrent: int = 5,
        *args: Any,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Run a batch workflow.
        
        Args:
            batch_size: Number of items to process in each batch
            max_concurrent: Maximum number of concurrent tasks
            *args: Arguments to pass to get_batch_items and process_batch_item
            **kwargs: Keyword arguments to pass to get_batch_items and process_batch_item
            
        Returns:
            Dict with workflow results
        """
        workflow.logger.info(f"Starting batch workflow with batch_size={batch_size}, max_concurrent={max_concurrent}")
        
        # Get the batch items
        try:
            batch_items = await self.get_batch_items(*args, **kwargs)
        except Exception as e:
            workflow.logger.error(f"Failed to get batch items: {str(e)}")
            return {"success": False, "error": f"Failed to get batch items: {str(e)}"}
        
        total_items = len(batch_items)
        workflow.logger.info(f"Got {total_items} items to process")
        
        if total_items == 0:
            return {"success": True, "items_processed": 0, "message": "No items to process"}
        
        # Process the items in batches
        results = []
        for i in range(0, total_items, batch_size):
            batch = batch_items[i:i+batch_size]
            workflow.logger.info(f"Processing batch {i//batch_size + 1}/{(total_items+batch_size-1)//batch_size}")
            
            # Process the batch items concurrently
            batch_results = []
            for j in range(0, len(batch), max_concurrent):
                concurrent_batch = batch[j:j+max_concurrent]
                
                # Create tasks for concurrent processing
                tasks = []
                for item in concurrent_batch:
                    tasks.append(self.process_batch_item(item, *args, **kwargs))
                
                # Wait for all tasks to complete
                import asyncio
                batch_results.extend(await asyncio.gather(*tasks, return_exceptions=True))
            
            # Add the batch results to the overall results
            results.extend(batch_results)
        
        # Count successes and failures
        successes = sum(1 for r in results if isinstance(r, dict) and r.get("success", False))
        failures = total_items - successes
        
        workflow.logger.info(f"Batch workflow completed: {successes} successes, {failures} failures")
        
        return {
            "success": True,
            "total_items": total_items,
            "items_processed": total_items,
            "successes": successes,
            "failures": failures,
            "results": results,
        }
    
    async def get_batch_items(self, *args: Any, **kwargs: Any) -> List[Any]:
        """
        Get the items to process in batches.
        
        This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement get_batch_items()")
    
    async def process_batch_item(self, item: Any, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        """
        Process a single batch item.
        
        This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement process_batch_item()")
