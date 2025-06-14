"""
Analytics router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal
from django.db import connection
from django.db.models import Sum, Avg, Count, Q, F, Prefetch
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from asgiref.sync import sync_to_async

from analytics.models import (
    UserEngagement,
    PractitionerPerformance,
    ServiceAnalytics,
    FinancialReport,
    SearchAnalytics,
    SearchLog,
    ServiceView,
)
from practitioners.models import Practitioner
from bookings.models import Booking
from services.models import Service
from payments.models import Order, PractitionerPayout
from reviews.models import Review
from users.models import User

from ..schemas.analytics import (
    TimeRange,
    MetricType,
    ReportType,
    DateRange,
    MetricValue,
    TimeSeriesData,
    DashboardCard,
    PractitionerMetrics,
    PractitionerDashboard,
    ServicePerformance,
    PlatformMetrics,
    AdminDashboard,
    FinancialReportSummary,
    SearchAnalyticsSummary,
    UserEngagementMetrics,
    PractitionerAnalyticsRequest,
    AdminAnalyticsRequest,
    ExportAnalyticsRequest,
    AnalyticsExportResponse,
    RealtimeMetrics,
    MetricAlert,
)
from ...dependencies import (
    get_db,
    get_current_user,
    get_current_active_user,
    PaginationParams,
    get_pagination_params,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# Helper functions for database operations
@sync_to_async
def get_practitioner_by_id(practitioner_id):
    """Get practitioner by ID"""
    return Practitioner.objects.get(id=practitioner_id)


@sync_to_async
def get_service_by_id(service_id):
    """Get service by ID"""
    return Service.objects.get(id=service_id)


@sync_to_async
def get_practitioner_dashboard_data(practitioner, date_range):
    """Get all data needed for practitioner dashboard"""
    # Get bookings data
    bookings = Booking.objects.filter(
        practitioner=practitioner,
        start_time__date__gte=date_range.start_date,
        start_time__date__lte=date_range.end_date,
    )
    
    # Calculate metrics
    total_bookings = bookings.count()
    completed_bookings = bookings.filter(status='completed').count()
    cancelled_bookings = bookings.filter(status='cancelled').count()
    
    # Revenue metrics
    revenue_data = bookings.filter(status='completed').aggregate(
        total=Sum('total_amount'),
        avg=Avg('total_amount')
    )
    
    # Revenue by service
    revenue_by_service = list(
        bookings.filter(status='completed')
        .values('service__name')
        .annotate(
            revenue=Sum('total_amount'),
            count=Count('id')
        )
        .order_by('-revenue')[:10]
    )
    
    # Revenue trend
    revenue_trend_data = list(
        bookings.filter(status='completed')
        .annotate(date=TruncDate('start_time'))
        .values('date')
        .annotate(revenue=Sum('total_amount'))
        .order_by('date')
    )
    
    # Booking status breakdown
    booking_status_breakdown = dict(
        bookings.values('status').annotate(count=Count('id')).values_list('status', 'count')
    )
    
    # Top clients
    top_clients = list(
        bookings.filter(status='completed')
        .values('user__first_name', 'user__last_name', 'user__id')
        .annotate(
            total_spent=Sum('total_amount'),
            booking_count=Count('id')
        )
        .order_by('-total_spent')[:10]
    )
    
    # Service popularity
    service_popularity = list(
        bookings.values('service__name', 'service__id')
        .annotate(
            bookings=Count('id'),
            revenue=Sum('total_amount')
        )
        .order_by('-bookings')[:10]
    )
    
    return {
        'total_bookings': total_bookings,
        'completed_bookings': completed_bookings,
        'cancelled_bookings': cancelled_bookings,
        'revenue_data': revenue_data,
        'revenue_by_service': revenue_by_service,
        'revenue_trend_data': revenue_trend_data,
        'booking_status_breakdown': booking_status_breakdown,
        'top_clients': top_clients,
        'service_popularity': service_popularity,
    }


@sync_to_async
def get_previous_period_revenue(practitioner, prev_start, prev_end):
    """Get revenue for previous period comparison"""
    prev_bookings = Booking.objects.filter(
        practitioner=practitioner,
        start_time__date__gte=prev_start,
        start_time__date__lte=prev_end,
        status='completed'
    )
    return prev_bookings.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0')


@sync_to_async
def get_practitioner_metrics_data(practitioner, date_range):
    """Get detailed practitioner metrics"""
    # Get bookings
    bookings = Booking.objects.filter(
        practitioner=practitioner,
        start_time__date__gte=date_range.start_date,
        start_time__date__lte=date_range.end_date,
    )
    
    # Calculate metrics
    booking_stats = bookings.aggregate(
        total=Count('id'),
        completed=Count('id', filter=Q(status='completed')),
        cancelled=Count('id', filter=Q(status='cancelled')),
        no_show=Count('id', filter=Q(status='no_show')),
    )
    
    # Financial metrics
    financial_stats = bookings.filter(status='completed').aggregate(
        revenue=Sum('total_amount'),
        avg_value=Avg('total_amount'),
    )
    
    # Get refunds from orders
    refunds = Order.objects.filter(
        service__practitioner=practitioner,
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
        status='refunded'
    ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    
    # Engagement metrics from analytics
    performance_data = PractitionerPerformance.objects.filter(
        practitioner=practitioner,
        date__gte=date_range.start_date,
        date__lte=date_range.end_date,
    ).aggregate(
        profile_views=Sum('profile_views'),
        service_views=Sum('service_views'),
    )
    
    # Rating metrics
    reviews = Review.objects.filter(
        practitioner=practitioner,
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
    )
    rating_stats = reviews.aggregate(
        avg_rating=Avg('rating'),
        total_reviews=Count('id'),
        five_star=Count('id', filter=Q(rating=5)),
    )
    
    # Client metrics
    unique_clients = bookings.values('user').distinct().count()
    repeat_clients = bookings.values('user').annotate(
        count=Count('id')
    ).filter(count__gt=1).count()
    
    return {
        'booking_stats': booking_stats,
        'financial_stats': financial_stats,
        'refunds': refunds,
        'performance_data': performance_data,
        'rating_stats': rating_stats,
        'unique_clients': unique_clients,
        'repeat_clients': repeat_clients,
    }


@sync_to_async
def get_admin_dashboard_data(date_range):
    """Get admin dashboard data"""
    # Revenue by category
    revenue_by_category = list(
        Booking.objects.filter(
            start_time__date__gte=date_range.start_date,
            start_time__date__lte=date_range.end_date,
            status='completed'
        )
        .values('service__category__name')
        .annotate(revenue=Sum('total_amount'))
        .order_by('-revenue')[:10]
    )
    
    # Revenue trend
    revenue_trend_data = list(
        Booking.objects.filter(
            start_time__date__gte=date_range.start_date,
            start_time__date__lte=date_range.end_date,
            status='completed'
        )
        .annotate(date=TruncDate('start_time'))
        .values('date')
        .annotate(revenue=Sum('total_amount'))
        .order_by('date')
    )
    
    # Top practitioners
    top_practitioners = list(
        Booking.objects.filter(
            start_time__date__gte=date_range.start_date,
            start_time__date__lte=date_range.end_date,
            status='completed'
        )
        .values('practitioner__user__first_name', 'practitioner__user__last_name', 'practitioner__id')
        .annotate(
            revenue=Sum('total_amount'),
            bookings=Count('id')
        )
        .order_by('-revenue')[:10]
    )
    
    # Top services
    top_services = list(
        Booking.objects.filter(
            start_time__date__gte=date_range.start_date,
            start_time__date__lte=date_range.end_date,
        )
        .values('service__name', 'service__id')
        .annotate(
            bookings=Count('id'),
            revenue=Sum('total_amount')
        )
        .order_by('-bookings')[:10]
    )
    
    return {
        'revenue_by_category': revenue_by_category,
        'revenue_trend_data': revenue_trend_data,
        'top_practitioners': top_practitioners,
        'top_services': top_services,
    }


@sync_to_async
def get_platform_metrics_raw_data(date_range):
    """Get raw platform metrics data"""
    # User metrics
    total_users = User.objects.filter(is_active=True).count()
    new_users = User.objects.filter(
        date_joined__date__gte=date_range.start_date,
        date_joined__date__lte=date_range.end_date,
    ).count()
    
    # Active users (logged in during period)
    active_users = User.objects.filter(
        last_login__date__gte=date_range.start_date,
        last_login__date__lte=date_range.end_date,
    ).count()
    
    # Practitioner metrics
    total_practitioners = Practitioner.objects.filter(is_active=True).count()
    new_practitioners = Practitioner.objects.filter(
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
    ).count()
    
    # Active practitioners (had bookings)
    active_practitioners = Practitioner.objects.filter(
        bookings__start_time__date__gte=date_range.start_date,
        bookings__start_time__date__lte=date_range.end_date,
    ).distinct().count()
    
    # Booking metrics
    bookings = Booking.objects.filter(
        start_time__date__gte=date_range.start_date,
        start_time__date__lte=date_range.end_date,
    )
    booking_stats = bookings.aggregate(
        total=Count('id'),
        completed=Count('id', filter=Q(status='completed')),
        cancelled=Count('id', filter=Q(status='cancelled')),
    )
    
    # Financial metrics
    financial_data = bookings.filter(status='completed').aggregate(
        gross_revenue=Sum('total_amount'),
        platform_fees=Sum('platform_fee'),
    )
    
    # Refunds from orders
    refunds = Order.objects.filter(
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
        status='refunded'
    ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    
    # Service metrics
    total_services = Service.objects.filter(is_active=True).count()
    active_services = Service.objects.filter(
        bookings__start_time__date__gte=date_range.start_date,
        bookings__start_time__date__lte=date_range.end_date,
    ).distinct().count()
    
    # Average rating
    avg_rating = Review.objects.filter(
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
    ).aggregate(avg=Avg('rating'))['avg'] or 0
    
    return {
        'total_users': total_users,
        'new_users': new_users,
        'active_users': active_users,
        'total_practitioners': total_practitioners,
        'new_practitioners': new_practitioners,
        'active_practitioners': active_practitioners,
        'booking_stats': booking_stats,
        'financial_data': financial_data,
        'refunds': refunds,
        'total_services': total_services,
        'active_services': active_services,
        'avg_rating': avg_rating,
    }


@sync_to_async
def get_service_analytics_data(service, date_range):
    """Get service analytics data"""
    # Get analytics data
    analytics = ServiceAnalytics.objects.filter(
        service=service,
        date__gte=date_range.start_date,
        date__lte=date_range.end_date,
    ).aggregate(
        total_views=Sum('views'),
        total_bookings=Sum('bookings'),
        total_revenue=Sum('total_revenue'),
        avg_rating=Avg('average_rating'),
    )
    
    # Views trend
    views_trend_data = list(ServiceAnalytics.objects.filter(
        service=service,
        date__gte=date_range.start_date,
        date__lte=date_range.end_date,
    ).values('date', 'views').order_by('date'))
    
    return {
        'analytics': analytics,
        'views_trend_data': views_trend_data,
    }


@sync_to_async
def get_search_analytics_data(date_range):
    """Get search analytics data"""
    # Get search logs
    search_logs = SearchLog.objects.filter(
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
    )
    
    # Basic metrics
    total_searches = search_logs.count()
    unique_searchers = search_logs.values('user').distinct().count() + \
        search_logs.filter(user__isnull=True).values('session_id').distinct().count()
    
    searches_with_results = search_logs.filter(result_count__gt=0).count()
    searches_with_clicks = search_logs.filter(clicked_position__isnull=False).count()
    
    # Top search terms
    top_search_terms = list(
        search_logs.values('query')
        .annotate(count=Count('id'))
        .order_by('-count')[:20]
    )
    
    # Calculate rates
    avg_results = search_logs.aggregate(avg=Avg('result_count'))['avg'] or 0
    location_searches = search_logs.filter(location__isnull=False).count()
    
    return {
        'total_searches': total_searches,
        'unique_searchers': unique_searchers,
        'searches_with_results': searches_with_results,
        'searches_with_clicks': searches_with_clicks,
        'top_search_terms': top_search_terms,
        'avg_results': avg_results,
        'location_searches': location_searches,
    }


@sync_to_async
def get_financial_reports_data(report_type, pagination):
    """Get financial reports data"""
    queryset = FinancialReport.objects.all()
    
    if report_type:
        queryset = queryset.filter(report_type=report_type)
    
    queryset = queryset.order_by('-generated_at')
    
    # Paginate
    reports = list(queryset[pagination.offset:pagination.offset + pagination.limit])
    return reports


@sync_to_async
def get_realtime_metrics_data():
    """Get realtime metrics data"""
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    hour_ago = now - timedelta(hours=1)
    
    # Active users (last 15 minutes)
    active_users = User.objects.filter(
        last_login__gte=now - timedelta(minutes=15)
    ).count()
    
    # Active practitioners (have bookings now)
    active_practitioners = Booking.objects.filter(
        start_time__lte=now,
        end_time__gte=now,
        status='in_progress'
    ).values('practitioner').distinct().count()
    
    # Bookings metrics
    bookings_in_progress = Booking.objects.filter(
        start_time__lte=now,
        end_time__gte=now,
        status='in_progress'
    ).count()
    
    bookings_today = Booking.objects.filter(
        start_time__date=today_start.date()
    ).count()
    
    bookings_last_hour = Booking.objects.filter(
        created_at__gte=hour_ago
    ).count()
    
    # Revenue today
    revenue_today = Booking.objects.filter(
        start_time__date=today_start.date(),
        status='completed'
    ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    
    # Searches last hour
    searches_last_hour = SearchLog.objects.filter(
        created_at__gte=hour_ago
    ).count()
    
    # New users last hour
    new_users_last_hour = User.objects.filter(
        date_joined__gte=hour_ago
    ).count()
    
    return {
        'active_users': active_users,
        'active_practitioners': active_practitioners,
        'bookings_in_progress': bookings_in_progress,
        'bookings_today': bookings_today,
        'revenue_today': revenue_today,
        'bookings_last_hour': bookings_last_hour,
        'searches_last_hour': searches_last_hour,
        'new_users_last_hour': new_users_last_hour,
    }


@sync_to_async
def get_user_engagement_data(target_user_id, date_range):
    """Get user engagement data"""
    # Get engagement data
    engagement_data = UserEngagement.objects.filter(
        user_id=target_user_id,
        date__gte=date_range.start_date,
        date__lte=date_range.end_date,
    ).aggregate(
        total_sessions=Sum('logins'),
        total_duration=Sum('session_duration_seconds'),
        pages_viewed=Sum('pages_viewed'),
        searches=Sum('searches_performed'),
        services_viewed=Sum('services_viewed'),
        practitioners_viewed=Sum('practitioners_viewed'),
        bookings_viewed=Sum('bookings_viewed'),
    )
    
    # Get booking data
    bookings_made = Booking.objects.filter(
        user_id=target_user_id,
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
    ).count()
    
    # Get reviews written
    reviews_written = Review.objects.filter(
        user_id=target_user_id,
        created_at__date__gte=date_range.start_date,
        created_at__date__lte=date_range.end_date,
    ).count()
    
    return {
        'engagement_data': engagement_data,
        'bookings_made': bookings_made,
        'reviews_written': reviews_written,
    }


def get_date_range(time_range: TimeRange, start_date: Optional[date] = None, end_date: Optional[date] = None) -> DateRange:
    """Convert time range to specific dates"""
    today = timezone.now().date()
    
    if time_range == TimeRange.CUSTOM:
        if not start_date or not end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom range requires start_date and end_date"
            )
        return DateRange(start_date=start_date, end_date=end_date)
    
    elif time_range == TimeRange.TODAY:
        return DateRange(start_date=today, end_date=today)
    
    elif time_range == TimeRange.YESTERDAY:
        yesterday = today - timedelta(days=1)
        return DateRange(start_date=yesterday, end_date=yesterday)
    
    elif time_range == TimeRange.LAST_7_DAYS:
        return DateRange(start_date=today - timedelta(days=6), end_date=today)
    
    elif time_range == TimeRange.LAST_30_DAYS:
        return DateRange(start_date=today - timedelta(days=29), end_date=today)
    
    elif time_range == TimeRange.LAST_90_DAYS:
        return DateRange(start_date=today - timedelta(days=89), end_date=today)
    
    elif time_range == TimeRange.THIS_MONTH:
        start = today.replace(day=1)
        return DateRange(start_date=start, end_date=today)
    
    elif time_range == TimeRange.LAST_MONTH:
        last_month = today.replace(day=1) - timedelta(days=1)
        start = last_month.replace(day=1)
        return DateRange(start_date=start, end_date=last_month)
    
    elif time_range == TimeRange.THIS_YEAR:
        start = today.replace(month=1, day=1)
        return DateRange(start_date=start, end_date=today)
    
    else:
        return DateRange(start_date=today - timedelta(days=29), end_date=today)


def calculate_metric_change(current: Decimal, previous: Decimal) -> MetricValue:
    """Calculate metric value with change"""
    if previous and previous > 0:
        change_absolute = current - previous
        change_percentage = float((change_absolute / previous) * 100)
    else:
        change_absolute = current
        change_percentage = 100.0 if current > 0 else 0.0
    
    return MetricValue(
        value=current,
        change_percentage=change_percentage,
        change_absolute=change_absolute,
        previous_value=previous
    )


@router.get("/practitioner/dashboard", response_model=PractitionerDashboard)
async def get_practitioner_dashboard(
    request: PractitionerAnalyticsRequest = Depends(),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """
    Get practitioner analytics dashboard.
    
    Analytics feature requires Professional or Premium subscription tier.
    """
    from api.v1.permissions import require_analytics
    
    # Get practitioner
    if request.practitioner_id:
        # Admin viewing another practitioner
        if not current_user.is_staff:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view other practitioners' analytics"
            )
        try:
            practitioner = await get_practitioner_by_id(request.practitioner_id)
        except Practitioner.DoesNotExist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Practitioner not found"
            )
    else:
        # Current user's practitioner profile
        try:
            practitioner = await sync_to_async(lambda: current_user.practitioner_profile)()
        except Practitioner.DoesNotExist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a practitioner"
            )
    
    # Check analytics permission for non-admin users
    if not current_user.is_staff:
        await require_analytics(practitioner)
    
    # Get date range
    date_range = get_date_range(request.time_range, request.start_date, request.end_date)
    
    # Get dashboard data
    dashboard_data = await get_practitioner_dashboard_data(practitioner, date_range)
    
    total_revenue = dashboard_data['revenue_data']['total'] or Decimal('0')
    avg_booking_value = dashboard_data['revenue_data']['avg'] or Decimal('0')
    
    # Get previous period for comparison
    if request.compare_previous_period:
        period_days = (date_range.end_date - date_range.start_date).days + 1
        prev_start = date_range.start_date - timedelta(days=period_days)
        prev_end = date_range.start_date - timedelta(days=1)
        
        prev_revenue = await get_previous_period_revenue(practitioner, prev_start, prev_end)
    else:
        prev_revenue = Decimal('0')
    
    # Create summary cards
    summary_cards = [
        DashboardCard(
            title="Total Revenue",
            metric=MetricType.REVENUE,
            value=calculate_metric_change(total_revenue, prev_revenue),
            icon="currency",
            color="green"
        ),
        DashboardCard(
            title="Total Bookings",
            metric=MetricType.BOOKINGS,
            value=MetricValue(value=Decimal(dashboard_data['total_bookings'])),
            icon="calendar",
            color="blue"
        ),
        DashboardCard(
            title="Completion Rate",
            metric=MetricType.BOOKINGS,
            value=MetricValue(
                value=Decimal(dashboard_data['completed_bookings'] / dashboard_data['total_bookings'] * 100) if dashboard_data['total_bookings'] > 0 else Decimal('0')
            ),
            icon="check-circle",
            color="purple"
        ),
        DashboardCard(
            title="Average Booking Value",
            metric=MetricType.REVENUE,
            value=MetricValue(value=avg_booking_value),
            icon="trending-up",
            color="orange"
        ),
    ]
    
    # Revenue trend
    revenue_trend = [
        TimeSeriesData(date=item['date'], value=item['revenue'])
        for item in dashboard_data['revenue_trend_data']
    ]
    
    return PractitionerDashboard(
        practitioner_id=practitioner.id,
        summary_cards=summary_cards,
        revenue_by_service=dashboard_data['revenue_by_service'],
        revenue_trend=revenue_trend,
        booking_status_breakdown=dashboard_data['booking_status_breakdown'],
        bookings_by_day_of_week=[],  # TODO: Implement
        bookings_by_time_of_day=[],  # TODO: Implement
        top_clients=dashboard_data['top_clients'],
        client_acquisition_trend=[],  # TODO: Implement
        service_popularity=dashboard_data['service_popularity'],
        service_ratings=[],  # TODO: Implement from reviews
    )


@router.get("/practitioner/metrics", response_model=PractitionerMetrics)
async def get_practitioner_metrics(
    request: PractitionerAnalyticsRequest = Depends(),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get detailed practitioner metrics"""
    # Get practitioner (similar auth logic as dashboard)
    if request.practitioner_id:
        if not current_user.is_staff:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        try:
            practitioner = await get_practitioner_by_id(request.practitioner_id)
        except Practitioner.DoesNotExist:
            raise HTTPException(status_code=404, detail="Practitioner not found")
    else:
        try:
            practitioner = await sync_to_async(lambda: current_user.practitioner_profile)()
        except Practitioner.DoesNotExist:
            raise HTTPException(status_code=400, detail="User is not a practitioner")
    
    date_range = get_date_range(request.time_range, request.start_date, request.end_date)
    
    # Get metrics data
    metrics_data = await get_practitioner_metrics_data(practitioner, date_range)
    
    return PractitionerMetrics(
        practitioner_id=practitioner.id,
        date_range=date_range,
        total_bookings=metrics_data['booking_stats']['total'],
        completed_bookings=metrics_data['booking_stats']['completed'],
        cancelled_bookings=metrics_data['booking_stats']['cancelled'],
        no_show_bookings=metrics_data['booking_stats']['no_show'],
        total_revenue=metrics_data['financial_stats']['revenue'] or Decimal('0'),
        average_booking_value=metrics_data['financial_stats']['avg_value'] or Decimal('0'),
        refunds_amount=metrics_data['refunds'],
        net_revenue=(metrics_data['financial_stats']['revenue'] or Decimal('0')) - metrics_data['refunds'],
        profile_views=metrics_data['performance_data']['profile_views'] or 0,
        service_views=metrics_data['performance_data']['service_views'] or 0,
        conversion_rate=float(metrics_data['booking_stats']['total']) / float(metrics_data['performance_data']['service_views']) * 100 
            if metrics_data['performance_data']['service_views'] else 0,
        average_rating=metrics_data['rating_stats']['avg_rating'],
        total_reviews=metrics_data['rating_stats']['total_reviews'],
        five_star_reviews=metrics_data['rating_stats']['five_star'],
        unique_clients=metrics_data['unique_clients'],
        repeat_clients=metrics_data['repeat_clients'],
        client_retention_rate=float(metrics_data['repeat_clients']) / float(metrics_data['unique_clients']) * 100 if metrics_data['unique_clients'] else 0,
    )


