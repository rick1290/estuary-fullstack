from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from decimal import Decimal

from .models import (
    Order, 
    CreditTransaction, 
    PaymentMethod, 
    PractitionerCreditTransaction, 
    PractitionerPayout,
    UserCreditBalance,
    SubscriptionTier,
    PractitionerSubscription,
    ServiceTypeCommission,
    TierCommissionAdjustment,
    ExternalServiceFee,
    PackageCompletionRecord
)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'practitioner', 'amount', 'status', 'created_at')
    list_filter = ('status', 'order_type')
    search_fields = ('user__email', 'practitioner__user__email', 'stripe_payment_intent_id')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'practitioner', 'amount', 'transaction_type', 'created_at')
    list_filter = ('transaction_type', 'is_expired')
    search_fields = ('user__email', 'practitioner__user__email')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'brand', 'last4', 'is_default', 'is_deleted')
    list_filter = ('brand', 'is_default', 'is_deleted')
    search_fields = ('user__email', 'stripe_payment_id')
    readonly_fields = ('created_at',)


@admin.register(PractitionerCreditTransaction)
class PractitionerCreditTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'practitioner', 'credits_earned', 'commission', 'net_credits', 'payout_status', 'created_at')
    list_filter = ('payout_status',)
    search_fields = ('practitioner__user__email',)
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)


@admin.register(PractitionerPayout)
class PractitionerPayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'practitioner', 'credits_payout', 'cash_payout', 'status', 'payout_date')
    list_filter = ('status',)
    search_fields = ('practitioner__user__email', 'stripe_transfer_id', 'batch_id')
    date_hierarchy = 'payout_date'
    readonly_fields = ('created_at',)


@admin.register(UserCreditBalance)
class UserCreditBalanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'balance', 'updated_at')
    search_fields = ('user__email',)
    readonly_fields = ('updated_at',)


@admin.register(SubscriptionTier)
class SubscriptionTierAdmin(admin.ModelAdmin):
    list_display = ('name', 'monthly_price', 'annual_price', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    ordering = ('order', 'monthly_price')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_subscriber_count(self, obj):
        return obj.subscribers.filter(status='active').count()
    get_subscriber_count.short_description = 'Active Subscribers'


@admin.register(PractitionerSubscription)
class PractitionerSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'practitioner', 'tier', 'status', 'start_date', 'end_date', 'is_annual')
    list_filter = ('status', 'tier', 'is_annual')
    search_fields = ('practitioner__user__email', 'stripe_subscription_id')
    date_hierarchy = 'start_date'
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ServiceTypeCommission)
class ServiceTypeCommissionAdmin(admin.ModelAdmin):
    list_display = ('service_type', 'base_rate', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('service_type__name', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TierCommissionAdjustment)
class TierCommissionAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('tier', 'service_type_display', 'adjustment_percentage', 'effective_rate', 'is_active')
    list_filter = ('tier', 'is_active')
    search_fields = ('tier__name', 'service_type_commission__service_type__name')
    readonly_fields = ('created_at', 'updated_at', 'effective_rate_display')
    
    def service_type_display(self, obj):
        return obj.service_type_commission.service_type.name
    service_type_display.short_description = 'Service Type'
    
    def effective_rate(self, obj):
        return obj.effective_rate
    effective_rate.short_description = 'Effective Rate (%)'
    
    def effective_rate_display(self, obj):
        base_rate = obj.service_type_commission.base_rate
        adjustment = obj.adjustment_percentage
        effective = obj.effective_rate
        
        if adjustment >= 0:
            adjustment_text = f"+{adjustment}%"
            color = "green"
        else:
            adjustment_text = f"{adjustment}%"
            color = "red"
            
        return format_html(
            '<div>Base Rate: {}%</div>'
            '<div>Adjustment: <span style="color: {};">{}</span></div>'
            '<div>Effective Rate: <strong>{}%</strong></div>',
            base_rate, color, adjustment_text, effective
        )
    effective_rate_display.short_description = 'Rate Calculation'


@admin.register(ExternalServiceFee)
class ExternalServiceFeeAdmin(admin.ModelAdmin):
    list_display = ('name', 'fee_type', 'amount', 'service_type', 'is_practitioner_responsible', 'is_active')
    list_filter = ('fee_type', 'is_active', 'is_practitioner_responsible')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PackageCompletionRecord)
class PackageCompletionRecordAdmin(admin.ModelAdmin):
    list_display = ('package_booking', 'status', 'completion_percentage', 'completed_sessions', 'total_sessions', 'payout_processed')
    list_filter = ('status', 'payout_processed')
    search_fields = ('package_booking__id', 'package_booking__practitioner__user__email')
    readonly_fields = ('created_at', 'updated_at', 'completion_details')
    actions = ['update_completion_status', 'process_payouts']
    
    def completion_details(self, obj):
        if obj.total_sessions == 0:
            return "No sessions in this package"
            
        percentage = obj.completion_percentage
        color = "red"
        if percentage >= 75:
            color = "green"
        elif percentage >= 50:
            color = "orange"
            
        return format_html(
            '<div>Completed: <strong>{}/{}</strong> sessions</div>'
            '<div>Completion: <span style="color: {};">{:.1f}%</span></div>'
            '<div>Payout Status: <strong>{}</strong></div>',
            obj.completed_sessions, obj.total_sessions, 
            color, percentage,
            "Processed" if obj.payout_processed else "Pending"
        )
    completion_details.short_description = 'Completion Details'
    
    def update_completion_status(self, request, queryset):
        for record in queryset:
            record.update_completion_status()
        self.message_user(request, f"Updated completion status for {queryset.count()} records.")
    update_completion_status.short_description = "Update completion status"
    
    def process_payouts(self, request, queryset):
        processed = 0
        for record in queryset:
            if record.status == 'completed' and not record.payout_processed:
                record.process_payout()
                processed += 1
        self.message_user(request, f"Processed payouts for {processed} completed packages.")
    process_payouts.short_description = "Process payouts for completed packages"
