from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, F, Count, Sum
from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from streams.models import (
    Stream, StreamPost, StreamSubscription, StreamPostMedia,
    LiveStream, StreamSchedule, LiveStreamViewer, LiveStreamAnalytics,
    StreamCategory, StreamAnalytics, StreamPostComment, StreamPostSave
)
from rooms.models import Room, RoomTemplate, RoomToken, RoomRecording
from rooms.livekit.tokens import generate_room_token
from .serializers import (
    StreamSerializer, StreamPostSerializer, StreamSubscriptionSerializer,
    LiveStreamSerializer, LiveStreamCreateSerializer, StreamScheduleSerializer,
    LiveStreamViewerSerializer, LiveStreamAnalyticsSerializer,
    StreamCategorySerializer, StreamAnalyticsSerializer,
    RoomRecordingSerializer, StreamPostCommentSerializer
)
from .permissions import IsPractitionerOwner, IsStreamOwner, CanAccessStream
from .views_media import StreamPostMediaMixin


class StreamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing content streams.
    """
    serializer_class = StreamSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_featured', 'practitioner', 'categories']
    search_fields = ['title', 'tagline', 'description', 'practitioner__display_name']
    ordering_fields = ['created_at', 'subscriber_count', 'post_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = Stream.objects.select_related('practitioner').prefetch_related('categories')
        
        # Filter by launched status
        if self.request.query_params.get('launched_only') == 'true':
            queryset = queryset.filter(launched_at__isnull=False, launched_at__lte=timezone.now())
        
        # Filter by subscription status for authenticated users
        if self.request.user.is_authenticated:
            subscribed = self.request.query_params.get('subscribed')
            if subscribed == 'true':
                queryset = queryset.filter(
                    subscriptions__user=self.request.user,
                    subscriptions__status='active'
                )
            elif subscribed == 'false':
                queryset = queryset.exclude(
                    subscriptions__user=self.request.user,
                    subscriptions__status='active'
                )
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsPractitionerOwner()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Set the practitioner from the authenticated user when creating a stream."""
        if hasattr(self.request.user, 'practitioner_profile') and self.request.user.practitioner_profile:
            serializer.save(practitioner=self.request.user.practitioner_profile)
        else:
            raise serializers.ValidationError("User must be a practitioner to create streams")
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsStreamOwner])
    def launch(self, request, pk=None):
        """Launch a stream, making it publicly visible."""
        stream = self.get_object()
        
        if stream.is_launched:
            return Response(
                {'error': 'Stream is already launched'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stream.launched_at = timezone.now()
        stream.save()
        
        return Response({
            'message': 'Stream launched successfully',
            'launched_at': stream.launched_at
        })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a stream."""
        stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timezone.timedelta(days=days)
        
        analytics = stream.analytics.filter(
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        serializer = StreamAnalyticsSerializer(analytics, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def live_streams(self, request, pk=None):
        """Get live streams for a content stream."""
        stream = self.get_object()
        
        queryset = stream.live_streams.select_related('room', 'practitioner')
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        if request.query_params.get('upcoming') == 'true':
            queryset = queryset.filter(
                scheduled_start__gte=timezone.now(),
                status='scheduled'
            )
        
        queryset = queryset.order_by('-scheduled_start')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = LiveStreamSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = LiveStreamSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsStreamOwner])
    def pricing(self, request, pk=None):
        """Update stream pricing."""
        stream = self.get_object()
        
        # Validate pricing data
        entry_price = request.data.get('entry_tier_price_cents')
        premium_price = request.data.get('premium_tier_price_cents')
        
        if entry_price is None or premium_price is None:
            return Response(
                {'error': 'Both entry_tier_price_cents and premium_tier_price_cents are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate prices
        try:
            entry_price = int(entry_price)
            premium_price = int(premium_price)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Prices must be integers (in cents)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if entry_price < 100:  # Minimum $1
            return Response(
                {'error': 'Entry tier price must be at least $1 (100 cents)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if premium_price <= entry_price:
            return Response(
                {'error': 'Premium tier price must be higher than entry tier price'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize Stripe
        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Create or update Stripe Product
            if not stream.stripe_product_id:
                # Create new product
                product = stripe.Product.create(
                    name=f"{stream.title} Subscription",
                    description=f"Subscription to {stream.practitioner.display_name}'s stream",
                    metadata={
                        'stream_id': str(stream.id),
                        'practitioner_id': str(stream.practitioner.id)
                    }
                )
                stream.stripe_product_id = product.id
            
            # Create new Price objects (prices are immutable in Stripe)
            # Entry tier
            entry_stripe_price = stripe.Price.create(
                product=stream.stripe_product_id,
                unit_amount=entry_price,
                currency='usd',
                recurring={'interval': 'month'},
                metadata={
                    'tier': 'entry',
                    'stream_id': str(stream.id)
                }
            )
            
            # Premium tier
            premium_stripe_price = stripe.Price.create(
                product=stream.stripe_product_id,
                unit_amount=premium_price,
                currency='usd',
                recurring={'interval': 'month'},
                metadata={
                    'tier': 'premium',
                    'stream_id': str(stream.id)
                }
            )
            
            # Update stream with new prices
            stream.entry_tier_price_cents = entry_price
            stream.premium_tier_price_cents = premium_price
            stream.stripe_entry_price_id = entry_stripe_price.id
            stream.stripe_premium_price_id = premium_stripe_price.id
            stream.save()
            
            return Response({
                'message': 'Pricing updated successfully',
                'entry_tier_price_cents': stream.entry_tier_price_cents,
                'premium_tier_price_cents': stream.premium_tier_price_cents
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Stripe error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def subscribe(self, request, pk=None):
        """Subscribe to a stream."""
        stream = self.get_object()
        
        # Get tier
        tier = request.data.get('tier')
        if tier not in ['free', 'entry', 'premium']:
            return Response(
                {'error': 'Invalid tier. Must be free, entry, or premium'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already subscribed
        existing_sub = StreamSubscription.objects.filter(
            user=request.user,
            stream=stream,
            status__in=['active', 'past_due']
        ).first()
        
        if existing_sub:
            return Response(
                {'error': 'You already have an active subscription to this stream'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Handle free tier
        if tier == 'free':
            now = timezone.now()
            # For free tier, set a far future end date (e.g., 100 years)
            subscription = StreamSubscription.objects.create(
                user=request.user,
                stream=stream,
                tier='free',
                status='active',
                started_at=now,
                current_period_start=now,
                current_period_end=now + timezone.timedelta(days=36500)  # ~100 years
            )
            
            # Update subscriber counts
            stream.subscriber_count = stream.subscriptions.filter(status='active').count()
            stream.save()
            
            serializer = StreamSubscriptionSerializer(subscription)
            return Response({
                'message': 'Successfully subscribed to free tier',
                'subscription': serializer.data
            })
        
        # Handle paid tiers
        # Validate payment method
        payment_method_id = request.data.get('payment_method_id')
        if not payment_method_id:
            return Response(
                {'error': 'Payment method is required for paid tiers'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the appropriate price ID
        if tier == 'entry':
            price_id = stream.stripe_entry_price_id
            price_cents = stream.entry_tier_price_cents
        else:  # premium
            price_id = stream.stripe_premium_price_id
            price_cents = stream.premium_tier_price_cents
        
        if not price_id:
            return Response(
                {'error': 'Pricing not configured for this stream. Please contact the practitioner.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize Stripe
        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Ensure user has Stripe customer
            from users.models import UserPaymentProfile
            payment_profile, created = UserPaymentProfile.objects.get_or_create(
                user=request.user
            )
            
            if not payment_profile.stripe_customer_id:
                # Create Stripe customer
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name(),
                    metadata={'user_id': str(request.user.id)}
                )
                payment_profile.stripe_customer_id = customer.id
                payment_profile.save()
            
            # Create Stripe subscription
            stripe_subscription = stripe.Subscription.create(
                customer=payment_profile.stripe_customer_id,
                items=[{'price': price_id}],
                payment_behavior='default_incomplete',
                payment_settings={
                    'payment_method_types': ['card'],
                    'save_default_payment_method': 'on_subscription'
                },
                expand=['latest_invoice.payment_intent'],
                metadata={
                    'type': 'stream',
                    'stream_id': str(stream.id),
                    'user_id': str(request.user.id),
                    'tier': tier
                },
                application_fee_percent=15  # Platform takes 15%
            )
            
            # Create local subscription record
            subscription = StreamSubscription.objects.create(
                user=request.user,
                stream=stream,
                tier=tier,
                status='incomplete',
                stripe_subscription_id=stripe_subscription.id,
                stripe_customer_id=payment_profile.stripe_customer_id,
                stripe_price_id=price_id,
                price_cents=price_cents,
                current_period_start=timezone.datetime.fromtimestamp(
                    stripe_subscription.current_period_start,
                    tz=timezone.utc
                ),
                current_period_end=timezone.datetime.fromtimestamp(
                    stripe_subscription.current_period_end,
                    tz=timezone.utc
                ),
                started_at=timezone.now()
            )
            
            serializer = StreamSubscriptionSerializer(subscription)
            
            # Return with client secret for payment confirmation
            return Response({
                'subscription': serializer.data,
                'client_secret': stripe_subscription.latest_invoice.payment_intent.client_secret
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Payment error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unsubscribe(self, request, pk=None):
        """Cancel subscription to a stream."""
        stream = self.get_object()
        
        # Find active subscription
        subscription = StreamSubscription.objects.filter(
            user=request.user,
            stream=stream,
            status__in=['active', 'past_due']
        ).first()
        
        if not subscription:
            return Response(
                {'error': 'No active subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Handle free tier cancellation
        if subscription.tier == 'free':
            subscription.status = 'canceled'
            subscription.canceled_at = timezone.now()
            subscription.ends_at = timezone.now()
            subscription.save()
            
            # Update subscriber counts
            stream.subscriber_count = stream.subscriptions.filter(status='active').count()
            stream.save()
            
            return Response({'message': 'Successfully unsubscribed'})
        
        # Handle paid tier cancellation
        if not subscription.stripe_subscription_id:
            return Response(
                {'error': 'Invalid subscription state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel in Stripe
        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Cancel at period end
            stripe_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
            
            # Update local subscription
            subscription.canceled_at = timezone.now()
            subscription.ends_at = subscription.current_period_end
            subscription.save()
            
            return Response({
                'message': 'Subscription will be canceled at the end of the current billing period',
                'ends_at': subscription.ends_at
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Failed to cancel subscription: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], 
            url_path='subscription/change-tier',
            permission_classes=[IsAuthenticated])
    def change_tier(self, request, pk=None):
        """Change subscription tier."""
        stream = self.get_object()
        
        # Get new tier
        new_tier = request.data.get('tier')
        if new_tier not in ['free', 'entry', 'premium']:
            return Response(
                {'error': 'Invalid tier. Must be free, entry, or premium'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find active subscription
        subscription = StreamSubscription.objects.filter(
            user=request.user,
            stream=stream,
            status='active'
        ).first()
        
        if not subscription:
            return Response(
                {'error': 'No active subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if subscription.tier == new_tier:
            return Response(
                {'error': 'Already subscribed to this tier'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store previous tier
        previous_tier = subscription.tier
        
        # Handle downgrade to free
        if new_tier == 'free':
            if subscription.stripe_subscription_id:
                # Cancel Stripe subscription
                import stripe
                from django.conf import settings
                stripe.api_key = settings.STRIPE_SECRET_KEY
                
                try:
                    stripe.Subscription.delete(subscription.stripe_subscription_id)
                except stripe.error.StripeError as e:
                    return Response(
                        {'error': f'Failed to cancel paid subscription: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Update subscription
            subscription.previous_tier = previous_tier
            subscription.tier = 'free'
            subscription.tier_changed_at = timezone.now()
            subscription.stripe_subscription_id = None
            subscription.stripe_price_id = None
            subscription.price_cents = 0
            subscription.save()
            
            return Response({
                'message': 'Successfully downgraded to free tier',
                'subscription': StreamSubscriptionSerializer(subscription).data
            })
        
        # Handle paid tier changes
        if subscription.tier == 'free':
            # Upgrade from free - create new subscription
            return self.subscribe(request, pk=pk)
        
        # Change between paid tiers
        if not subscription.stripe_subscription_id:
            return Response(
                {'error': 'Invalid subscription state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get new price ID
        if new_tier == 'entry':
            new_price_id = stream.stripe_entry_price_id
            new_price_cents = stream.entry_tier_price_cents
        else:  # premium
            new_price_id = stream.stripe_premium_price_id
            new_price_cents = stream.premium_tier_price_cents
        
        if not new_price_id:
            return Response(
                {'error': 'Pricing not configured for this tier'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update Stripe subscription
        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Retrieve current subscription
            stripe_subscription = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            
            # Update subscription item with new price
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                items=[{
                    'id': stripe_subscription['items']['data'][0].id,
                    'price': new_price_id
                }],
                proration_behavior='always_invoice'  # Prorate the change
            )
            
            # Update local subscription
            subscription.previous_tier = previous_tier
            subscription.tier = new_tier
            subscription.tier_changed_at = timezone.now()
            subscription.stripe_price_id = new_price_id
            subscription.price_cents = new_price_cents
            subscription.save()
            
            # Update subscriber counts
            stream.paid_subscriber_count = stream.subscriptions.filter(
                status='active',
                tier__in=['entry', 'premium']
            ).count()
            stream.save()
            
            return Response({
                'message': f'Successfully changed to {new_tier} tier',
                'subscription': StreamSubscriptionSerializer(subscription).data
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Failed to change subscription: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class LiveStreamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing live streaming sessions.
    """
    serializer_class = LiveStreamSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'stream', 'practitioner', 'tier_level', 'is_public']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['scheduled_start', 'created_at', 'current_viewers']
    ordering = ['-scheduled_start']
    
    def get_queryset(self):
        queryset = LiveStream.objects.select_related(
            'stream', 'practitioner', 'room'
        ).prefetch_related('viewers')
        
        # Filter by time
        time_filter = self.request.query_params.get('time_filter')
        if time_filter == 'live':
            queryset = queryset.filter(status='live')
        elif time_filter == 'upcoming':
            queryset = queryset.filter(
                status='scheduled',
                scheduled_start__gte=timezone.now()
            )
        elif time_filter == 'past':
            queryset = queryset.filter(status='ended')
        
        # Filter by accessibility for user
        if self.request.user.is_authenticated:
            accessible = self.request.query_params.get('accessible')
            if accessible == 'true':
                # Complex query to check accessibility
                user_subscriptions = StreamSubscription.objects.filter(
                    user=self.request.user,
                    status='active'
                ).values_list('stream_id', 'tier')
                
                accessible_conditions = Q(is_public=True)
                for stream_id, tier in user_subscriptions:
                    if tier == 'premium':
                        accessible_conditions |= Q(stream_id=stream_id)
                    elif tier == 'entry':
                        accessible_conditions |= Q(stream_id=stream_id, tier_level__in=['free', 'entry'])
                    elif tier == 'free':
                        accessible_conditions |= Q(stream_id=stream_id, tier_level='free')
                
                queryset = queryset.filter(accessible_conditions)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsPractitionerOwner()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LiveStreamCreateSerializer
        return LiveStreamSerializer
    
    def perform_create(self, serializer):
        live_stream = serializer.save()
        
        # Create associated LiveKit room
        room_template = RoomTemplate.objects.filter(
            room_type='broadcast',
            is_active=True,
            is_default=True
        ).first()
        
        room = Room.objects.create(
            name=f"Live: {live_stream.title}",
            room_type='broadcast',
            template=room_template,
            scheduled_start=live_stream.scheduled_start,
            scheduled_end=live_stream.scheduled_end,
            recording_enabled=live_stream.record_stream
        )
        
        live_stream.room = room
        live_stream.save()
        
        # TODO: Schedule temporal workflow for stream reminders
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def go_live(self, request, pk=None):
        """Start a live stream."""
        live_stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        if not live_stream.can_start:
            return Response(
                {'error': 'Stream cannot be started yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if live_stream.status != 'scheduled':
            return Response(
                {'error': f'Stream is already {live_stream.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create LiveKit room if not exists
        if not live_stream.room:
            room_template = RoomTemplate.objects.filter(
                room_type='broadcast',
                is_active=True,
                is_default=True
            ).first()
            
            room = Room.objects.create(
                name=f"Live: {live_stream.title}",
                room_type='broadcast',
                template=room_template,
                scheduled_start=live_stream.scheduled_start,
                scheduled_end=live_stream.scheduled_end,
                recording_enabled=live_stream.record_stream
            )
            live_stream.room = room
        
        # Start the room in LiveKit
        # Note: For now, we'll skip the actual LiveKit API call since it requires async
        # In production, this would be handled by a background task or async view
        try:
            # Mark room as created in LiveKit
            live_stream.room.livekit_room_sid = f"RM_{live_stream.room.livekit_room_name}"
            
            live_stream.room.status = 'active'
            live_stream.room.actual_start = timezone.now()
            live_stream.room.save()
        except Exception as e:
            return Response(
                {'error': f'Failed to create room: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update live stream status
        live_stream.status = 'live'
        live_stream.actual_start = timezone.now()
        live_stream.save()
        
        # Generate host token
        token = generate_room_token(
            room_name=live_stream.room.livekit_room_name,
            participant_name=request.user.get_full_name(),
            participant_identity=f"host-{request.user.id}",
            is_host=True
        )
        
        # Save token
        RoomToken.objects.create(
            room=live_stream.room,
            user=request.user,
            token=token['token'],
            identity=f"host-{request.user.id}",
            role='host',
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )
        
        return Response({
            'message': 'Stream is now live',
            'room': {
                'name': live_stream.room.livekit_room_name,
                'token': token['token'],
                'url': token['url']
            }
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def end_stream(self, request, pk=None):
        """End a live stream."""
        live_stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        if live_stream.status != 'live':
            return Response(
                {'error': 'Stream is not live'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # End the room in LiveKit
        if live_stream.room:
            # Note: For now, we'll skip the actual LiveKit API call since it requires async
            # In production, this would be handled by a background task or async view
            
            live_stream.room.status = 'ended'
            live_stream.room.actual_end = timezone.now()
            live_stream.room.save()
        
        # Update live stream status
        live_stream.status = 'ended'
        live_stream.actual_end = timezone.now()
        live_stream.save()
        
        # Update viewer records
        live_stream.viewers.filter(left_at__isnull=True).update(left_at=timezone.now())
        
        # Trigger analytics computation
        # TODO: Schedule temporal workflow for analytics
        
        return Response({
            'message': 'Stream ended successfully',
            'duration_minutes': live_stream.duration_minutes
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        """Join a live stream as a viewer."""
        live_stream = self.get_object()
        
        # Check if user can access
        can_access = False
        if live_stream.is_public:
            can_access = True
        else:
            subscription = live_stream.stream.subscriptions.filter(
                user=request.user,
                status='active'
            ).first()
            if subscription and subscription.has_access_to_tier(live_stream.tier_level):
                can_access = True
        
        if not can_access:
            return Response(
                {'error': 'You do not have access to this stream'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if live_stream.status != 'live':
            return Response(
                {'error': 'Stream is not live'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create viewer record
        viewer, created = LiveStreamViewer.objects.get_or_create(
            live_stream=live_stream,
            user=request.user,
            left_at__isnull=True,
            defaults={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
        )
        
        # Update viewer count
        if created:
            live_stream.current_viewers = F('current_viewers') + 1
            live_stream.total_viewers = F('total_viewers') + 1
            live_stream.save()
            
            # Update peak viewers if necessary
            if live_stream.current_viewers > live_stream.peak_viewers:
                live_stream.peak_viewers = live_stream.current_viewers
                live_stream.save()
        
        # Generate viewer token
        token = generate_room_token(
            room_name=live_stream.room.livekit_room_name,
            participant_name=request.user.get_full_name(),
            participant_identity=f"viewer-{request.user.id}",
            is_host=False
        )
        
        # Save token
        RoomToken.objects.create(
            room=live_stream.room,
            user=request.user,
            token=token['token'],
            identity=f"viewer-{request.user.id}",
            role='viewer',
            expires_at=timezone.now() + timezone.timedelta(hours=4)
        )
        
        return Response({
            'room': {
                'name': live_stream.room.livekit_room_name,
                'token': token['token'],
                'url': token['url']
            },
            'stream': {
                'title': live_stream.title,
                'current_viewers': live_stream.current_viewers
            }
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def leave(self, request, pk=None):
        """Leave a live stream."""
        live_stream = self.get_object()
        
        # Update viewer record
        viewer = LiveStreamViewer.objects.filter(
            live_stream=live_stream,
            user=request.user,
            left_at__isnull=True
        ).first()
        
        if viewer:
            viewer.left_at = timezone.now()
            viewer.save()
            
            # Update viewer count
            live_stream.current_viewers = F('current_viewers') - 1
            live_stream.save()
        
        return Response({'message': 'Left stream successfully'})
    
    @action(detail=True, methods=['get'])
    def viewers(self, request, pk=None):
        """Get current viewers of a live stream."""
        live_stream = self.get_object()
        
        # Check permissions (only host can see viewer list)
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        viewers = live_stream.viewers.filter(
            left_at__isnull=True
        ).select_related('user')
        
        serializer = LiveStreamViewerSerializer(viewers, many=True)
        return Response({
            'count': viewers.count(),
            'viewers': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a live stream."""
        live_stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        # Get or create analytics
        analytics, created = LiveStreamAnalytics.objects.get_or_create(
            live_stream=live_stream
        )
        
        if live_stream.status == 'ended' and not analytics.computed_at:
            # Compute analytics
            viewers = live_stream.viewers.all()
            
            analytics.total_viewers = viewers.count()
            analytics.unique_viewers = viewers.values('user').distinct().count()
            analytics.peak_concurrent_viewers = live_stream.peak_viewers
            
            # Calculate average view duration
            durations = viewers.exclude(duration_seconds=0).values_list('duration_seconds', flat=True)
            if durations:
                analytics.average_view_duration_seconds = sum(durations) / len(durations)
            
            # Engagement metrics
            analytics.total_chat_messages = viewers.aggregate(
                total=Count('chat_messages_sent')
            )['total'] or 0
            analytics.total_reactions = viewers.aggregate(
                total=Count('reactions_sent')
            )['total'] or 0
            analytics.unique_chatters = viewers.filter(
                chat_messages_sent__gt=0
            ).count()
            
            # Viewer breakdown by tier
            for viewer in viewers.select_related('user'):
                subscription = live_stream.stream.subscriptions.filter(
                    user=viewer.user,
                    status='active'
                ).first()
                
                if not subscription:
                    analytics.non_subscriber_viewers += 1
                elif subscription.tier == 'free':
                    analytics.free_tier_viewers += 1
                elif subscription.tier == 'entry':
                    analytics.entry_tier_viewers += 1
                elif subscription.tier == 'premium':
                    analytics.premium_tier_viewers += 1
            
            analytics.computed_at = timezone.now()
            analytics.save()
        
        serializer = LiveStreamAnalyticsSerializer(analytics)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def recordings(self, request, pk=None):
        """Get recordings for a live stream."""
        live_stream = self.get_object()
        
        if not live_stream.room:
            return Response({'recordings': []})
        
        recordings = live_stream.room.recordings.all()
        serializer = RoomRecordingSerializer(recordings, many=True)
        return Response({'recordings': serializer.data})


class StreamScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing stream schedules.
    """
    serializer_class = StreamScheduleSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['stream', 'is_active', 'tier_level']
    ordering_fields = ['created_at', 'next_occurrence']
    ordering = ['next_occurrence']
    
    def get_queryset(self):
        queryset = StreamSchedule.objects.select_related('stream__practitioner')
        
        # Filter by practitioner if specified
        practitioner_id = self.request.query_params.get('practitioner')
        if practitioner_id:
            queryset = queryset.filter(stream__practitioner_id=practitioner_id)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsStreamOwner()]
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsStreamOwner])
    def generate_streams(self, request, pk=None):
        """Generate scheduled live streams from this schedule."""
        schedule = self.get_object()
        
        # TODO: Implement recurrence rule parsing and stream generation
        # This would typically be done by a background task
        
        return Response({
            'message': 'Stream generation scheduled',
            'schedule_id': schedule.id
        })


class StreamCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for stream categories (read-only).
    """
    queryset = StreamCategory.objects.filter(is_active=True).order_by('order', 'name')
    serializer_class = StreamCategorySerializer
    permission_classes = [AllowAny]
    
    @action(detail=True, methods=['get'])
    def streams(self, request, pk=None):
        """Get streams in this category."""
        category = self.get_object()
        streams = category.streams.filter(
            is_active=True,
            launched_at__isnull=False
        ).select_related('practitioner')
        
        page = self.paginate_queryset(streams)
        if page is not None:
            serializer = StreamSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = StreamSerializer(streams, many=True, context={'request': request})
        return Response(serializer.data)


class UserStreamSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for user's stream subscriptions.
    """
    serializer_class = StreamSubscriptionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'tier', 'stream__practitioner']
    ordering_fields = ['created_at', 'current_period_end', 'stream__title']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get subscriptions for the authenticated user."""
        return StreamSubscription.objects.filter(
            user=self.request.user
        ).select_related('stream__practitioner').prefetch_related('stream__categories')
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active subscriptions."""
        queryset = self.get_queryset().filter(status='active')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get subscriptions expiring in the next 7 days."""
        cutoff = timezone.now() + timezone.timedelta(days=7)
        queryset = self.get_queryset().filter(
            status='active',
            current_period_end__lte=cutoff,
            canceled_at__isnull=True  # Not already canceled
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

@extend_schema_view(
    list=extend_schema(tags=['Stream Posts']),
    create=extend_schema(
        tags=['Stream Posts'],
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'stream': {'type': 'integer', 'description': 'Stream ID'},
                    'title': {'type': 'string', 'description': 'Post title'},
                    'content': {'type': 'string', 'description': 'Post content'},
                    'post_type': {'type': 'string', 'enum': ['post', 'gallery', 'video', 'audio', 'link', 'poll']},
                    'tier_level': {'type': 'string', 'enum': ['free', 'entry', 'premium']},
                    'is_published': {'type': 'boolean'},
                    'tags': {'type': 'string', 'description': 'JSON array of tags'},
                    'allow_comments': {'type': 'boolean'},
                    'allow_tips': {'type': 'boolean'},
                    'media_files[]': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}},
                    'media_captions[]': {'type': 'array', 'items': {'type': 'string'}}
                }
            },
            'application/json': StreamPostSerializer,
        },
        description="Create a new stream post. Supports both JSON and multipart/form-data for file uploads."
    ),
    retrieve=extend_schema(tags=['Stream Posts']),
    update=extend_schema(tags=['Stream Posts']),
    partial_update=extend_schema(tags=['Stream Posts']),
    destroy=extend_schema(tags=['Stream Posts']),
    like=extend_schema(tags=['Stream Posts'], description="Like or unlike a stream post"),
    save=extend_schema(tags=['Stream Posts'], description="Save or unsave a stream post"), 
    view=extend_schema(tags=['Stream Posts'], description="Track a view on a stream post"),
    saved=extend_schema(tags=['Stream Posts'], description="Get user's saved stream posts"),
    comments=extend_schema(
        tags=['Stream Posts'], 
        description="Get comments or create a new comment on a stream post",
        responses={
            200: StreamPostCommentSerializer(many=True),
            201: StreamPostCommentSerializer
        }
    ),
    delete_comment=extend_schema(
        tags=['Stream Posts'], 
        description="Delete a comment on a stream post"
    )
)
class StreamPostViewSet(StreamPostMediaMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing stream posts.
    """
    serializer_class = StreamPostSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # Support file uploads
    lookup_field = 'public_uuid'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tier_level', 'post_type', 'is_published', 'is_pinned']
    search_fields = ['title', 'content', 'tags']
    ordering_fields = ['created_at', 'published_at', 'like_count', 'view_count']
    ordering = ['-published_at', '-created_at']
    
    def get_queryset(self):
        """Get posts for a specific stream."""
        # Get stream_id from query params
        stream_id = self.request.query_params.get('stream')
        
        # Base queryset
        if stream_id:
            queryset = StreamPost.objects.filter(stream_id=stream_id)
        else:
            # If no stream specified, return all posts user can access
            queryset = StreamPost.objects.all()
        
        # Filter based on permissions and subscriptions
        if self.request.user.is_authenticated:
            # Get practitioner's own posts
            own_posts = queryset.filter(stream__practitioner=self.request.user.practitioner_profile) if hasattr(self.request.user, 'practitioner_profile') else StreamPost.objects.none()
            
            # Get posts from subscribed streams
            subscribed_streams = StreamSubscription.objects.filter(
                user=self.request.user,
                status='active'
            ).values_list('stream_id', 'tier')
            
            # Build query for accessible posts
            accessible_posts = Q(tier_level='free', is_published=True)  # Free posts
            
            for stream_id, tier in subscribed_streams:
                if tier == 'premium':
                    accessible_posts |= Q(stream_id=stream_id, is_published=True)
                elif tier == 'entry':
                    accessible_posts |= Q(stream_id=stream_id, tier_level__in=['free', 'entry'], is_published=True)
                else:  # free
                    accessible_posts |= Q(stream_id=stream_id, tier_level='free', is_published=True)
            
            # Combine own posts (all) and accessible posts
            queryset = queryset.filter(Q(id__in=own_posts) | accessible_posts)
        else:
            # Not authenticated, show all published posts (but can_access will be false for premium)
            queryset = queryset.filter(is_published=True)
        
        return queryset.select_related('stream__practitioner').prefetch_related('media')
    
    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsStreamOwner()]
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Create a new stream post with optional media uploads."""
        try:
            # Debug logging
            print(f"DEBUG POST CREATE: request.data keys: {list(request.data.keys())}")
            print(f"DEBUG POST CREATE: request.FILES keys: {list(request.FILES.keys())}")
            print(f"DEBUG POST CREATE: Content-Type: {request.content_type}")
            
            # Get stream_id from request data
            stream_id = request.data.get('stream')
            print(f"DEBUG POST CREATE: stream_id = {stream_id}")
            
            if not stream_id:
                return Response(
                    {'error': f'Stream ID is required. Received data keys: {list(request.data.keys())}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            import traceback
            print(f"ERROR in create method start: {e}")
            print(f"ERROR traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Server error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        stream = get_object_or_404(Stream, pk=stream_id)
        
        # Verify user owns the stream
        if not (hasattr(request.user, 'practitioner_profile') and 
                stream.practitioner == request.user.practitioner_profile):
            return Response(
                {'error': 'You can only create posts for your own stream'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Handle file uploads
        media_files = []
        media_captions = []
        
        # Extract media files from request
        for key in request.FILES:
            print(f"DEBUG: Found file key: {key}")
            if key.startswith('media_files['):
                try:
                    index = key.split('[')[1].split(']')[0]
                    media_files.append((int(index), request.FILES[key]))
                    print(f"DEBUG: Added media file at index {index}")
                except Exception as e:
                    print(f"DEBUG: Error parsing file key {key}: {e}")
                
        # Sort by index to maintain order
        media_files.sort(key=lambda x: x[0])
        
        # Extract captions
        for key in request.data:
            if key.startswith('media_captions['):
                index = key.split('[')[1].split(']')[0]
                media_captions.append((int(index), request.data[key]))
        
        media_captions.sort(key=lambda x: x[0])
        caption_dict = {idx: caption for idx, caption in media_captions}
        
        # Parse tags if they're JSON string
        tags = request.data.get('tags', [])
        if isinstance(tags, str):
            try:
                import json
                tags = json.loads(tags)
            except:
                tags = []
        
        # Create the post
        with transaction.atomic():
            # Prepare post data
            post_data = {
                'stream': stream.id,
                'title': request.data.get('title', ''),
                'content': request.data.get('content', ''),
                'post_type': request.data.get('post_type', 'post'),
                'tier_level': request.data.get('tier_level', 'free'),
                'is_published': request.data.get('is_published', 'true').lower() == 'true',
                'tags': tags,
                'allow_comments': request.data.get('allow_comments', 'true').lower() == 'true',
                'allow_tips': request.data.get('allow_tips', 'true').lower() == 'true',
            }
            
            # If publishing now, set published_at
            if post_data['is_published']:
                post_data['published_at'] = timezone.now()
            
            # Create post
            serializer = self.get_serializer(data=post_data)
            serializer.is_valid(raise_exception=True)
            post = serializer.save(stream=stream)
            
            # Handle media uploads
            for idx, (original_idx, file) in enumerate(media_files):
                # Determine media type
                content_type = file.content_type or 'application/octet-stream'
                if content_type.startswith('image/'):
                    media_type = 'image'
                elif content_type.startswith('video/'):
                    media_type = 'video'
                elif content_type.startswith('audio/'):
                    media_type = 'audio'
                else:
                    media_type = 'document'
                
                # Create StreamPostMedia with direct file upload
                StreamPostMedia.objects.create(
                    post=post,
                    file=file,
                    media_type=media_type,
                    content_type=content_type,
                    file_size=file.size,
                    caption=caption_dict.get(original_idx, ''),
                    order=idx
                )
        
        # Return the created post with media
        post.refresh_from_db()
        serializer = self.get_serializer(post)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Set the stream when creating a post."""
        # This is now handled in the create method above
        pass
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def saved(self, request):
        """Get user's saved posts."""
        saved_post_ids = StreamPostSave.objects.filter(
            user=request.user
        ).values_list('post_id', flat=True)
        
        queryset = self.get_queryset().filter(id__in=saved_post_ids)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, public_uuid=None):
        """Like or unlike a post."""
        post = self.get_object()
        
        # Check if user can access this post
        if not self._can_access_post(request.user, post):
            return Response(
                {'error': 'You need a higher subscription tier to access this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Toggle like
        from streams.models import StreamPostLike
        like, created = StreamPostLike.objects.get_or_create(
            user=request.user,
            post=post
        )
        
        if not created:
            like.delete()
            post.like_count = max(0, post.like_count - 1)
            post.save(update_fields=['like_count'])
            return Response({
                'liked': False, 
                'like_count': post.like_count,
                'is_liked': False
            })
        else:
            post.like_count = post.like_count + 1
            post.save(update_fields=['like_count'])
            return Response({
                'liked': True, 
                'like_count': post.like_count,
                'is_liked': True
            })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def save(self, request, public_uuid=None):
        """Save or unsave a post."""
        post = self.get_object()
        
        # Check if user can access this post
        if not self._can_access_post(request.user, post):
            return Response(
                {'error': 'You need a higher subscription tier to access this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Toggle save
        from streams.models import StreamPostSave
        save, created = StreamPostSave.objects.get_or_create(
            user=request.user,
            post=post
        )
        
        if not created:
            save.delete()
            return Response({'saved': False})
        else:
            return Response({'saved': True})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def view(self, request, public_uuid=None):
        """Track a view on the post."""
        post = self.get_object()
        
        # Check if user can access this post
        if not self._can_access_post(request.user, post):
            return Response(
                {'error': 'You need a higher subscription tier to access this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Track view
        from streams.models import StreamPostView
        view, created = StreamPostView.objects.get_or_create(
            user=request.user,
            post=post,
            defaults={'last_viewed_at': timezone.now()}
        )
        
        if not created:
            view.last_viewed_at = timezone.now()
            view.save(update_fields=['last_viewed_at'])
        else:
            # Update counts
            post.view_count = F('view_count') + 1
            post.unique_view_count = StreamPostView.objects.filter(post=post).count()
            post.save(update_fields=['view_count', 'unique_view_count'])
        
        return Response({'viewed': True})
    
    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated])
    def comments(self, request, public_uuid=None):
        """Get or create comments for a post."""
        post = self.get_object()
        
        # Check if user can access this post
        if not self._can_access_post(request.user, post):
            return Response(
                {'error': 'You need a higher subscription tier to access this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            # Get comments
            comments = StreamPostComment.objects.filter(
                post=post,
                is_hidden=False
            ).select_related('user').order_by('-created_at')
            
            # Paginate
            page = self.paginate_queryset(comments)
            if page is not None:
                from .serializers import StreamPostCommentSerializer
                serializer = StreamPostCommentSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            from .serializers import StreamPostCommentSerializer
            serializer = StreamPostCommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        else:  # POST
            # Create comment
            if not post.allow_comments:
                return Response(
                    {'error': 'Comments are disabled for this post'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            content = request.data.get('content', '').strip()
            if not content:
                return Response(
                    {'error': 'Comment content is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            parent_id = request.data.get('parent_comment')
            parent_comment = None
            if parent_id:
                try:
                    parent_comment = StreamPostComment.objects.get(
                        id=parent_id,
                        post=post,
                        is_hidden=False
                    )
                except StreamPostComment.DoesNotExist:
                    return Response(
                        {'error': 'Parent comment not found'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            comment = StreamPostComment.objects.create(
                post=post,
                user=request.user,
                content=content,
                parent_comment=parent_comment
            )
            
            # Update comment count
            post.comment_count = StreamPostComment.objects.filter(
                post=post,
                is_hidden=False
            ).count()
            post.save(update_fields=['comment_count'])
            
            from .serializers import StreamPostCommentSerializer
            serializer = StreamPostCommentSerializer(comment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'], url_path='comments/(?P<comment_id>[0-9]+)', 
            permission_classes=[IsAuthenticated])
    def delete_comment(self, request, public_uuid=None, comment_id=None):
        """Delete a comment."""
        post = self.get_object()
        
        try:
            comment = StreamPostComment.objects.get(
                id=comment_id,
                post=post
            )
        except StreamPostComment.DoesNotExist:
            return Response(
                {'error': 'Comment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions - only comment author or post owner can delete
        if comment.user != request.user and post.stream.practitioner.user != request.user:
            return Response(
                {'error': 'You do not have permission to delete this comment'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Soft delete by hiding
        comment.is_hidden = True
        comment.save()
        
        # Update comment count
        post.comment_count = StreamPostComment.objects.filter(
            post=post,
            is_hidden=False
        ).count()
        post.save(update_fields=['comment_count'])
        
        return Response({'message': 'Comment deleted successfully'})
    
    def _can_access_post(self, user, post):
        """Check if user can access a post based on subscription tier."""
        # Owner can always access
        if (hasattr(user, 'practitioner_profile') and 
            post.stream.practitioner == user.practitioner_profile):
            return True
        
        # Free posts are always accessible
        if post.tier_level == 'free':
            return True
        
        # Check subscription
        subscription = StreamSubscription.objects.filter(
            user=user,
            stream=post.stream,
            status='active'
        ).first()
        
        if not subscription:
            return False
        
        # Check tier access
        if subscription.tier == 'premium':
            return True
        elif subscription.tier == 'entry':
            return post.tier_level in ['free', 'entry']
        else:  # free
            return post.tier_level == 'free'