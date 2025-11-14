"""
Bookings tasks module.
Import existing tasks to maintain backwards compatibility.
"""

# Import existing tasks from tasks.py
from ..tasks import *

# Import booking reminder tasks
from .reminders import *
from .reschedule import *
from .rooms import *