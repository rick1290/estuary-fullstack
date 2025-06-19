"""
Services router - Simplified for unified Service model
"""
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from asgiref.sync import sync_to_async
from django.db import transaction
from django.core.paginator import Paginator
from django.db.models import Q, Count, Avg, Prefetch
from services.models import Service, ServiceRelationship, ServiceSession, ServiceType
from api.dependencies import (
    get_current_user,
    get_current_user_optional,
    get_current_superuser,
    get_pagination_params,
    PaginationParams
)
from api.v1.schemas.services import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListResponse,
    ServiceDetailResponse,
)
from django.contrib.auth import get_user_model

User = get_user_model()
router = APIRouter()


# Helper functions for complex ORM operations
@sync_to_async
def get_services_list(
    pagination: PaginationParams,
    current_user: Optional[User],
    is_active: Optional[bool],
    service_type: Optional[str],
    category: Optional[str],
    search: Optional[str],
    min_price: Optional[float],
    max_price: Optional[float]
):
    """Get paginated list of services with filters"""
    queryset = Service.objects.select_related(
        'primary_practitioner__user',
        'service_type',
        'category'
    ).prefetch_related(
        'additional_practitioners__user',
        'child_relationships__child_service',
        'sessions'
    )
    
    # Apply filters
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    elif not current_user or not current_user.is_staff:
        # Non-staff users only see active and public services
        queryset = queryset.filter(is_active=True, is_public=True)
    
    if service_type:
        try:
            service_type_obj = ServiceType.objects.get(code=service_type)
            queryset = queryset.filter(service_type=service_type_obj)
        except ServiceType.DoesNotExist:
            queryset = queryset.none()
    
    if category:
        queryset = queryset.filter(category__slug=category)
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | 
            Q(description__icontains=search)
        )
    
    if min_price is not None:
        queryset = queryset.filter(price_cents__gte=int(min_price * 100))
    
    if max_price is not None:
        queryset = queryset.filter(price_cents__lte=int(max_price * 100))
    
    # Add annotations
    queryset = queryset.annotate(
        booking_count=Count('bookings', distinct=True),
        avg_rating=Avg('reviews__rating')
    )
    
    # Apply ordering
    if pagination.ordering:
        queryset = queryset.order_by(pagination.ordering)
    else:
        queryset = queryset.order_by('name')
    
    # Paginate
    paginator = Paginator(queryset, pagination.page_size)
    page_obj = paginator.get_page(pagination.page)
    
    # Prepare response
    results = []
    for service in page_obj:
        service_dict = {
            'id': service.id,
            'public_uuid': str(service.public_uuid),
            'name': service.name,
            'description': service.description,
            'service_type': service.service_type.code if service.service_type else None,
            'category': {
                'id': service.category.id,
                'name': service.category.name,
                'slug': service.category.slug
            } if service.category else None,
            'price_cents': service.price_cents,
            'price': float(service.price),
            'duration_minutes': service.duration_minutes,
            'primary_practitioner': {
                'id': service.primary_practitioner.id,
                'display_name': service.primary_practitioner.display_name
            } if service.primary_practitioner else None,
            'is_active': service.is_active,
            'is_public': service.is_public,
            'booking_count': service.booking_count,
            'average_rating': service.avg_rating if hasattr(service, 'avg_rating') else service.average_rating,
            'sessions_included': service.sessions_included if service.is_bundle else None,
            'created_at': service.created_at,
            'updated_at': service.updated_at,
        }
        results.append(service_dict)
    
    return {
        'results': results,
        'total': paginator.count,
        'page_size': pagination.page_size,
        'offset': pagination.offset,
        'page': pagination.page,
        'num_pages': paginator.num_pages
    }


