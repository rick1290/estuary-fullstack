import logging
from rest_framework import viewsets, status

logger = logging.getLogger(__name__)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.db.models import Sum, Q
from decimal import Decimal

from referrals.models import Referral, ReferralProgram
from referrals.api.v1.serializers import (
    ReferralSerializer, ReferralStatsSerializer, ReferralInviteSerializer
)


@extend_schema_view(
    list=extend_schema(tags=['Referrals']),
    stats=extend_schema(tags=['Referrals'], responses=ReferralStatsSerializer),
    invite=extend_schema(tags=['Referrals']),
)
class ReferralViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReferralSerializer

    def get_queryset(self):
        return Referral.objects.filter(referrer=self.request.user).order_by('-created_at')

    def list(self, request):
        """List user's referrals."""
        queryset = self.get_queryset()
        serializer = ReferralSerializer(queryset, many=True)
        return Response({'count': queryset.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get referral dashboard stats."""
        user = request.user
        referrals = Referral.objects.filter(referrer=user)

        # Get or create a referral code for this user
        user_referral = referrals.first()
        if user_referral:
            code = user_referral.code
        else:
            # Generate a code from user's name
            import hashlib
            first_name = user.first_name or 'USR'
            code = f"EST-{first_name[:3].upper()}-{hashlib.md5(str(user.id).encode()).hexdigest()[:4].upper()}"

        total = referrals.count()
        converted = referrals.filter(status='converted').count()
        pending = referrals.filter(status='pending').count()

        total_earnings = referrals.filter(
            referrer_reward_status='claimed'
        ).aggregate(total=Sum('referrer_reward_amount'))['total'] or Decimal('0')

        pending_earnings = referrals.filter(
            referrer_reward_status__in=['pending', 'issued']
        ).aggregate(total=Sum('referrer_reward_amount'))['total'] or Decimal('0')

        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'https://estuary.com')

        data = {
            'referral_code': code,
            'referral_link': f'{base_url}?ref={code}',
            'total_referrals': total,
            'converted_referrals': converted,
            'pending_referrals': pending,
            'total_earnings': total_earnings,
            'pending_earnings': pending_earnings,
        }

        serializer = ReferralStatsSerializer(data=data)
        serializer.is_valid()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def invite(self, request):
        """Send a referral invite email."""
        serializer = ReferralInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = request.user

        # Can't refer yourself
        if email == user.email:
            return Response({'message': 'You cannot refer yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if this email is already a registered user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if User.objects.filter(email=email).exists():
            return Response({'message': 'This person already has an Estuary account'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if YOU already invited this email
        existing = Referral.objects.filter(referrer=user, email_sent_to=email).first()
        if existing:
            return Response({'message': 'You\'ve already sent an invite to this email'}, status=200)

        # Check if ANYONE already referred this email
        existing_any = Referral.objects.filter(email_sent_to=email).first()
        if existing_any:
            return Response({'message': 'This person has already been invited to Estuary'}, status=200)

        # Get active program
        program = ReferralProgram.objects.filter(is_active=True).first()
        if not program:
            return Response(
                {'message': 'No active referral program available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create referral record
        import hashlib
        first_name = user.first_name or 'USR'
        code = f"EST-{first_name[:3].upper()}-{hashlib.md5(f'{user.id}-{email}'.encode()).hexdigest()[:4].upper()}"

        referral = Referral.objects.create(
            program=program,
            referrer=user,
            code=code,
            email_sent_to=email,
            status='pending',
        )

        # Send referral invite email via Resend
        try:
            from emails.services import EmailService
            from django.conf import settings
            base_url = getattr(settings, 'FRONTEND_URL', 'https://estuary.com')
            referral_link = f'{base_url}?ref={code}'
            referrer_name = user.get_full_name() or user.first_name or 'A friend'

            EmailService.send_email(
                to=email,
                subject=f'{referrer_name} invited you to Estuary',
                html_content=f"""
                <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <h1 style="font-size: 24px; color: #2a2218; margin-bottom: 16px;">You've been invited to Estuary</h1>
                    <p style="font-size: 16px; color: #6b6258; line-height: 1.6;">
                        {referrer_name} thinks you'd love Estuary — a wellness marketplace where you can book
                        transformative sessions, workshops, and courses with expert practitioners.
                    </p>
                    <p style="font-size: 16px; color: #6b6258; line-height: 1.6;">
                        Sign up with the link below and you'll both earn rewards:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{referral_link}"
                           style="display: inline-block; background: #7a8b63; color: white; padding: 14px 32px;
                                  border-radius: 100px; text-decoration: none; font-size: 16px; font-weight: 500;">
                            Join Estuary
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #9b9088; text-align: center;">
                        Your referral code: <strong>{code}</strong>
                    </p>
                </div>
                """,
                tags=[
                    {'name': 'category', 'value': 'referral'},
                    {'name': 'action', 'value': 'invite'},
                ],
            )
            logger.info(f"Referral invite email sent to {email} from {user.email}")
        except Exception as e:
            logger.error(f"Failed to send referral invite email to {email}: {e}")
            # Don't fail the request — referral record is created, email is best-effort

        return Response({'message': f'Invite sent to {email}', 'code': code}, status=201)
