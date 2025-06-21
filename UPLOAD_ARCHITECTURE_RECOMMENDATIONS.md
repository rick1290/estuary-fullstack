# Service Creation File Upload Architecture Recommendations

## Current State Analysis

### Backend Findings:
1. **Services are created with a `status` field** that defaults to `'draft'` (found in `ServiceStatusEnum`)
2. **Media model has a flexible entity relationship** using `entity_type` and `entity_id` fields
3. **Media API supports both direct uploads and presigned URLs** for client-side uploads to CloudFlare R2
4. **No explicit cleanup mechanism** for orphaned media files was found

### Frontend Findings:
1. **Service creation uses a multi-step wizard** that collects all data before submission
2. **Media uploads are currently handled locally** (creating blob URLs) before service creation
3. **No service is created until the final "Create Service" button** is clicked

## Recommended Approach: Draft Service Pattern

### Overview
Create services in draft mode immediately when the wizard starts, allowing media to be attached to a real entity from the beginning.

### Implementation Details:

#### 1. **Create Draft Service Early**
```python
# In ServiceViewSet.create method
def create(self, request):
    # If no status provided, default to draft
    if 'status' not in request.data:
        request.data['status'] = ServiceStatusEnum.DRAFT
    
    # Create minimal service with required fields only
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    service = serializer.save()
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)
```

#### 2. **Frontend Wizard Modification**
```typescript
// In ServiceWizard component
const initializeDraftService = async () => {
  const draftData = {
    name: "Draft Service",
    service_type_id: getDefaultServiceTypeId(),
    price: 0,
    duration_minutes: 60,
    status: 'draft',
    is_active: false,
    is_public: false
  };
  
  const response = await createService(draftData);
  setServiceId(response.id);
  return response.id;
};

// Call this when wizard opens for new services
useEffect(() => {
  if (!serviceId && !isEditMode) {
    initializeDraftService();
  }
}, []);
```

#### 3. **Media Upload with Real Entity**
```typescript
// In MediaStep component
const handleFileUpload = async (file: File) => {
  // Now we have a real service ID to attach to
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entity_type', 'service');
  formData.append('entity_id', serviceId);
  formData.append('is_primary', 'true');
  
  const response = await uploadMedia(formData);
  updateFormField('image', response.url);
};
```

#### 4. **Cleanup Mechanism for Abandoned Drafts**
```python
# Django management command: cleanup_draft_services.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from services.models import Service, ServiceStatusEnum
from media.models import Media

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Find draft services older than 24 hours
        cutoff_date = timezone.now() - timedelta(days=1)
        
        draft_services = Service.objects.filter(
            status=ServiceStatusEnum.DRAFT,
            created_at__lt=cutoff_date
        )
        
        for service in draft_services:
            # Delete associated media
            Media.objects.filter(
                entity_type='service',
                entity_id=service.id
            ).delete()
            
            # Delete the draft service
            service.delete()
            
        self.stdout.write(f"Cleaned up {draft_services.count()} draft services")
```

#### 5. **Add Cleanup to Celery Beat Schedule**
```python
# In settings.py or celery config
CELERY_BEAT_SCHEDULE = {
    'cleanup-draft-services': {
        'task': 'services.tasks.cleanup_draft_services',
        'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
    },
}
```

## Alternative Approach: Temporary Upload Pattern

If you prefer not to create draft services:

### 1. **Create Temporary Upload Endpoint**
```python
# In MediaViewSet
@action(detail=False, methods=['post'])
def temporary_upload(self, request):
    """Upload files temporarily before entity creation"""
    serializer = TemporaryUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    file = serializer.validated_data['file']
    
    # Store with temporary prefix
    storage_key = f"temp/{request.user.id}/{uuid.uuid4()}/{file.name}"
    
    # Upload to R2
    storage = R2MediaStorage()
    url = storage.upload(file, storage_key)
    
    # Store temp upload info in cache/session
    cache_key = f"temp_upload:{request.user.id}:{uuid.uuid4()}"
    cache.set(cache_key, {
        'url': url,
        'storage_key': storage_key,
        'filename': file.name,
        'uploaded_at': timezone.now()
    }, timeout=86400)  # 24 hour expiry
    
    return Response({
        'temp_id': cache_key,
        'url': url
    })
```

### 2. **Move Temporary Files on Service Creation**
```python
# In service creation
def create(self, request):
    temp_media_ids = request.data.pop('temp_media_ids', [])
    
    # Create service
    service = super().create(request)
    
    # Move temporary media to permanent location
    for temp_id in temp_media_ids:
        temp_data = cache.get(temp_id)
        if temp_data:
            # Move file in R2
            new_key = f"media/service/{service.id}/{uuid.uuid4()}"
            storage.move(temp_data['storage_key'], new_key)
            
            # Create media record
            Media.objects.create(
                entity_type='service',
                entity_id=service.id,
                url=storage.get_public_url(new_key),
                storage_key=new_key,
                filename=temp_data['filename'],
                uploaded_by=request.user
            )
            
            # Clean up temp reference
            cache.delete(temp_id)
```

## Recommendation: Use Draft Service Pattern

**Why Draft Pattern is Better:**

1. **Simpler Implementation** - No need for temporary storage logic
2. **Better User Experience** - Can save progress automatically
3. **Consistent Data Model** - Media always attached to real entities
4. **Easier Error Recovery** - If something fails, draft persists
5. **Better Analytics** - Can track abandoned service creation attempts

**Key Considerations:**

1. **Set reasonable cleanup windows** (24-48 hours for drafts)
2. **Add user notification** before cleanup if email is available
3. **Include draft management UI** so users can resume/delete drafts
4. **Ensure media cleanup** happens with draft deletion
5. **Add indexes** on status and created_at for efficient cleanup queries

## Implementation Timeline

1. **Phase 1**: Add draft status handling to backend (1 day)
2. **Phase 2**: Modify frontend wizard to create drafts (2 days)
3. **Phase 3**: Implement cleanup mechanism (1 day)
4. **Phase 4**: Add draft management UI (2 days)
5. **Phase 5**: Testing and refinement (1 day)

Total estimated time: 1 week