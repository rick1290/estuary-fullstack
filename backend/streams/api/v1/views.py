from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import UserRateThrottle


class TipRateThrottle(UserRateThrottle):
    rate = '30/hour'
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, F, Count, Sum
from django.db.models.functions import Greatest
from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from streams.models import (
    Stream, StreamPost, StreamSubscription, StreamPostMedia,
    StreamCategory, StreamAnalytics, StreamPostComment, StreamPostSave
)


from .serializers import (
    StreamSerializer, StreamPostSerializer, StreamSubscriptionSerializer,
    StreamCategorySerializer, StreamAnalyticsSerializer,
    StreamPostCommentSerializer, StreamTipSerializer
)
from .permissions import IsPractitionerOwner, IsStreamOwner, CanAccessStream
from .views_media import StreamPostMediaMixin


def _update_subscriber_counts(stream):
    """Recalculate and update all subscriber count fields from the database using a single aggregated query."""
    from django.db.models import Count, Q
    stats = stream.subscriptions.filter(status='active').aggregate(
        total=Count('id'),
        free=Count('id', filter=Q(tier='free')),
        paid=Count('id', filter=Q(tier__in=['entry', 'premium'])),
    )
    stream.subscriber_count = stats['total']
    stream.free_subscriber_count = stats['free']
    stream.paid_subscriber_count = stats['paid']
    stream.save(update_fields=['subscriber_count', 'free_subscriber_count', 'paid_subscriber_count'])


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
            
            _update_subscriber_counts(stream)

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

            # Get practitioner's Stripe Connect account
            practitioner_payment_profile = UserPaymentProfile.objects.filter(
                user=stream.practitioner.user
            ).first()

            practitioner_stripe_account = None
            if practitioner_payment_profile:
                practitioner_stripe_account = practitioner_payment_profile.stripe_account_id

            # Build subscription params
            subscription_params = {
                'customer': payment_profile.stripe_customer_id,
                'items': [{'price': price_id}],
                'payment_behavior': 'default_incomplete',
                'payment_settings': {
                    'payment_method_types': ['card'],
                    'save_default_payment_method': 'on_subscription'
                },
                'expand': ['latest_invoice.payment_intent'],
                'metadata': {
                    'type': 'stream',
                    'stream_id': str(stream.id),
                    'user_id': str(request.user.id),
                    'tier': tier
                }
            }

            # Only add application_fee_percent if practitioner has Stripe Connect
            if practitioner_stripe_account:
                subscription_params['application_fee_percent'] = 15  # Platform takes 15%
                subscription_params['transfer_data'] = {
                    'destination': practitioner_stripe_account
                }

            # Create Stripe subscription
            stripe_subscription = stripe.Subscription.create(**subscription_params)
            
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
            
            _update_subscriber_counts(stream)

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
                    # Only clear after Stripe confirms deletion
                    subscription.stripe_subscription_id = None
                    subscription.stripe_price_id = None
                    subscription.price_cents = 0
                except stripe.error.StripeError as e:
                    return Response(
                        {'error': f'Failed to cancel paid subscription: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Update subscription
            subscription.previous_tier = previous_tier
            subscription.tier = 'free'
            subscription.tier_changed_at = timezone.now()
            subscription.save()

            _update_subscriber_counts(stream)

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
            
            _update_subscriber_counts(stream)

            return Response({
                'message': f'Successfully changed to {new_tier} tier',
                'subscription': StreamSubscriptionSerializer(subscription).data
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Failed to change subscription: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        tags=['Streams'],
        description="Send a tip on a stream (without a specific post)",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'amount_cents': {'type': 'integer', 'minimum': 100},
                    'message': {'type': 'string'},
                    'is_anonymous': {'type': 'boolean', 'default': False},
                    'payment_method_id': {'type': 'string'},
                },
                'required': ['amount_cents', 'payment_method_id']
            }
        }
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], throttle_classes=[TipRateThrottle])
    def tip(self, request, pk=None):
        """Send a tip on a stream."""
        stream = self.get_object()

        if not stream.allow_tips:
            return Response(
                {'error': 'Tips are not enabled for this stream'},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount_cents = request.data.get('amount_cents')
        payment_method_id = request.data.get('payment_method_id')
        message = request.data.get('message', '')
        is_anonymous = request.data.get('is_anonymous', False)

        if not amount_cents or int(amount_cents) < 100:
            return Response(
                {'error': 'Minimum tip amount is $1.00'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not payment_method_id:
            return Response(
                {'error': 'Payment method is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate payment method belongs to the user
        from payments.models import PaymentMethod
        if not PaymentMethod.objects.filter(
            user=request.user,
            stripe_payment_method_id=payment_method_id,
            is_deleted=False
        ).exists():
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount_cents = int(amount_cents)
        commission_rate = stream.commission_rate or 15
        commission_amount = int(amount_cents * commission_rate / 100)
        net_amount = amount_cents - commission_amount

        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            from users.models import UserPaymentProfile
            payment_profile, _ = UserPaymentProfile.objects.get_or_create(user=request.user)

            if not payment_profile.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name(),
                    metadata={'user_id': str(request.user.id)}
                )
                payment_profile.stripe_customer_id = customer.id
                payment_profile.save()

            practitioner_payment = UserPaymentProfile.objects.filter(
                user=stream.practitioner.user
            ).first()

            intent_params = {
                'amount': amount_cents,
                'currency': 'usd',
                'customer': payment_profile.stripe_customer_id,
                'payment_method': payment_method_id,
                'metadata': {
                    'type': 'stream_tip',
                    'stream_id': str(stream.id),
                    'user_id': str(request.user.id),
                },
            }

            if practitioner_payment and practitioner_payment.stripe_account_id:
                intent_params['application_fee_amount'] = commission_amount
                intent_params['transfer_data'] = {
                    'destination': practitioner_payment.stripe_account_id
                }

            payment_intent = stripe.PaymentIntent.create(**intent_params)

            from streams.models import StreamTip
            tip_obj = StreamTip.objects.create(
                user=request.user,
                stream=stream,
                post=None,
                amount_cents=amount_cents,
                message=message,
                is_anonymous=is_anonymous,
                stripe_payment_intent_id=payment_intent.id,
                status='pending',
                commission_rate=commission_rate,
                commission_amount_cents=commission_amount,
                net_amount_cents=net_amount,
            )

            from .serializers import StreamTipSerializer
            return Response({
                'tip': StreamTipSerializer(tip_obj).data,
                'client_secret': payment_intent.client_secret,
            }, status=status.HTTP_201_CREATED)

        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Payment error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


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
    filterset_fields = ['stream', 'stream__practitioner', 'tier_level', 'post_type', 'is_published', 'is_pinned']
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
        
        # Filter to only posts from streams the user is subscribed to
        subscribed_only = self.request.query_params.get('subscribed_only')
        if subscribed_only == 'true' and self.request.user.is_authenticated:
            subscribed_stream_ids = StreamSubscription.objects.filter(
                user=self.request.user,
                status='active'
            ).values_list('stream_id', flat=True)
            queryset = queryset.filter(stream_id__in=subscribed_stream_ids)

        # Filter by tags (JSONField containing list of strings)
        tags_param = self.request.query_params.get('tags')
        if tags_param:
            for tag in tags_param.split(','):
                queryset = queryset.filter(tags__contains=[tag.strip()])

        # Filter by practitioner modality
        modality_slug = self.request.query_params.get('modality')
        if modality_slug:
            queryset = queryset.filter(stream__practitioner__modalities__slug=modality_slug)

        # Use filtered Prefetch for subscriptions to only load current user's active subscription
        if self.request.user.is_authenticated:
            from django.db.models import Prefetch
            subscription_prefetch = Prefetch(
                'stream__subscriptions',
                queryset=StreamSubscription.objects.filter(
                    user=self.request.user,
                    status='active'
                )
            )
        else:
            from django.db.models import Prefetch
            subscription_prefetch = Prefetch(
                'stream__subscriptions',
                queryset=StreamSubscription.objects.none()
            )

        return queryset.select_related('stream__practitioner').prefetch_related(
            'media',
            'likes',
            'saves',
            subscription_prefetch,
        )

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
            # Get stream_id from request data
            stream_id = request.data.get('stream')
            
            if not stream_id:
                return Response(
                    {'error': f'Stream ID is required. Received data keys: {list(request.data.keys())}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            import traceback
            import logging
            logging.getLogger(__name__).error(f"Error in stream post create: {e}\n{traceback.format_exc()}")
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
            if key.startswith('media_files['):
                try:
                    index = key.split('[')[1].split(']')[0]
                    media_files.append((int(index), request.FILES[key]))
                except Exception:
                    pass
                
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

            # Increment post count
            stream.post_count = F('post_count') + 1
            stream.save(update_fields=['post_count'])

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

        # Notify subscribers of new post (after transaction commits)
        if post.is_published:
            from django.db import transaction as db_transaction
            def _notify_subscribers():
                try:
                    from notifications.services import get_client_notification_service
                    notification_service = get_client_notification_service()
                    subscribers = stream.subscriptions.filter(
                        status='active'
                    ).select_related('user')
                    # Only notify subscribers who have access to this tier
                    for sub in subscribers:
                        if post.is_accessible_to_tier(sub.tier) and sub.notify_new_posts:
                            try:
                                notification_service.send_notification(
                                    user=sub.user,
                                    notification_type='new_stream_post',
                                    title=f"New post from {stream.practitioner.display_name}",
                                    message=post.title or post.content[:100],
                                    metadata={
                                        'stream_id': str(stream.public_uuid),
                                        'post_id': str(post.public_uuid),
                                        'practitioner_name': stream.practitioner.display_name,
                                    }
                                )
                            except Exception:
                                pass  # Don't fail post creation if notification fails
                except Exception:
                    pass  # Notification service may not be configured

            db_transaction.on_commit(_notify_subscribers)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Set the stream when creating a post."""
        # This is now handled in the create method above
        pass

    def perform_destroy(self, instance):
        """Decrement post count when deleting a post."""
        stream = instance.stream
        instance.delete()
        from django.db.models.functions import Greatest
        stream.post_count = Greatest(F('post_count') - 1, 0)
        stream.save(update_fields=['post_count'])

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

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def popular_tags(self, request):
        """Get the most popular tags across published posts."""
        # Get all tags from published posts, flatten, and count
        posts_with_tags = StreamPost.objects.filter(
            is_published=True
        ).exclude(tags=[]).values_list('tags', flat=True)

        # Count tag frequency
        tag_counts = {}
        for tags_list in posts_with_tags:
            if isinstance(tags_list, list):
                for tag in tags_list:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

        # Sort by frequency, return top 20
        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        return Response([{'tag': t, 'count': c} for t, c in sorted_tags])

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def topics(self, request):
        """Get modalities that have active stream posts."""
        from common.models import Modality
        from django.db.models import Count, Q

        modalities = Modality.objects.filter(
            practitioners__stream__posts__is_published=True
        ).annotate(
            post_count=Count(
                'practitioners__stream__posts',
                filter=Q(practitioners__stream__posts__is_published=True),
                distinct=True
            )
        ).filter(post_count__gt=0).order_by('-post_count')[:20]

        return Response([
            {
                'slug': m.slug,
                'name': m.name,
                'post_count': m.post_count,
                'category': m.category.name if m.category else None,
            }
            for m in modalities
        ])

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

    @extend_schema(
        tags=['Stream Posts'],
        description="Send a tip on a stream post",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'amount_cents': {'type': 'integer', 'minimum': 100, 'description': 'Tip amount in cents (min $1)'},
                    'message': {'type': 'string', 'description': 'Optional message'},
                    'is_anonymous': {'type': 'boolean', 'default': False},
                    'payment_method_id': {'type': 'string', 'description': 'Stripe payment method ID'},
                },
                'required': ['amount_cents', 'payment_method_id']
            }
        }
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], throttle_classes=[TipRateThrottle])
    def tip(self, request, public_uuid=None):
        """Send a tip on a post."""
        post = self.get_object()
        stream = post.stream

        if not stream.allow_tips:
            return Response(
                {'error': 'Tips are not enabled for this stream'},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount_cents = request.data.get('amount_cents')
        payment_method_id = request.data.get('payment_method_id')
        message = request.data.get('message', '')
        is_anonymous = request.data.get('is_anonymous', False)

        if not amount_cents or int(amount_cents) < 100:
            return Response(
                {'error': 'Minimum tip amount is $1.00'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not payment_method_id:
            return Response(
                {'error': 'Payment method is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate payment method belongs to the user
        from payments.models import PaymentMethod
        if not PaymentMethod.objects.filter(
            user=request.user,
            stripe_payment_method_id=payment_method_id,
            is_deleted=False
        ).exists():
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount_cents = int(amount_cents)
        commission_rate = stream.commission_rate or 15
        commission_amount = int(amount_cents * commission_rate / 100)
        net_amount = amount_cents - commission_amount

        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            from users.models import UserPaymentProfile
            payment_profile, _ = UserPaymentProfile.objects.get_or_create(user=request.user)

            if not payment_profile.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name(),
                    metadata={'user_id': str(request.user.id)}
                )
                payment_profile.stripe_customer_id = customer.id
                payment_profile.save()

            # Get practitioner's Stripe Connect account
            practitioner_payment = UserPaymentProfile.objects.filter(
                user=stream.practitioner.user
            ).first()

            intent_params = {
                'amount': amount_cents,
                'currency': 'usd',
                'customer': payment_profile.stripe_customer_id,
                'payment_method': payment_method_id,
                'metadata': {
                    'type': 'stream_tip',
                    'stream_id': str(stream.id),
                    'post_id': str(post.id),
                    'user_id': str(request.user.id),
                },
            }

            if practitioner_payment and practitioner_payment.stripe_account_id:
                intent_params['application_fee_amount'] = commission_amount
                intent_params['transfer_data'] = {
                    'destination': practitioner_payment.stripe_account_id
                }

            payment_intent = stripe.PaymentIntent.create(**intent_params)

            from streams.models import StreamTip
            tip = StreamTip.objects.create(
                user=request.user,
                stream=stream,
                post=post,
                amount_cents=amount_cents,
                message=message,
                is_anonymous=is_anonymous,
                stripe_payment_intent_id=payment_intent.id,
                status='pending',
                commission_rate=commission_rate,
                commission_amount_cents=commission_amount,
                net_amount_cents=net_amount,
            )

            from .serializers import StreamTipSerializer
            return Response({
                'tip': StreamTipSerializer(tip).data,
                'client_secret': payment_intent.client_secret,
            }, status=status.HTTP_201_CREATED)

        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Payment error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

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