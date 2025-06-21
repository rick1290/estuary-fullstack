from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from decimal import Decimal
from utils.admin_base import BaseModelAdmin

from .models import (
    Order, 
    UserCreditTransaction, 
    PaymentMethod, 
    EarningsTransaction, 
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
class OrderAdmin(BaseModelAdmin):
    list_display = ('public_uuid_short', 'user_email', 'practitioner_name', 'total_amount_cents', 
                   'status', 'payment_method', 'created_at')
    list_filter = ('status', 'order_type', 'payment_method', 'created_at')
    search_fields = ('public_uuid', 'user__email', 'practitioner__user__email', 'stripe_payment_intent_id')
    readonly_fields = ('id', 'public_uuid', 'created_at', 'updated_at', 'is_paid')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Order Information', {
            'fields': ('id', 'public_uuid', 'order_type', 'status', 'is_paid')
        }),
        ('Relationships', {
            'fields': ('user', 'service', 'practitioner')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'subtotal_amount_cents', 'tax_amount_cents', 'credits_applied_cents', 'total_amount_cents', 'currency')
        }),
        ('Stripe Information', {
            'fields': ('stripe_payment_intent_id', 'stripe_payment_method_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata', 'tax_details', 'audit_log'),
            'classes': ('collapse',)
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def public_uuid_short(self, obj):
        return str(obj.public_uuid)[:8] + '...'
    public_uuid_short.short_description = 'Public UUID'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Customer'
    user_email.admin_order_field = 'user__email'
    
    def practitioner_name(self, obj):
        return str(obj.practitioner) if obj.practitioner else '-'
    practitioner_name.short_description = 'Practitioner'
    practitioner_name.admin_order_field = 'practitioner__display_name'


@admin.register(UserCreditTransaction)
class UserCreditTransactionAdmin(BaseModelAdmin):
    list_display = ('transaction_short', 'user_email', 'amount_display', 'transaction_type', 
                   'is_credit', 'created_at')
    list_filter = ('transaction_type', 'is_expired', 'currency', 'created_at')
    search_fields = ('user__email', 'practitioner__user__email', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at', 'is_credit', 'is_debit')
    date_hierarchy = 'created_at'
    
    def transaction_short(self, obj):
        return str(obj.id)[:8] + '...'
    transaction_short.short_description = 'Transaction ID'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def amount_display(self, obj):
        sign = "+" if obj.amount > 0 else ""
        color = "green" if obj.amount > 0 else "red"
        return format_html(
            '<span style="color: {};">{}{} {}</span>',
            color, sign, obj.amount, obj.currency
        )
    amount_display.short_description = 'Amount'
    amount_display.admin_order_field = 'amount'


@admin.register(PaymentMethod)
class PaymentMethodAdmin(BaseModelAdmin):
    list_display = ('masked_number_display', 'user_email', 'brand', 'is_default', 'is_active', 'is_expired')
    list_filter = ('brand', 'is_default', 'is_active', 'created_at')
    search_fields = ('user__email', 'stripe_payment_method_id', 'last4')
    readonly_fields = ('id', 'created_at', 'updated_at', 'is_expired', 'masked_number')
    
    def masked_number_display(self, obj):
        return obj.masked_number
    masked_number_display.short_description = 'Card Number'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'


@admin.register(EarningsTransaction)
class EarningsTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'practitioner', 'gross_amount_cents', 'commission_amount_cents', 'net_amount_cents', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('practitioner__user__email',)
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)


@admin.register(PractitionerPayout)
class PractitionerPayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'practitioner', 'credits_payout_cents', 'cash_payout_cents', 'status', 'payout_date')
    list_filter = ('status',)
    search_fields = ('practitioner__user__email', 'stripe_transfer_id', 'batch_id')
    date_hierarchy = 'payout_date'
    readonly_fields = ('created_at',)


@admin.register(UserCreditBalance)
class UserCreditBalanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'balance_cents', 'updated_at')
    search_fields = ('user__email',)
    readonly_fields = ('updated_at',)


