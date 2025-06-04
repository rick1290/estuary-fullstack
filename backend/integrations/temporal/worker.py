"""
Temporal worker implementation for Estuary.

This module provides a configurable worker implementation that can be used
to run Temporal workflows and activities across different apps.
"""
import asyncio
import importlib
import inspect
import logging
import signal
import sys
from typing import Dict, List, Optional, Type, Any, Set

from django.conf import settings
from temporalio import workflow
from temporalio.client import Client
from temporalio.worker import Worker

from apps.integrations.temporal.client import get_temporal_client

logger = logging.getLogger(__name__)


class WorkflowRegistry:
    """Registry for Temporal workflows and activities."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WorkflowRegistry, cls).__new__(cls)
            cls._instance._workflows = {}
            cls._instance._activities = {}
            cls._instance._initialized = False
        return cls._instance
    
    def register_workflow(self, workflow_cls: Type, domain: str = "default"):
        """
        Register a workflow class.
        
        Args:
            workflow_cls: The workflow class to register
            domain: The domain to register the workflow in
        """
        if domain not in self._workflows:
            self._workflows[domain] = set()
        
        self._workflows[domain].add(workflow_cls)
        logger.debug(f"Registered workflow {workflow_cls.__name__} in domain {domain}")
    
    def register_activity(self, activity_fn: Any, domain: str = "default"):
        """
        Register an activity function.
        
        Args:
            activity_fn: The activity function to register
            domain: The domain to register the activity in
        """
        if domain not in self._activities:
            self._activities[domain] = set()
        
        self._activities[domain].add(activity_fn)
        logger.debug(f"Registered activity {activity_fn.__name__} in domain {domain}")
    
    def get_workflows(self, domain: Optional[str] = None) -> List[Type]:
        """
        Get registered workflows.
        
        Args:
            domain: Optional domain to get workflows for
            
        Returns:
            List of workflow classes
        """
        if not self._initialized:
            self._discover_workflows_and_activities()
        
        if domain:
            return list(self._workflows.get(domain, set()))
        
        # Return all workflows from all domains
        all_workflows = set()
        for workflows in self._workflows.values():
            all_workflows.update(workflows)
        
        return list(all_workflows)
    
    def get_activities(self, domain: Optional[str] = None) -> List[Any]:
        """
        Get registered activities.
        
        Args:
            domain: Optional domain to get activities for
            
        Returns:
            List of activity functions
        """
        if not self._initialized:
            self._discover_workflows_and_activities()
        
        if domain:
            return list(self._activities.get(domain, set()))
        
        # Return all activities from all domains
        all_activities = set()
        for activities in self._activities.values():
            all_activities.update(activities)
        
        return list(all_activities)
    
    def _discover_workflows_and_activities(self):
        """Discover and register workflows and activities from installed apps."""
        from django.apps import apps
        
        logger.info("Discovering workflows and activities from installed apps...")
        
        # Get the list of installed apps
        installed_apps = [app_config.name for app_config in apps.get_app_configs()]
        
        # Look for temporal_workflows.py and temporal_activities.py in each app
        for app_name in installed_apps:
            # Skip apps that don't have temporal modules
            if not app_name.startswith('apps.'):
                continue
            
            # Extract the domain from the app name
            domain = app_name.split('.')[-1]
            
            # Try to import the workflow module
            try:
                workflow_module = importlib.import_module(f"{app_name}.temporal_workflows")
                self._register_from_module(workflow_module, domain, is_workflow=True)
            except ImportError:
                # No workflow module in this app
                pass
            
            # Try to import the activity module
            try:
                activity_module = importlib.import_module(f"{app_name}.temporal_activities")
                self._register_from_module(activity_module, domain, is_workflow=False)
            except ImportError:
                # No activity module in this app
                pass
        
        self._initialized = True
        
        # Log the discovered workflows and activities
        for domain, workflows in self._workflows.items():
            logger.info(f"Domain '{domain}' workflows: {', '.join(w.__name__ for w in workflows)}")
        
        for domain, activities in self._activities.items():
            logger.info(f"Domain '{domain}' activities: {', '.join(a.__name__ for a in activities)}")
    
    def _register_from_module(self, module: Any, domain: str, is_workflow: bool):
        """
        Register workflows or activities from a module.
        
        Args:
            module: The module to register from
            domain: The domain to register in
            is_workflow: Whether to register workflows or activities
        """
        for name, obj in inspect.getmembers(module):
            if is_workflow:
                # Check if it's a workflow class
                if (inspect.isclass(obj) and 
                    hasattr(obj, '__temporal_workflow_definition__')):
                    self.register_workflow(obj, domain)
            else:
                # Check if it's an activity function
                if (inspect.isfunction(obj) and 
                    hasattr(obj, '__temporal_activity_definition__')):
                    self.register_activity(obj, domain)


class TemporalWorker:
    """Configurable Temporal worker for Estuary."""
    
    def __init__(
        self,
        task_queue: str,
        domains: Optional[List[str]] = None,
        max_concurrent_activities: int = 100,
        max_concurrent_workflows: int = 100,
        max_cached_workflows: int = 1000,
    ):
        """
        Initialize the worker.
        
        Args:
            task_queue: The task queue to listen on
            domains: Optional list of domains to include
            max_concurrent_activities: Maximum number of concurrent activities
            max_concurrent_workflows: Maximum number of concurrent workflows
            max_cached_workflows: Maximum number of cached workflows
        """
        self.task_queue = task_queue
        self.domains = domains
        self.max_concurrent_activities = max_concurrent_activities
        self.max_concurrent_workflows = max_concurrent_workflows
        self.max_cached_workflows = max_cached_workflows
        self.worker = None
        self.client = None
        self.registry = WorkflowRegistry()
    
    async def start(self):
        """Start the worker."""
        # Get the Temporal client
        self.client = await get_temporal_client()
        logger.info(f"Connected to Temporal server")
        
        # Get workflows and activities
        workflows = self.registry.get_workflows(domain=None if self.domains is None else None)
        activities = self.registry.get_activities(domain=None if self.domains is None else None)
        
        if self.domains:
            # Filter workflows and activities by domain
            workflows = [w for w in workflows if any(
                w in self.registry.get_workflows(domain) for domain in self.domains
            )]
            activities = [a for a in activities if any(
                a in self.registry.get_activities(domain) for domain in self.domains
            )]
        
        logger.info(f"Starting worker with {len(workflows)} workflows and {len(activities)} activities")
        
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
            loop.add_signal_handler(sig, lambda: asyncio.create_task(self.shutdown()))
        
        logger.info(f"Worker started on task queue: {self.task_queue}")
        
        # Run the worker
        await self.worker.run()
    
    async def shutdown(self):
        """Gracefully shut down the worker."""
        logger.info("Shutting down worker...")
        
        if self.worker:
            await self.worker.shutdown()
            logger.info("Worker shut down successfully")


async def run_worker(
    task_queue: str,
    domains: Optional[List[str]] = None,
    max_concurrent_activities: int = 100,
    max_concurrent_workflows: int = 100,
    max_cached_workflows: int = 1000,
):
    """
    Run a Temporal worker.
    
    Args:
        task_queue: The task queue to listen on
        domains: Optional list of domains to include
        max_concurrent_activities: Maximum number of concurrent activities
        max_concurrent_workflows: Maximum number of concurrent workflows
        max_cached_workflows: Maximum number of cached workflows
    """
    worker = TemporalWorker(
        task_queue=task_queue,
        domains=domains,
        max_concurrent_activities=max_concurrent_activities,
        max_concurrent_workflows=max_concurrent_workflows,
        max_cached_workflows=max_cached_workflows,
    )
    
    await worker.start()
