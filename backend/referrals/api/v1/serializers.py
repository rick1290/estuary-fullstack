from rest_framework import serializers
from apps.referrals.models import ReferralProgram, Referral, ReferralCampaign
from apps.users.api.v1.serializers import UserBasicSerializer


class ReferralProgramSerializer(serializers.ModelSerializer):
    """
    Serializer for the ReferralProgram model.
    """
    class Meta:
        model = ReferralProgram
        fields = [
            'id', 'name', 'description', 'referrer_reward_amount',
            'referred_reward_amount', 'reward_type', 'min_purchase_amount',
            'conversion_criteria', 'is_active', 'start_date', 'end_date',
            'max_referrals_per_user', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReferralCampaignSerializer(serializers.ModelSerializer):
    """
    Serializer for the ReferralCampaign model.
    """
    program_details = ReferralProgramSerializer(source='program', read_only=True)
    
    class Meta:
        model = ReferralCampaign
        fields = [
            'id', 'name', 'description', 'program', 'campaign_code',
            'bonus_amount', 'start_date', 'end_date', 'is_active',
            'created_at', 'program_details'
        ]
        read_only_fields = ['id', 'created_at']


class ReferralSerializer(serializers.ModelSerializer):
    """
    Serializer for the Referral model.
    """
    referrer_details = UserBasicSerializer(source='referrer', read_only=True)
    referred_details = UserBasicSerializer(source='referred', read_only=True)
    program_details = ReferralProgramSerializer(source='program', read_only=True)
    
    class Meta:
        model = Referral
        fields = [
            'id', 'program', 'referrer', 'referred', 'code',
            'email_sent_to', 'created_at', 'converted_at', 'status',
            'referrer_reward_status', 'referred_reward_status',
            'referrer_reward_amount', 'referred_reward_amount',
            'qualifying_order', 'notes', 'referrer_details',
            'referred_details', 'program_details'
        ]
        read_only_fields = [
            'id', 'code', 'created_at', 'converted_at', 'status',
            'referrer_reward_status', 'referred_reward_status',
            'referrer_reward_amount', 'referred_reward_amount',
            'qualifying_order'
        ]


class ReferralCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Referral.
    """
    emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Referral
        fields = ['program', 'emails', 'notes']
    
    def create(self, validated_data):
        emails = validated_data.pop('emails', [])
        referrer = self.context['request'].user
        program = validated_data.get('program')
        notes = validated_data.get('notes', '')
        
        # Create a referral without an email if none provided
        if not emails:
            return Referral.objects.create(
                referrer=referrer,
                program=program,
                notes=notes
            )
        
        # Create a referral for each email
        referrals = []
        for email in emails:
            referral = Referral.objects.create(
                referrer=referrer,
                program=program,
                email_sent_to=email,
                notes=notes
            )
            referrals.append(referral)
        
        # Return the first referral if only one was created
        if len(referrals) == 1:
            return referrals[0]
        
        # Return all referrals
        return referrals


class ReferralRedeemSerializer(serializers.Serializer):
    """
    Serializer for redeeming a referral code.
    """
    code = serializers.CharField(required=True)


class ReferralStatsSerializer(serializers.Serializer):
    """
    Serializer for referral statistics.
    """
    total_referrals = serializers.IntegerField()
    pending_referrals = serializers.IntegerField()
    converted_referrals = serializers.IntegerField()
    conversion_rate = serializers.FloatField()
    total_rewards_earned = serializers.DecimalField(max_digits=10, decimal_places=2)
