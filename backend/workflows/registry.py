"""
Central registry for all Temporal workflows and activities.
This provides a single place to see all workflows in the system.
"""
from typing import List, Dict, Any
import importlib
import logging

logger = logging.getLogger(__name__)


class WorkflowRegistry:
    """Central registry for all workflows and activities"""
    
    def __init__(self):
        self._workflows: Dict[str, List[Any]] = {}
        self._activities: Dict[str, List[Any]] = {}
        self._loaded = False
    
    def load(self):
        """Load all workflows and activities from submodules"""
        if self._loaded:
            return
            
        domains = ['booking', 'payment', 'room', 'stream']
        
        for domain in domains:
            try:
                # Import workflows
                workflow_module = importlib.import_module(f'workflows.{domain}.workflows')
                workflows = getattr(workflow_module, 'WORKFLOWS', [])
                self._workflows[domain] = workflows
                
                # Import activities  
                activity_module = importlib.import_module(f'workflows.{domain}.activities')
                activities = getattr(activity_module, 'ACTIVITIES', [])
                self._activities[domain] = activities
                
                logger.info(f"Loaded {len(workflows)} workflows and {len(activities)} activities from {domain}")
                
            except ImportError as e:
                logger.warning(f"Could not import {domain} workflows: {e}")
                self._workflows[domain] = []
                self._activities[domain] = []
        
        # Load shared activities
        try:
            shared_module = importlib.import_module('workflows.shared.activities')
            self._activities['shared'] = getattr(shared_module, 'ACTIVITIES', [])
        except ImportError:
            self._activities['shared'] = []
            
        self._loaded = True
    
    def get_all_workflows(self) -> List[Any]:
        """Get all registered workflows"""
        self.load()
        all_workflows = []
        for workflows in self._workflows.values():
            all_workflows.extend(workflows)
        return all_workflows
    
    def get_all_activities(self) -> List[Any]:
        """Get all registered activities"""
        self.load()
        all_activities = []
        for activities in self._activities.values():
            all_activities.extend(activities)
        return all_activities
    
    def get_workflows_by_domain(self, domain: str) -> List[Any]:
        """Get workflows for a specific domain"""
        self.load()
        return self._workflows.get(domain, [])
    
    def get_activities_by_domain(self, domain: str) -> List[Any]:
        """Get activities for a specific domain"""
        self.load()
        return self._activities.get(domain, [])
    
    def get_workflow_info(self) -> Dict[str, Dict[str, Any]]:
        """Get detailed information about all workflows"""
        self.load()
        info = {}
        
        for domain, workflows in self._workflows.items():
            info[domain] = {
                'count': len(workflows),
                'workflows': [w.__name__ for w in workflows]
            }
            
        return info


# Global registry instance
registry = WorkflowRegistry()


# Convenience functions
def get_all_workflows():
    """Get all registered workflows"""
    return registry.get_all_workflows()


def get_all_activities():
    """Get all registered activities"""
    return registry.get_all_activities()


def get_workflows_for_worker(worker_type: str = 'all'):
    """Get workflows for a specific worker type"""
    if worker_type == 'all':
        return get_all_workflows()
    elif worker_type == 'critical':
        # Critical workflows that need high reliability
        workflows = []
        workflows.extend(registry.get_workflows_by_domain('booking'))
        workflows.extend(registry.get_workflows_by_domain('payment'))
        return workflows
    elif worker_type == 'background':
        # Background processing workflows
        workflows = []
        workflows.extend(registry.get_workflows_by_domain('stream'))
        workflows.extend(registry.get_workflows_by_domain('room'))
        return workflows
    else:
        # Domain-specific worker
        return registry.get_workflows_by_domain(worker_type)