@router.get("/admin/dashboard", response_model=AdminDashboard)
async def get_admin_dashboard(
    request: AdminAnalyticsRequest = Depends(),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get admin analytics dashboard"""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    date_range = get_date_range(request.time_range, request.start_date, request.end_date)
    
    # Platform metrics
    platform_metrics = await get_platform_metrics_data(date_range)
    
    # Get dashboard data
    dashboard_data = await get_admin_dashboard_data(date_range)
    
    # Summary cards
    summary_cards = [
        DashboardCard(
            title="Gross Revenue",
            metric=MetricType.REVENUE,
            value=MetricValue(value=platform_metrics.gross_revenue),
            icon="currency",
            color="green"
        ),
        DashboardCard(
            title="Active Users",
            metric=MetricType.ENGAGEMENT,
            value=MetricValue(value=Decimal(platform_metrics.active_users)),
            icon="users",
            color="blue"
        ),
        DashboardCard(
            title="Total Bookings",
            metric=MetricType.BOOKINGS,
            value=MetricValue(value=Decimal(platform_metrics.total_bookings)),
            icon="calendar",
            color="purple"
        ),
        DashboardCard(
            title="Platform Growth",
            metric=MetricType.ENGAGEMENT,
            value=MetricValue(value=Decimal(platform_metrics.user_retention_rate)),
            icon="trending-up",
            color="orange"
        ),
    ]
    
    # Revenue trend
    revenue_trend = [
        TimeSeriesData(date=item['date'], value=item['revenue'])
        for item in dashboard_data['revenue_trend_data']
    ]
    
    return AdminDashboard(
        platform_metrics=platform_metrics,
        summary_cards=summary_cards,
        revenue_by_category=dashboard_data['revenue_by_category'],
        revenue_by_location=[],  # TODO: Implement
        revenue_trend=revenue_trend,
        user_growth_trend=[],  # TODO: Implement
        user_activity_heatmap=[],  # TODO: Implement
        top_practitioners=dashboard_data['top_practitioners'],
        practitioner_earnings_distribution={},  # TODO: Implement
        top_services=dashboard_data['top_services'],
        service_category_breakdown=[],  # TODO: Implement
        bookings_by_location=[],  # TODO: Implement if geographic analytics requested
    )


async def get_platform_metrics_data(date_range: DateRange) -> PlatformMetrics:
    """Get platform-wide metrics"""
    # Get raw data
    data = await get_platform_metrics_raw_data(date_range)
    
    return PlatformMetrics(
        date_range=date_range,
        total_users=data['total_users'],
        new_users=data['new_users'],
        active_users=data['active_users'],
        user_retention_rate=float(data['active_users']) / float(data['total_users']) * 100 if data['total_users'] else 0,
        total_practitioners=data['total_practitioners'],
        new_practitioners=data['new_practitioners'],
        active_practitioners=data['active_practitioners'],
        total_bookings=data['booking_stats']['total'],
        completed_bookings=data['booking_stats']['completed'],
        cancelled_bookings=data['booking_stats']['cancelled'],
        booking_completion_rate=float(data['booking_stats']['completed']) / float(data['booking_stats']['total']) * 100 
            if data['booking_stats']['total'] else 0,
        gross_revenue=data['financial_data']['gross_revenue'] or Decimal('0'),
        platform_fees=data['financial_data']['platform_fees'] or Decimal('0'),
        practitioner_payouts=(data['financial_data']['gross_revenue'] or Decimal('0')) - 
            (data['financial_data']['platform_fees'] or Decimal('0')),
        refunds_total=data['refunds'],
        net_revenue=(data['financial_data']['platform_fees'] or Decimal('0')) - data['refunds'],
        total_services=data['total_services'],
        active_services=data['active_services'],
        average_service_rating=float(data['avg_rating']),
    )


@router.get("/services/{service_id}/performance", response_model=ServicePerformance)
async def get_service_performance(
    service_id: UUID,
    time_range: TimeRange = TimeRange.LAST_30_DAYS,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get service performance analytics"""
    try:
        service = await get_service_by_id(service_id)
    except Service.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Check authorization - need to check async
    practitioner_user = await sync_to_async(lambda: service.practitioner.user)()
    if not current_user.is_staff and practitioner_user != current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this service's analytics"
        )
    
    date_range = get_date_range(time_range)
    
    # Get analytics data
    data = await get_service_analytics_data(service, date_range)
    
    views_trend = [
        TimeSeriesData(date=item['date'], value=Decimal(item['views']))
        for item in data['views_trend_data']
    ]
    
    # Calculate conversion rate
    total_views = data['analytics']['total_views'] or 0
    total_bookings = data['analytics']['total_bookings'] or 0
    conversion_rate = float(total_bookings) / float(total_views) * 100 if total_views else 0
    
    return ServicePerformance(
        service_id=service.id,
        service_name=service.name,
        period=date_range,
        total_views=total_views,
        total_bookings=total_bookings,
        total_revenue=data['analytics']['total_revenue'] or Decimal('0'),
        average_rating=data['analytics']['avg_rating'],
        conversion_rate=conversion_rate,
        views_trend=views_trend,
        bookings_trend=[],  # TODO: Implement
        revenue_trend=[],  # TODO: Implement
    )


