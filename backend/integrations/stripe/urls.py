from django.urls import path
from .api import create_payment, get_payment_methods, set_default_payment_method, delete_payment_method
from .webhooks import stripe_webhook_handler

app_name = 'stripe'

urlpatterns = [
    # Payment creation endpoint
    path('api/v1/payments/create/', create_payment, name='create_payment'),
    
    # Payment method management endpoints
    path('api/v1/payments/methods/', get_payment_methods, name='get_payment_methods'),
    path('api/v1/payments/methods/default/', set_default_payment_method, name='set_default_payment_method'),
    path('api/v1/payments/methods/<str:payment_method_id>/', delete_payment_method, name='delete_payment_method'),
    
    # Webhook endpoint
    path('api/v1/payments/webhook/', stripe_webhook_handler, name='stripe_webhook_handler'),
]
