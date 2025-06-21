#!/usr/bin/env python
"""
Script to fix import statements in old seed scripts
Run: python utils/fix_seed_imports.py
"""

import os
import re

def fix_imports_in_file(filepath):
    """Fix import statements in a seed file"""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Fix patterns
    replacements = [
        # Remove 'apps.' prefix
        (r'from apps\.(\w+)\.models', r'from \1.models'),
        (r'from apps\.(\w+)\.', r'from \1.'),
        
        # Fix specific model imports that don't exist
        (r'from payments\.models import.*CreditTransaction', '# CreditTransaction import removed - model does not exist'),
        (r'from utils\.models import.*Language', '# Language import - check if exists in utils.models'),
        
        # Fix UserFavorite references
        (r'UserFavorite(?!Practitioner)', 'UserFavoritePractitioner'),
        
        # Add transaction import if missing
        (r'(from django\.db import.*)\n', r'\1\nfrom django.db import transaction\n'),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    # Check if file was modified
    if content != original_content:
        # Create backup
        backup_path = filepath + '.backup'
        with open(backup_path, 'w') as f:
            f.write(original_content)
        
        # Write fixed content
        with open(filepath, 'w') as f:
            f.write(content)
        
        print(f"✅ Fixed imports in {filepath}")
        print(f"   Backup saved to {backup_path}")
        return True
    else:
        print(f"ℹ️  No changes needed for {filepath}")
        return False

def main():
    """Fix imports in all seed files"""
    
    utils_dir = os.path.dirname(os.path.abspath(__file__))
    files_to_fix = [
        'seed_db.py',
        'seed_db_fixed.py',
        'seed_service_locations.py',
        'seed_test_locations.py'
    ]
    
    print("🔧 Fixing import statements in seed scripts...\n")
    
    fixed_count = 0
    for filename in files_to_fix:
        filepath = os.path.join(utils_dir, filename)
        if os.path.exists(filepath):
            if fix_imports_in_file(filepath):
                fixed_count += 1
        else:
            print(f"❌ File not found: {filename}")
    
    print(f"\n📊 Summary: Fixed {fixed_count} files")
    print("\n⚠️  Note: Even with fixed imports, these scripts may still have issues with:")
    print("   - Model fields that no longer exist")
    print("   - Changed model relationships")
    print("   - Missing dependencies")
    print("\n💡 Recommendation: Use the new seed_database.py or seed_minimal.py instead!")

if __name__ == '__main__':
    main()