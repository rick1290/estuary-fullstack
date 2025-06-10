"""
Django management command to list all registered workflows and activities.

Usage:
    python manage.py list_workflows              # List all workflows and activities
    python manage.py list_workflows --domain booking   # List for specific domain
    python manage.py list_workflows --workflows-only   # List only workflows
    python manage.py list_workflows --activities-only  # List only activities
"""
from django.core.management.base import BaseCommand

from workflows.registry import registry


class Command(BaseCommand):
    help = 'List all registered Temporal workflows and activities'

    def add_arguments(self, parser):
        parser.add_argument(
            '--domain',
            type=str,
            help='Filter by domain (booking, payment, stream, room, shared)'
        )
        
        parser.add_argument(
            '--workflows-only',
            action='store_true',
            help='Show only workflows'
        )
        
        parser.add_argument(
            '--activities-only',
            action='store_true',
            help='Show only activities'
        )
        
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Show detailed information'
        )

    def handle(self, *args, **options):
        """Handle the command."""
        # Load the registry
        registry.load()
        
        domain = options.get('domain')
        workflows_only = options.get('workflows_only')
        activities_only = options.get('activities_only')
        detailed = options.get('detailed')
        
        # Show both if neither flag is set
        show_workflows = not activities_only
        show_activities = not workflows_only
        
        if domain:
            self.stdout.write(
                self.style.SUCCESS(f"\nDomain: {domain}")
            )
            self._show_domain(domain, show_workflows, show_activities, detailed)
        else:
            # Show all domains
            domains = ['booking', 'payment', 'stream', 'room']
            
            for domain in domains:
                self.stdout.write(
                    self.style.SUCCESS(f"\nDomain: {domain}")
                )
                self._show_domain(domain, show_workflows, show_activities, detailed)
            
            # Show shared activities
            if show_activities:
                self.stdout.write(
                    self.style.SUCCESS("\nShared Activities:")
                )
                activities = registry.get_activities_by_domain('shared')
                if activities:
                    for activity in activities:
                        self._show_activity(activity, detailed)
                else:
                    self.stdout.write("  None")
        
        # Show summary
        self.stdout.write("\n" + "="*50)
        self._show_summary()
    
    def _show_domain(self, domain: str, show_workflows: bool, show_activities: bool, detailed: bool):
        """Show workflows and activities for a domain."""
        if show_workflows:
            workflows = registry.get_workflows_by_domain(domain)
            self.stdout.write("  Workflows:")
            if workflows:
                for workflow in workflows:
                    self._show_workflow(workflow, detailed)
            else:
                self.stdout.write("    None")
        
        if show_activities:
            activities = registry.get_activities_by_domain(domain)
            self.stdout.write("  Activities:")
            if activities:
                for activity in activities:
                    self._show_activity(activity, detailed)
            else:
                self.stdout.write("    None")
    
    def _show_workflow(self, workflow, detailed: bool):
        """Show workflow information."""
        if detailed:
            self.stdout.write(f"    - {workflow.__name__}")
            if workflow.__doc__:
                doc_lines = workflow.__doc__.strip().split('\n')
                first_line = doc_lines[0].strip()
                self.stdout.write(f"      {first_line}")
            
            # Show workflow methods
            methods = [m for m in dir(workflow) if m.startswith('run') and callable(getattr(workflow, m))]
            if methods:
                self.stdout.write(f"      Methods: {', '.join(methods)}")
        else:
            self.stdout.write(f"    - {workflow.__name__}")
    
    def _show_activity(self, activity, detailed: bool):
        """Show activity information."""
        if detailed:
            self.stdout.write(f"    - {activity.__name__}")
            if activity.__doc__:
                doc_lines = activity.__doc__.strip().split('\n')
                first_line = doc_lines[0].strip()
                self.stdout.write(f"      {first_line}")
            
            # Show activity signature
            import inspect
            sig = inspect.signature(activity)
            params = []
            for param_name, param in sig.parameters.items():
                if param_name != 'self':
                    if param.annotation != param.empty:
                        params.append(f"{param_name}: {param.annotation.__name__}")
                    else:
                        params.append(param_name)
            if params:
                self.stdout.write(f"      Parameters: {', '.join(params)}")
        else:
            self.stdout.write(f"    - {activity.__name__}")
    
    def _show_summary(self):
        """Show summary statistics."""
        workflow_info = registry.get_workflow_info()
        
        total_workflows = sum(info['count'] for info in workflow_info.values())
        total_activities = len(registry.get_all_activities())
        
        self.stdout.write(self.style.SUCCESS("Summary:"))
        self.stdout.write(f"  Total workflows: {total_workflows}")
        self.stdout.write(f"  Total activities: {total_activities}")
        
        # Show per-domain counts
        self.stdout.write("\n  Per domain:")
        for domain, info in workflow_info.items():
            workflow_count = info['count']
            activity_count = len(registry.get_activities_by_domain(domain))
            self.stdout.write(
                f"    {domain}: {workflow_count} workflows, {activity_count} activities"
            )