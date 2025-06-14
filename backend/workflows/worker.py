"""
Temporal worker implementation for workflows app.

This module provides worker configurations and utilities for running
Temporal workflows and activities defined in the workflows app.
"""
import asyncio
import logging
import signal
from typing import List, Optional, Dict, Any

from temporalio.client import Client
from temporalio.worker import Worker

from integrations.temporal.client import get_temporal_client
from .registry import registry

logger = logging.getLogger(__name__)


class WorkflowWorker:
    """Configurable Temporal worker for workflows app."""
    
    def __init__(
        self,
        task_queue: str,
        domains: Optional[List[str]] = None,
        worker_type: Optional[str] = None,
        max_concurrent_activities: int = 100,
        max_concurrent_workflows: int = 100,
        max_cached_workflows: int = 1000,
    ):
        """
        Initialize the worker.
        
        Args:
            task_queue: The task queue to listen on
            domains: Optional list of domains to include (e.g., ['booking', 'payment'])
            worker_type: Optional worker type ('all', 'critical', 'background', or domain name)
            max_concurrent_activities: Maximum number of concurrent activities
            max_concurrent_workflows: Maximum number of concurrent workflows
            max_cached_workflows: Maximum number of cached workflows
        """
        self.task_queue = task_queue
        self.domains = domains
        self.worker_type = worker_type
        self.max_concurrent_activities = max_concurrent_activities
        self.max_concurrent_workflows = max_concurrent_workflows
        self.max_cached_workflows = max_cached_workflows
        self.worker = None
        self.client = None
        self._shutdown_event = asyncio.Event()
    
    async def start(self):
        """Start the worker."""
        # Get the Temporal client
        self.client = await get_temporal_client()
        logger.info(f"Connected to Temporal server")
        
        # Get workflows and activities based on configuration
        workflows = self._get_workflows()
        activities = self._get_activities()
        
        logger.info(
            f"Starting worker on task queue '{self.task_queue}' with "
            f"{len(workflows)} workflows and {len(activities)} activities"
        )
        
        # Log workflow and activity names
        if workflows:
            logger.info(f"Workflows: {', '.join(w.__name__ for w in workflows)}")
        if activities:
            logger.info(f"Activities: {', '.join(a.__name__ for a in activities)}")
        
        # Create the worker
        self.worker = Worker(
            self.client,
            task_queue=self.task_queue,
            workflows=workflows,
            activities=activities,
            max_concurrent_activities=self.max_concurrent_activities,
            max_concurrent_workflows=self.max_concurrent_workflows,
            max_cached_workflows=self.max_cached_workflows,
        )
        
        # Handle shutdown signals
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(
                sig, 
                lambda: asyncio.create_task(self.shutdown())
            )
        
        logger.info(f"Worker started on task queue: {self.task_queue}")
        
        # Run the worker until shutdown
        try:
            await self.worker.run()
        except Exception as e:
            logger.error(f"Worker error: {e}")
            raise
        finally:
            await self.shutdown()
    
    async def shutdown(self):
        """Gracefully shut down the worker."""
        if self._shutdown_event.is_set():
            return
            
        self._shutdown_event.set()
        logger.info("Shutting down worker...")
        
        if self.worker:
            await self.worker.shutdown()
            logger.info("Worker shut down successfully")
    
    def _get_workflows(self) -> List[Any]:
        """Get workflows based on configuration."""
        if self.worker_type:
            # Use worker type to determine workflows
            if self.worker_type == 'all':
                return registry.get_all_workflows()
            elif self.worker_type == 'critical':
                # Critical workflows (booking, payment)
                workflows = []
                workflows.extend(registry.get_workflows_by_domain('booking'))
                workflows.extend(registry.get_workflows_by_domain('payment'))
                return workflows
            elif self.worker_type == 'background':
                # Background workflows (stream, room)
                workflows = []
                workflows.extend(registry.get_workflows_by_domain('stream'))
                workflows.extend(registry.get_workflows_by_domain('room'))
                return workflows
            else:
                # Domain-specific
                return registry.get_workflows_by_domain(self.worker_type)
        elif self.domains:
            # Get workflows for specified domains
            workflows = []
            for domain in self.domains:
                workflows.extend(registry.get_workflows_by_domain(domain))
            return workflows
        else:
            # Default to all workflows
            return registry.get_all_workflows()
    
    def _get_activities(self) -> List[Any]:
        """Get activities based on configuration."""
        if self.worker_type:
            # Use worker type to determine activities
            if self.worker_type == 'all':
                return registry.get_all_activities()
            elif self.worker_type == 'critical':
                # Critical activities (booking, payment, shared)
                activities = []
                activities.extend(registry.get_activities_by_domain('booking'))
                activities.extend(registry.get_activities_by_domain('payment'))
                activities.extend(registry.get_activities_by_domain('shared'))
                return activities
            elif self.worker_type == 'background':
                # Background activities (stream, room, shared)
                activities = []
                activities.extend(registry.get_activities_by_domain('stream'))
                activities.extend(registry.get_activities_by_domain('room'))
                activities.extend(registry.get_activities_by_domain('shared'))
                return activities
            else:
                # Domain-specific plus shared
                activities = registry.get_activities_by_domain(self.worker_type)
                activities.extend(registry.get_activities_by_domain('shared'))
                return activities
        elif self.domains:
            # Get activities for specified domains plus shared
            activities = []
            for domain in self.domains:
                activities.extend(registry.get_activities_by_domain(domain))
            activities.extend(registry.get_activities_by_domain('shared'))
            return activities
        else:
            # Default to all activities
            return registry.get_all_activities()


