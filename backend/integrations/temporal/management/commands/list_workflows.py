"""
List Temporal workflows and activities across all domains.

This command lists all registered Temporal workflows and activities across
different domains in the Estuary platform.
"""
import asyncio
import importlib
import inspect
import logging
import sys
from typing import Dict, List, Optional, Any

from django.core.management.base import BaseCommand
from django.apps import apps

from apps.integrations.temporal.worker import WorkflowRegistry

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'List Temporal workflows and activities across all domains'

    def add_arguments(self, parser):
        parser.add_argument(
            '--domain',
            type=str,
            help='Filter by domain (e.g., payments, bookings, practitioners)',
        )
        parser.add_argument(
            '--workflows-only',
            action='store_true',
            help='Show only workflows',
        )
        parser.add_argument(
            '--activities-only',
            action='store_true',
            help='Show only activities',
        )

    def handle(self, *args, **options):
        domain = options.get('domain')
        workflows_only = options.get('workflows_only')
        activities_only = options.get('activities_only')
        
        # Get the registry
        registry = WorkflowRegistry()
        
        # If neither workflows_only nor activities_only is specified, show both
        show_workflows = not activities_only
        show_activities = not workflows_only
        
        if domain:
            self.stdout.write(self.style.SUCCESS(f"Showing Temporal components for domain: {domain}"))
        else:
            self.stdout.write(self.style.SUCCESS("Showing Temporal components for all domains"))
        
        # Show workflows
        if show_workflows:
            self.stdout.write("\nWORKFLOWS:")
            self.stdout.write("=" * 80)
            
            if domain:
                workflows = registry.get_workflows(domain)
                self._print_workflows(workflows, domain)
            else:
                # Group workflows by domain
                for dom, workflows in registry._workflows.items():
                    if workflows:
                        self.stdout.write(f"\nDomain: {dom}")
                        self.stdout.write("-" * 80)
                        self._print_workflows(workflows, dom)
        
        # Show activities
        if show_activities:
            self.stdout.write("\nACTIVITIES:")
            self.stdout.write("=" * 80)
            
            if domain:
                activities = registry.get_activities(domain)
                self._print_activities(activities, domain)
            else:
                # Group activities by domain
                for dom, activities in registry._activities.items():
                    if activities:
                        self.stdout.write(f"\nDomain: {dom}")
                        self.stdout.write("-" * 80)
                        self._print_activities(activities, dom)
    
    def _print_workflows(self, workflows, domain):
        """Print workflow information."""
        if not workflows:
            self.stdout.write(self.style.WARNING(f"No workflows found for domain {domain}"))
            return
        
        for workflow in sorted(workflows, key=lambda w: w.__name__):
            self.stdout.write(f"  {workflow.__name__}")
            
            # Get the docstring
            docstring = inspect.getdoc(workflow)
            if docstring:
                # Get the first line of the docstring
                first_line = docstring.split('\n')[0].strip()
                self.stdout.write(f"    Description: {first_line}")
            
            # Get the run method
            run_method = getattr(workflow, "run", None)
            if run_method:
                # Get the signature
                sig = inspect.signature(run_method)
                params = []
                for name, param in sig.parameters.items():
                    if name == "self":
                        continue
                    
                    # Format the parameter
                    if param.default is inspect.Parameter.empty:
                        params.append(f"{name}")
                    else:
                        params.append(f"{name}={param.default}")
                
                self.stdout.write(f"    Signature: run({', '.join(params)})")
            
            self.stdout.write("")
    
    def _print_activities(self, activities, domain):
        """Print activity information."""
        if not activities:
            self.stdout.write(self.style.WARNING(f"No activities found for domain {domain}"))
            return
        
        for activity in sorted(activities, key=lambda a: a.__name__):
            self.stdout.write(f"  {activity.__name__}")
            
            # Get the docstring
            docstring = inspect.getdoc(activity)
            if docstring:
                # Get the first line of the docstring
                first_line = docstring.split('\n')[0].strip()
                self.stdout.write(f"    Description: {first_line}")
            
            # Get the signature
            sig = inspect.signature(activity)
            params = []
            for name, param in sig.parameters.items():
                # Format the parameter
                if param.default is inspect.Parameter.empty:
                    params.append(f"{name}")
                else:
                    params.append(f"{name}={param.default}")
            
            self.stdout.write(f"    Signature: {activity.__name__}({', '.join(params)})")
            self.stdout.write("")
