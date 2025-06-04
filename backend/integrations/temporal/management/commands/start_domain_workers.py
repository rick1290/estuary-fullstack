"""
Start Temporal workers for specific domain combinations.

This command provides a convenient way to start multiple domain-specific workers
with predefined configurations, making it easier to run common worker combinations.
"""
import logging
import os
import signal
import subprocess
import sys
import time
from django.core.management.base import BaseCommand, CommandError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Start Temporal workers for specific domain combinations'

    def add_arguments(self, parser):
        parser.add_argument(
            'worker_group',
            type=str,
            choices=['all', 'bookings', 'payments', 'practitioners', 'core'],
            help='Worker group to start'
        )
        parser.add_argument(
            '--workers',
            type=int,
            default=1,
            help='Number of worker processes to start per domain'
        )
        parser.add_argument(
            '--log-level',
            type=str,
            default='INFO',
            choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
            help='Log level for workers'
        )

    def handle(self, *args, **options):
        worker_group = options['worker_group']
        num_workers = options['workers']
        log_level = options['log_level']
        
        # Define domain configurations for different worker groups
        worker_configs = {
            'all': {
                'domains': ['bookings', 'payments', 'practitioners'],
                'task_queues': ['bookings', 'payments', 'practitioners'],
                'description': 'All domains'
            },
            'bookings': {
                'domains': ['bookings'],
                'task_queues': ['bookings'],
                'description': 'Bookings domain'
            },
            'payments': {
                'domains': ['payments'],
                'task_queues': ['payments'],
                'description': 'Payments domain'
            },
            'practitioners': {
                'domains': ['practitioners'],
                'task_queues': ['practitioners'],
                'description': 'Practitioners domain'
            },
            'core': {
                'domains': ['bookings', 'payments'],
                'task_queues': ['core'],
                'description': 'Core domains (bookings and payments)'
            }
        }
        
        if worker_group not in worker_configs:
            raise CommandError(f"Unknown worker group: {worker_group}")
        
        config = worker_configs[worker_group]
        domains = config['domains']
        task_queues = config['task_queues']
        description = config['description']
        
        self.stdout.write(f"Starting {num_workers} worker(s) for {description}")
        
        # Start the workers
        processes = []
        try:
            for i in range(num_workers):
                for task_queue in task_queues:
                    cmd = [
                        sys.executable,
                        'manage.py',
                        'start_worker',
                        f'--task-queue={task_queue}',
                        f'--domains={",".join(domains)}',
                        f'--log-level={log_level}',
                    ]
                    
                    self.stdout.write(f"Starting worker {i+1} for task queue {task_queue} with domains {domains}")
                    
                    process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        universal_newlines=True,
                        bufsize=1,
                    )
                    
                    processes.append((process, task_queue, i+1))
            
            self.stdout.write(self.style.SUCCESS(f"Started {len(processes)} worker processes"))
            self.stdout.write("Press Ctrl+C to stop all workers")
            
            # Monitor the processes and print their output
            while True:
                for process, task_queue, worker_id in processes:
                    line = process.stdout.readline()
                    if line:
                        self.stdout.write(f"[{task_queue}-{worker_id}] {line.strip()}")
                
                # Check if any process has terminated
                for process, task_queue, worker_id in processes[:]:
                    if process.poll() is not None:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Worker {worker_id} for task queue {task_queue} terminated with code {process.returncode}"
                            )
                        )
                        processes.remove((process, task_queue, worker_id))
                
                if not processes:
                    self.stdout.write(self.style.ERROR("All workers have terminated"))
                    break
                
                time.sleep(0.1)
        
        except KeyboardInterrupt:
            self.stdout.write("Stopping workers...")
            
            # Send SIGTERM to all processes
            for process, task_queue, worker_id in processes:
                self.stdout.write(f"Stopping worker {worker_id} for task queue {task_queue}")
                process.send_signal(signal.SIGTERM)
            
            # Wait for processes to terminate
            for process, task_queue, worker_id in processes:
                try:
                    process.wait(timeout=5)
                    self.stdout.write(f"Worker {worker_id} for task queue {task_queue} stopped")
                except subprocess.TimeoutExpired:
                    self.stdout.write(f"Worker {worker_id} for task queue {task_queue} did not stop gracefully, killing")
                    process.kill()
            
            self.stdout.write(self.style.SUCCESS("All workers stopped"))