async def run_worker(
    task_queue: str = "estuary-workflows",
    domains: Optional[List[str]] = None,
    worker_type: Optional[str] = None,
    max_concurrent_activities: int = 100,
    max_concurrent_workflows: int = 100,
    max_cached_workflows: int = 1000,
):
    """
    Run a Temporal worker for the workflows app.
    
    Args:
        task_queue: The task queue to listen on
        domains: Optional list of domains to include
        worker_type: Optional worker type ('all', 'critical', 'background', or domain name)
        max_concurrent_activities: Maximum number of concurrent activities
        max_concurrent_workflows: Maximum number of concurrent workflows  
        max_cached_workflows: Maximum number of cached workflows
    """
    worker = WorkflowWorker(
        task_queue=task_queue,
        domains=domains,
        worker_type=worker_type,
        max_concurrent_activities=max_concurrent_activities,
        max_concurrent_workflows=max_concurrent_workflows,
        max_cached_workflows=max_cached_workflows,
    )
    
    await worker.start()


# Worker presets for common configurations
WORKER_PRESETS = {
    'all': {
        'task_queue': 'estuary-workflows',
        'worker_type': 'all',
        'max_concurrent_activities': 100,
        'max_concurrent_workflows': 100,
    },
    'critical': {
        'task_queue': 'estuary-critical',
        'worker_type': 'critical',
        'max_concurrent_activities': 50,
        'max_concurrent_workflows': 50,
    },
    'background': {
        'task_queue': 'estuary-background',
        'worker_type': 'background',
        'max_concurrent_activities': 200,
        'max_concurrent_workflows': 100,
    },
    'booking': {
        'task_queue': 'estuary-booking',
        'worker_type': 'booking',
        'max_concurrent_activities': 50,
        'max_concurrent_workflows': 50,
    },
    'payment': {
        'task_queue': 'estuary-payment',
        'worker_type': 'payment',
        'max_concurrent_activities': 30,
        'max_concurrent_workflows': 30,
    },
    'stream': {
        'task_queue': 'estuary-stream',
        'worker_type': 'stream',
        'max_concurrent_activities': 100,
        'max_concurrent_workflows': 50,
    },
    'room': {
        'task_queue': 'estuary-room',
        'worker_type': 'room',
        'max_concurrent_activities': 50,
        'max_concurrent_workflows': 50,
    },
}


def get_worker_preset(preset_name: str) -> Dict[str, Any]:
    """Get worker configuration for a preset."""
    if preset_name not in WORKER_PRESETS:
        raise ValueError(
            f"Unknown worker preset: {preset_name}. "
            f"Available presets: {', '.join(WORKER_PRESETS.keys())}"
        )
    return WORKER_PRESETS[preset_name]