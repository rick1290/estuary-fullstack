from rest_framework import serializers
from referrals.models import Referral, ReferralProgram


class ReferralProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralProgram
        fields = ['id', 'name', 'description', 'referrer_reward_amount', 'referred_reward_amount',
                  'reward_type', 'is_active']
        read_only_fields = fields


class ReferralSerializer(serializers.ModelSerializer):
    referrer_name = serializers.CharField(source='referrer.get_full_name', read_only=True)
    referred_name = serializers.CharField(source='referred.get_full_name', read_only=True, default=None)

    class Meta:
        model = Referral
        fields = ['id', 'code', 'email_sent_to', 'status', 'referrer_reward_status',
                  'referrer_reward_amount', 'referred_name', 'referrer_name',
                  'converted_at', 'created_at']
        read_only_fields = fields


class ReferralStatsSerializer(serializers.Serializer):
    """Stats for the referral dashboard."""
    referral_code = serializers.CharField()
    referral_link = serializers.CharField()
    total_referrals = serializers.IntegerField()
    converted_referrals = serializers.IntegerField()
    pending_referrals = serializers.IntegerField()
    total_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)


class ReferralInviteSerializer(serializers.Serializer):
    """For sending referral invites."""
    email = serializers.EmailField()
