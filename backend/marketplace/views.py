from django.shortcuts import render, get_object_or_404
from apps.services.models import Service, ServiceCategory
from apps.practitioners.models import Practitioner, Specialize, Style, Topic
from django.db.models import Q, Count, Prefetch
from django.http import Http404
from apps.reviews.models import Review


def home(request):
    """
    View for the homepage of the Estuary marketplace.
    Displays featured services and practitioners.
    """
    # Get featured services and practitioners
    featured_services = Service.objects.filter(is_featured=True)[:6]
    featured_practitioners = Practitioner.objects.filter(featured=True)[:4]
    
    context = {
        'featured_services': featured_services,
        'featured_practitioners': featured_practitioners,
    }
    
    return render(request, 'marketplace/home.html', context)


def practitioners_list(request):
    """
    View for listing all practitioners with search and filtering capabilities.
    """
    # Get search query and filter parameters from request
    search_query = request.GET.get('q', '')
    specialization = request.GET.get('specialization', '')
    category_slug = request.GET.get('category', '')
    style = request.GET.get('style', '')
    topic = request.GET.get('topic', '')
    sort_by = request.GET.get('sort', 'rating')  # Default sort by rating
    
    # Base queryset with prefetched related data for performance
    practitioners = Practitioner.objects.filter(
        is_verified=True,
        practitioner_status='active'
    ).prefetch_related(
        'specializations',
        'styles',
        'topics',
        'user',
        Prefetch('services', queryset=Service.objects.filter(is_active=True))
    ).distinct()
    
    # Apply search filter if provided
    if search_query:
        practitioners = practitioners.filter(
            Q(user__first_name__icontains=search_query) |
            Q(user__last_name__icontains=search_query) |
            Q(display_name__icontains=search_query) |
            Q(bio__icontains=search_query) |
            Q(title__icontains=search_query) |
            Q(specializations__content__icontains=search_query)
        ).distinct()
    
    # Apply specialization filter if provided
    if specialization:
        practitioners = practitioners.filter(specializations__content__icontains=specialization)
    
    # Apply category filter if provided
    if category_slug:
        try:
            category = ServiceCategory.objects.get(slug=category_slug)
            # Get all child categories as well
            all_categories = [category.id] + [c.id for c in category.get_all_children()]
            practitioners = practitioners.filter(services__category__id__in=all_categories).distinct()
        except ServiceCategory.DoesNotExist:
            pass
    
    # Apply style filter if provided
    if style:
        practitioners = practitioners.filter(styles__content__icontains=style)
    
    # Apply topic filter if provided
    if topic:
        practitioners = practitioners.filter(topics__content__icontains=topic)
    
    # Apply sorting
    if sort_by == 'rating':
        practitioners = practitioners.order_by('-average_rating', '-total_reviews')
    elif sort_by == 'reviews':
        practitioners = practitioners.order_by('-total_reviews')
    elif sort_by == 'experience':
        practitioners = practitioners.order_by('-years_of_experience')
    elif sort_by == 'name':
        practitioners = practitioners.order_by('display_name', 'user__first_name')
    
    # Get all categories, specializations, styles, and topics for filters
    categories = ServiceCategory.objects.filter(is_active=True, parent=None).order_by('name')
    specializations = Specialize.objects.all().order_by('content')
    styles = Style.objects.all().order_by('content')
    topics = Topic.objects.all().order_by('content')
    
    context = {
        'practitioners': practitioners,
        'search_query': search_query,
        'specialization': specialization,
        'category_slug': category_slug,
        'style': style,
        'topic': topic,
        'sort_by': sort_by,
        'categories': categories,
        'specializations': specializations,
        'styles': styles,
        'topics': topics,
    }
    
    return render(request, 'marketplace/practitioners_list.html', context)


def practitioner_detail(request, practitioner_id):
    """
    View for displaying a practitioner's detail page.
    """
    try:
        practitioner = Practitioner.objects.get(id=practitioner_id)
    except Practitioner.DoesNotExist:
        raise Http404("Practitioner not found")
    
    # Get all services for this practitioner and group by category
    services = Service.objects.filter(practitioner=practitioner, is_active=True)
    
    # Group services by category
    services_by_category = {}
    for service in services:
        category_name = service.category.name if service.category else "Other Services"
        if category_name not in services_by_category:
            services_by_category[category_name] = []
        services_by_category[category_name].append(service)
    
    # Get recent reviews for this practitioner
    recent_reviews = Review.objects.filter(
        practitioner=practitioner
    ).order_by('-created_at')[:3]
    
    context = {
        'practitioner': practitioner,
        'services_by_category': services_by_category,
        'recent_reviews': recent_reviews,
    }
    
    return render(request, 'marketplace/practitioner_detail.html', context)