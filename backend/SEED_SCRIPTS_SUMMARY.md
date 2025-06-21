# Seed Scripts Summary & Testing Guide

## ✅ What I've Done

### 1. **Analyzed Existing Scripts**
- All old seed scripts in `/utils` have **broken imports** and reference **non-existent models**
- Created detailed analysis in `SEED_SCRIPT_ANALYSIS.md`

### 2. **Created New Working Scripts**
- **`seed_database.py`** - Full comprehensive seeding (500+ lines)
- **`seed_minimal.py`** - Quick minimal seeding (270 lines)
- **`core/management/commands/seed_db.py`** - Django management command wrapper

### 3. **Created Documentation**
- **`SEEDING_GUIDE.md`** - Complete usage guide with troubleshooting
- **`fix_seed_imports.py`** - Script to fix imports in old scripts (if you want to try salvaging them)

## 🚀 Quick Test Now

### Step 1: Ensure Your Database is Ready
```bash
cd backend
python manage.py migrate
```

### Step 2: Run Minimal Seed (Fastest Test)
```bash
python manage.py shell < seed_minimal.py
```

### Step 3: Verify It Worked
```bash
python manage.py shell
>>> from users.models import User
>>> User.objects.count()
3  # Should show 3 users (admin, client, practitioner)
```

### Step 4: Test Login
```bash
python manage.py runserver
# Go to http://localhost:8000/admin/
# Login with: admin@estuary.com / admin123
```

## 📊 What Gets Created

### Minimal Seed (1 minute):
- 3 users (admin, client, practitioner)
- 2 services (yoga session, workshop)
- 2 bookings (1 past, 1 future)
- Basic location data

### Full Seed (3-5 minutes):
- 9 users (1 admin, 5 clients, 3 practitioners)
- 9+ services (sessions, workshops, packages)
- 15 bookings with payments
- Reviews, locations, schedules, certifications
- Full test data for all features

## 🔧 If Something Goes Wrong

### Most Common Issues:

1. **Database not migrated**
   ```bash
   python manage.py migrate
   ```

2. **Old data conflicts**
   ```bash
   python manage.py flush  # Clear all data
   python manage.py migrate
   python manage.py shell < seed_minimal.py
   ```

3. **Import errors**
   - The new scripts only import models that exist
   - Don't use the old scripts in `/utils` without fixing them first

## 🎯 Next Steps

1. **Test the APIs**:
   ```bash
   # Start backend
   python manage.py runserver
   
   # Test in browser
   http://localhost:8000/api/v1/services/services/
   http://localhost:8000/api/v1/practitioners/practitioners/
   ```

2. **Test with Frontend**:
   ```bash
   # In frontend-2
   npm run dev
   
   # Login with seeded credentials
   ```

3. **Customize if Needed**:
   - Edit `seed_database.py` to add more test data
   - Edit `seed_minimal.py` for quick testing scenarios

## 💡 Pro Tips

- Use `--minimal` flag for quick tests: `python manage.py seed_db --minimal`
- Scripts are idempotent - run multiple times safely
- Check Django admin to see all created data
- Review `SEEDING_GUIDE.md` for complete documentation

Your database is now ready for testing! The new seed scripts will work with your current models.