@admin.register(SubscriptionTier)
class SubscriptionTierAdmin(BaseModelAdmin):
    list_display = ('code', 'name', 'monthly_price_display', 'annual_price_display', 
                    'order', 'is_active', 'get_subscriber_count')
    list_filter = ('is_active', 'code')
    search_fields = ('name', 'description', 'code')
    ordering = ('order', 'monthly_price')
    readonly_fields = ('id', 'created_at', 'updated_at', 'get_subscriber_count', 
                       'annual_savings_display')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'code', 'name', 'description', 'order', 'is_active')
        }),
        ('Pricing', {
            'fields': ('monthly_price', 'annual_price', 'annual_savings_display')
        }),
        ('Features', {
            'fields': ('features',),
            'description': 'Enter features as a JSON list, e.g., ["Feature 1", "Feature 2"]'
        }),
        ('Stripe Integration', {
            'fields': ('stripe_product_id', 'stripe_monthly_price_id', 'stripe_annual_price_id'),
            'classes': ('collapse',)
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_subscriber_count(self, obj):
        count = obj.subscribers.filter(status='active').count()
        return format_html('<strong>{}</strong>', count)
    get_subscriber_count.short_description = 'Active Subscribers'
    
    def monthly_price_display(self, obj):
        return f"${obj.monthly_price}/mo"
    monthly_price_display.short_description = 'Monthly Price'
    monthly_price_display.admin_order_field = 'monthly_price'
    
    def annual_price_display(self, obj):
        if obj.annual_price:
            return f"${obj.annual_price}/yr"
        return "-"
    annual_price_display.short_description = 'Annual Price'
    annual_price_display.admin_order_field = 'annual_price'
    
    def annual_savings_display(self, obj):
        if obj.annual_price and obj.monthly_price:
            yearly_monthly = obj.monthly_price * 12
            savings = yearly_monthly - obj.annual_price
            percentage = (savings / yearly_monthly * 100) if yearly_monthly > 0 else 0
            if savings > 0:
                return format_html(
                    '<span style="color: green;">Save ${:.2f} ({:.0f}% off)</span>',
                    savings, percentage
                )
        return "No annual discount"
    annual_savings_display.short_description = 'Annual Savings'


@admin.register(PractitionerSubscription)
class PractitionerSubscriptionAdmin(BaseModelAdmin):
    list_display = ('practitioner_email', 'tier_display', 'status_display', 
                    'billing_period', 'start_date', 'end_date', 'is_active')
    list_filter = ('status', 'tier', 'is_annual', 'auto_renew')
    search_fields = ('practitioner__user__email', 'practitioner__display_name', 
                     'stripe_subscription_id')
    date_hierarchy = 'start_date'
    readonly_fields = ('id', 'created_at', 'updated_at', 'is_active', 
                       'subscription_value_display')
    
    fieldsets = (
        ('Subscription Details', {
            'fields': ('id', 'practitioner', 'tier', 'status', 'is_active')
        }),
        ('Billing', {
            'fields': ('is_annual', 'auto_renew', 'subscription_value_display')
        }),
        ('Period', {
            'fields': ('start_date', 'end_date')
        }),
        ('Stripe Integration', {
            'fields': ('stripe_subscription_id',),
            'classes': ('collapse',)
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def practitioner_email(self, obj):
        return obj.practitioner.user.email
    practitioner_email.short_description = 'Practitioner'
    practitioner_email.admin_order_field = 'practitioner__user__email'
    
    def tier_display(self, obj):
        if obj.tier:
            return format_html(
                '<strong>{}</strong><br><small>{}</small>',
                obj.tier.name,
                obj.tier.code if hasattr(obj.tier, 'code') else ''
            )
        return '-'
    tier_display.short_description = 'Tier'
    
    def status_display(self, obj):
        colors = {
            'active': 'green',
            'canceled': 'red',
            'past_due': 'orange',
            'trialing': 'blue',
            'unpaid': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Status'
    
    def billing_period(self, obj):
        return "Annual" if obj.is_annual else "Monthly"
    billing_period.short_description = 'Billing'
    
    def subscription_value_display(self, obj):
        if obj.tier:
            if obj.is_annual:
                return f"${obj.tier.annual_price}/year" if obj.tier.annual_price else "N/A"
            else:
                return f"${obj.tier.monthly_price}/month"
        return "N/A"
    subscription_value_display.short_description = 'Subscription Value'


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
