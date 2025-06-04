from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Count, Sum, Q, F, Case, When, Value, IntegerField, DecimalField
from django.db.models.functions import Coalesce
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.referrals.models import ReferralProgram, Referral, ReferralCampaign
from apps.referrals.api.v1.serializers import (
    ReferralProgramSerializer, ReferralSerializer, ReferralCampaignSerializer,
    ReferralCreateSerializer, ReferralRedeemSerializer, ReferralStatsSerializer
)
from apps.utils.permissions import IsAdminOrReadOnly


class ReferralProgramViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing referral programs.
    Only admin users can create, update, or delete programs.
    """
    queryset = ReferralProgram.objects.all()
    serializer_class = ReferralProgramSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_active', 'reward_type', 'conversion_criteria']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get active referral programs.
        """
        now = timezone.now()
        active_programs = ReferralProgram.objects.filter(
            is_active=True,
            start_date__lte=now
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gt=now)
        )
        
        serializer = self.get_serializer(active_programs, many=True)
        return Response(serializer.data)


class ReferralCampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing referral campaigns.
    Only admin users can create, update, or delete campaigns.
    """
    queryset = ReferralCampaign.objects.all()
    serializer_class = ReferralCampaignSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_active', 'program']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get active referral campaigns.
        """
        now = timezone.now()
        active_campaigns = ReferralCampaign.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gt=now
        )
        
        serializer = self.get_serializer(active_campaigns, many=True)
        return Response(serializer.data)


class ReferralViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing referrals.
    """
    serializer_class = ReferralSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'program', 'referrer_reward_status', 'referred_reward_status']
    ordering_fields = ['created_at', 'converted_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Return referrals for the current user.
        """
        user = self.request.user
        return Referral.objects.filter(
            Q(referrer=user) | Q(referred=user)
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReferralCreateSerializer
        elif self.action == 'redeem':
            return ReferralRedeemSerializer
        elif self.action == 'stats':
            return ReferralStatsSerializer
        return ReferralSerializer
    
    def perform_create(self, serializer):
        """
        Create a referral with the current user as the referrer.
        """
        serializer.save(referrer=self.request.user)
    
    @action(detail=False, methods=['get'])
    def sent(self, request):
        """
        Get referrals sent by the current user.
        """
        referrals = Referral.objects.filter(referrer=request.user)
        
        # Apply filters
        for backend in list(self.filter_backends):
            referrals = backend().filter_queryset(self.request, referrals, self)
        
        page = self.paginate_queryset(referrals)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(referrals, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def received(self, request):
        """
        Get referrals where the current user was referred.
        """
        referrals = Referral.objects.filter(referred=request.user)
        
        # Apply filters
        for backend in list(self.filter_backends):
            referrals = backend().filter_queryset(self.request, referrals, self)
        
        page = self.paginate_queryset(referrals)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(referrals, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def redeem(self, request):
        """
        Redeem a referral code.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['code']
        user = request.user
        
        try:
            # Find the referral by code
            referral = Referral.objects.get(code=code, status='pending')
            
            # Check if the user is trying to refer themselves
            if referral.referrer == user:
                return Response(
                    {'detail': 'You cannot refer yourself.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if the user has already been referred
            if Referral.objects.filter(referred=user, status='converted').exists():
                return Response(
                    {'detail': 'You have already been referred by someone else.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the referral with the referred user
            referral.referred = user
            referral.save()
            
            # Check if the referral should be converted immediately
            program = referral.program
            if program.conversion_criteria == 'signup':
                referral.mark_as_converted(user)
            
            result_serializer = ReferralSerializer(referral)
            return Response(result_serializer.data)
            
        except Referral.DoesNotExist:
            return Response(
                {'detail': 'Invalid or expired referral code.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get referral statistics for the current user.
        """
        user = request.user
        
        # Get all referrals made by the user
        referrals = Referral.objects.filter(referrer=user)
        
        # Calculate statistics
        total_referrals = referrals.count()
        pending_referrals = referrals.filter(status='pending').count()
        converted_referrals = referrals.filter(status='converted').count()
        
        # Calculate conversion rate
        conversion_rate = 0
        if total_referrals > 0:
            conversion_rate = (converted_referrals / total_referrals) * 100
        
        # Calculate total rewards earned
        total_rewards = referrals.filter(
            referrer_reward_status__in=['issued', 'claimed']
        ).aggregate(
            total=Coalesce(Sum('referrer_reward_amount'), 0)
        )['total']
        
        # Create stats object
        stats = {
            'total_referrals': total_referrals,
            'pending_referrals': pending_referrals,
            'converted_referrals': converted_referrals,
            'conversion_rate': conversion_rate,
            'total_rewards_earned': total_rewards
        }
        
        serializer = self.get_serializer(stats)
        return Response(serializer.data)
