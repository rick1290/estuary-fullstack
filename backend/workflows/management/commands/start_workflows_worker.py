"""
Django management command to start Temporal workers for workflows.

Usage:
    python manage.py start_workflows_worker              # Start worker with all workflows
    python manage.py start_workflows_worker --preset critical   # Start critical workflows only
    python manage.py start_workflows_worker --domain booking    # Start booking workflows only
    python manage.py start_workflows_worker --domains booking payment  # Multiple domains
"""
import asyncio
import logging
from typing import List

from django.core.management.base import BaseCommand, CommandError

from workflows.worker import run_worker, get_worker_preset, WORKER_PRESETS

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Start a Temporal worker for workflows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--task-queue',
            type=str,
            default='estuary-workflows',
            help='Task queue name (default: estuary-workflows)'
        )
        
        parser.add_argument(
            '--preset',
            type=str,
            choices=list(WORKER_PRESETS.keys()),
            help='Use a preset worker configuration'
        )
        
        parser.add_argument(
            '--domain',
            type=str,
            help='Single domain to process (booking, payment, stream, room)'
        )
        
        parser.add_argument(
            '--domains',
            nargs='+',
            type=str,
            help='Multiple domains to process'
        )
        
        parser.add_argument(
            '--worker-type',
            type=str,
            choices=['all', 'critical', 'background', 'booking', 'payment', 'stream', 'room'],
            help='Worker type configuration'
        )
        
        parser.add_argument(
            '--max-concurrent-activities',
            type=int,
            default=100,
            help='Maximum concurrent activities (default: 100)'
        )
        
        parser.add_argument(
            '--max-concurrent-workflows',
            type=int,
            default=100,
            help='Maximum concurrent workflows (default: 100)'
        )
        
        parser.add_argument(
            '--max-cached-workflows',
            type=int,
            default=1000,
            help='Maximum cached workflows (default: 1000)'
        )

    def handle(self, *args, **options):
        """Handle the command."""
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Determine configuration
        if options['preset']:
            # Use preset configuration
            preset_config = get_worker_preset(options['preset'])
            task_queue = preset_config['task_queue']
            worker_type = preset_config.get('worker_type')
            domains = None
            max_concurrent_activities = preset_config.get('max_concurrent_activities', 100)
            max_concurrent_workflows = preset_config.get('max_concurrent_workflows', 100)
            max_cached_workflows = options['max_cached_workflows']
            
            self.stdout.write(
                self.style.SUCCESS(f"Using preset '{options['preset']}' configuration")
            )
        else:
            # Use custom configuration
            task_queue = options['task_queue']
            worker_type = options.get('worker_type')
            domains = self._get_domains(options)
            max_concurrent_activities = options['max_concurrent_activities']
            max_concurrent_workflows = options['max_concurrent_workflows']
            max_cached_workflows = options['max_cached_workflows']
        
        # Log configuration
        self.stdout.write("Worker configuration:")
        self.stdout.write(f"  Task queue: {task_queue}")
        if worker_type:
            self.stdout.write(f"  Worker type: {worker_type}")
        if domains:
            self.stdout.write(f"  Domains: {', '.join(domains)}")
        self.stdout.write(f"  Max concurrent activities: {max_concurrent_activities}")
        self.stdout.write(f"  Max concurrent workflows: {max_concurrent_workflows}")
        self.stdout.write(f"  Max cached workflows: {max_cached_workflows}")
        
        # Run the worker
        try:
            self.stdout.write(
                self.style.SUCCESS("Starting Temporal worker...")
            )
            
            asyncio.run(run_worker(
                task_queue=task_queue,
                domains=domains,
                worker_type=worker_type,
                max_concurrent_activities=max_concurrent_activities,
                max_concurrent_workflows=max_concurrent_workflows,
                max_cached_workflows=max_cached_workflows,
            ))
            
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING("\nWorker stopped by user")
            )
        except Exception as e:
            raise CommandError(f"Failed to run worker: {e}")
    
    def _get_domains(self, options) -> List[str]:
        """Get domains from options."""
        domains = []
        
        if options.get('domain'):
            domains.append(options['domain'])
        
        if options.get('domains'):
            domains.extend(options['domains'])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_domains = []
        for domain in domains:
            if domain not in seen:
                seen.add(domain)
                unique_domains.append(domain)
        
        return unique_domains if unique_domains else None