@sync_to_async
@transaction.atomic
def create_service_with_relationships(service_data: ServiceCreate):
    """Create a service with all relationships in a transaction"""
    # Get service type
    try:
        service_type = ServiceType.objects.get(code=service_data.service_type)
    except ServiceType.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service type '{service_data.service_type}' not found"
        )
    
    # Create service
    service_dict = service_data.model_dump(exclude={'service_type', 'child_service_ids'})
    service_dict['service_type'] = service_type
    service_dict['price_cents'] = int(service_data.price * 100)
    
    service = Service.objects.create(**service_dict)
    
    # Handle child services for packages/bundles
    if service_data.child_service_ids and service.is_package:
        for child_id in service_data.child_service_ids:
            try:
                child_service = Service.objects.get(id=child_id)
                ServiceRelationship.objects.create(
                    parent_service=service,
                    child_service=child_service,
                    quantity=1
                )
            except Service.DoesNotExist:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Child service with ID {child_id} not found"
                )
    
    return service


@sync_to_async
def get_service_detail(service_id: int, current_user: Optional[User]):
    """Get detailed service information"""
    queryset = Service.objects.select_related(
        'primary_practitioner__user',
        'service_type',
        'category'
    ).prefetch_related(
        'additional_practitioners__user',
        'child_services',
        'sessions',
        'reviews'
    )
    
    # Non-staff users only see active and public services
    if not current_user or not current_user.is_staff:
        queryset = queryset.filter(is_active=True, is_public=True)
    
    try:
        return queryset.get(id=service_id)
    except Service.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )


@sync_to_async
def update_service_data(service_id: int, service_data: ServiceUpdate):
    """Update service information"""
    try:
        service = Service.objects.get(id=service_id)
        
        # Update fields
        update_data = service_data.model_dump(exclude_unset=True)
        if 'price' in update_data:
            update_data['price_cents'] = int(update_data.pop('price') * 100)
        
        for field, value in update_data.items():
            setattr(service, field, value)
        
        service.save()
        return service
    
    except Service.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )


@sync_to_async
def soft_delete_service(service_id: int):
    """Soft delete a service by deactivating it"""
    try:
        service = Service.objects.get(id=service_id)
        
        # Soft delete by deactivating
        service.is_active = False
        service.is_public = False
        service.save()
        
    except Service.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )


# Service endpoints
@router.get("/", response_model=ServiceListResponse)
async def list_services(
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    service_type: Optional[str] = Query(None, description="Filter by service type (session, workshop, course, package, bundle)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
):
    """List all services"""
    result = await get_services_list(
        pagination=pagination,
        current_user=current_user,
        is_active=is_active,
        service_type=service_type,
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price
    )
    
    return ServiceListResponse(
        results=result['results'],
        total=result['total'],
        limit=result['page_size'],
        offset=result['offset'],
        page=result['page'],
        total_pages=result['num_pages']
    )


@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    current_user: Annotated[User, Depends(get_current_superuser)]
):
    """Create a new service (admin only)"""
    try:
        service = await create_service_with_relationships(service_data)
        return ServiceResponse.model_validate(service)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/types")
async def get_service_types():
    """Get all available service types"""
    @sync_to_async
    def get_types():
        types = ServiceType.objects.filter(is_active=True).order_by('order', 'name')
        return [
            {
                "id": st.id,
                "code": st.code,
                "name": st.name,
                "description": st.description
            }
            for st in types
        ]
    
    return await get_types()


@router.get("/categories")
async def get_service_categories():
    """Get all service categories"""
    @sync_to_async
    def get_categories():
        from services.models import ServiceCategory
        categories = ServiceCategory.objects.filter(is_active=True).order_by('order', 'name')
        return [
            {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "description": cat.description,
                "icon": cat.icon,
                "is_featured": cat.is_featured
            }
            for cat in categories
        ]
    
    return await get_categories()


@router.get("/{service_id}", response_model=ServiceDetailResponse)
async def get_service(
    service_id: int,
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)]
):
    """Get a single service by ID"""
    service = await get_service_detail(service_id, current_user)
    return ServiceDetailResponse.model_validate(service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: Annotated[User, Depends(get_current_superuser)]
):
    """Update a service (admin only)"""
    service = await update_service_data(service_id, service_data)
    return ServiceResponse.model_validate(service)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    current_user: Annotated[User, Depends(get_current_superuser)]
):
    """Delete a service (admin only)"""
    await soft_delete_service(service_id)