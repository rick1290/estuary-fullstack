#!/usr/bin/env python3
"""
Fix route ordering in practitioners.py
"""

# Read the file
with open('api/v1/routers/practitioners.py', 'r') as f:
    content = f.read()

# Find the routes
import re

# Find the /{practitioner_id} route
pattern = r'(@router\.get\("/{practitioner_id}".*?\n(?:.*?\n)*?^    return.*?$)'
match = re.search(pattern, content, re.MULTILINE | re.DOTALL)

if match:
    practitioner_id_route = match.group(1)
    
    # Remove it from current position
    content_without_route = content.replace(practitioner_id_route, '')
    
    # Find where to insert it - after all /me routes
    # Look for the last /me route
    last_me_route_pattern = r'(@router\.\w+\("/me.*?\n(?:.*?\n)*?^    return.*?$)'
    matches = list(re.finditer(last_me_route_pattern, content_without_route, re.MULTILINE | re.DOTALL))
    
    if matches:
        last_match = matches[-1]
        insert_position = last_match.end()
        
        # Insert the route after the last /me route
        new_content = (
            content_without_route[:insert_position] + 
            "\n\n" + practitioner_id_route + 
            content_without_route[insert_position:]
        )
        
        # Write back
        with open('api/v1/routers/practitioners.py', 'w') as f:
            f.write(new_content)
        
        print("Route order fixed!")
    else:
        print("Could not find /me routes")
else:
    print("Could not find /{practitioner_id} route")