@router.get("/search/summary", response_model=SearchAnalyticsSummary)
async def get_search_analytics(
    time_range: TimeRange = TimeRange.LAST_30_DAYS,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get search analytics summary (admin only)"""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    date_range = get_date_range(time_range)
    
    # Get search analytics data
    data = await get_search_analytics_data(date_range)
    
    # Calculate rates
    ctr = float(data['searches_with_clicks']) / float(data['total_searches']) * 100 if data['total_searches'] else 0
    
    # Filter usage
    filter_usage = {}
    # TODO: Aggregate filter usage from JSON field
    
    return SearchAnalyticsSummary(
        date_range=date_range,
        total_searches=data['total_searches'],
        unique_searchers=data['unique_searchers'],
        searches_with_results=data['searches_with_results'],
        searches_with_clicks=data['searches_with_clicks'],
        searches_with_bookings=0,  # TODO: Track conversions
        top_search_terms=data['top_search_terms'],
        trending_searches=[],
        average_results_per_search=float(data['avg_results']),
        click_through_rate=ctr,
        conversion_rate=0.0,  # TODO: Implement
        most_used_filters=filter_usage,
        location_searches=data['location_searches'],
    )


@router.get("/financial/reports", response_model=List[FinancialReportSummary])
async def list_financial_reports(
    report_type: Optional[ReportType] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """List financial reports (admin only)"""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get reports data
    reports = await get_financial_reports_data(report_type, pagination)
    
    return [
        FinancialReportSummary(
            report_id=report.id,
            report_type=report.report_type,
            start_date=report.start_date,
            end_date=report.end_date,
            gross_revenue=report.total_revenue,
            platform_fees=report.platform_fees,
            payment_processing_fees=Decimal('0'),  # TODO: Add to model
            practitioner_payouts=report.total_payouts,
            affiliate_commissions=Decimal('0'),  # TODO: Add to model
            refunds_amount=report.refunds_amount,
            chargebacks_amount=Decimal('0'),  # TODO: Add to model
            tax_collected=report.tax_collected,
            net_revenue=report.net_income,
            profit_margin=float(report.net_income / report.total_revenue * 100) 
                if report.total_revenue else 0,
            generated_at=report.generated_at,
        )
        for report in reports
    ]


@router.get("/realtime", response_model=RealtimeMetrics)
async def get_realtime_metrics(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get real-time platform metrics (admin only)"""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get realtime metrics data
    data = await get_realtime_metrics_data()
    
    return RealtimeMetrics(
        active_users=data['active_users'],
        active_practitioners=data['active_practitioners'],
        bookings_in_progress=data['bookings_in_progress'],
        bookings_today=data['bookings_today'],
        revenue_today=data['revenue_today'],
        bookings_last_hour=data['bookings_last_hour'],
        searches_last_hour=data['searches_last_hour'],
        new_users_last_hour=data['new_users_last_hour'],
    )


@router.post("/export", response_model=AnalyticsExportResponse)
async def export_analytics(
    export_request: ExportAnalyticsRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Export analytics data"""
    # Check permissions based on report type
    if export_request.report_type.startswith('admin_') and not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # TODO: Implement actual export logic
    # This would typically:
    # 1. Queue a background task
    # 2. Generate the report in the requested format
    # 3. Upload to S3/storage
    # 4. Send email if requested
    
    export_id = UUID('12345678-1234-5678-1234-567812345678')  # Mock ID
    
    return AnalyticsExportResponse(
        export_id=export_id,
        status="processing",
        message="Export queued for processing. You will receive an email when ready.",
    )


@router.get("/user-engagement", response_model=UserEngagementMetrics)
async def get_user_engagement(
    user_id: Optional[UUID] = None,
    time_range: TimeRange = TimeRange.LAST_30_DAYS,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get user engagement metrics"""
    # Check authorization
    if user_id and user_id != current_user.id and not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other users' engagement"
        )
    
    target_user_id = user_id or current_user.id
    date_range = get_date_range(time_range)
    
    # Get engagement data
    data = await get_user_engagement_data(target_user_id, date_range)
    
    # Calculate metrics
    total_sessions = data['engagement_data']['total_sessions'] or 0
    avg_session_duration = data['engagement_data']['total_duration'] / total_sessions if total_sessions else 0
    pages_per_session = data['engagement_data']['pages_viewed'] / total_sessions if total_sessions else 0
    
    # Simple engagement score (0-100)
    engagement_score = min(100, (
        (total_sessions * 2) +
        (pages_per_session * 5) +
        (data['bookings_made'] * 20) +
        (data['reviews_written'] * 10)
    ))
    
    return UserEngagementMetrics(
        user_id=target_user_id,
        date_range=date_range,
        total_sessions=total_sessions,
        average_session_duration=int(avg_session_duration),
        pages_per_session=float(pages_per_session),
        bounce_rate=0.0,  # TODO: Implement
        searches_performed=data['engagement_data']['searches'] or 0,
        services_viewed=data['engagement_data']['services_viewed'] or 0,
        practitioners_viewed=data['engagement_data']['practitioners_viewed'] or 0,
        bookings_made=data['bookings_made'],
        reviews_written=data['reviews_written'],
        engagement_score=float(engagement_score),
    )