from django.urls import path
from .api import create_payment, get_payment_methods, set_default_payment_method, delete_payment_method
from .webhooks import stripe_webhook_handler

app_name = 'stripe'

urlpatterns = [
    # Legacy Django endpoints (kept for backward compatibility)
    path('api/v1/payments/create/', create_payment, name='create_payment'),
    path('api/v1/payments/methods/', get_payment_methods, name='get_payment_methods'),
    path('api/v1/payments/methods/default/', set_default_payment_method, name='set_default_payment_method'),
    path('api/v1/payments/methods/<str:payment_method_id>/', delete_payment_method, name='delete_payment_method'),
    path('api/v1/payments/webhook/', stripe_webhook_handler, name='stripe_webhook_handler'),
]

# Note: The FastAPI checkout endpoints are mounted via ASGI in asgi_mount.py
# They are available at /stripe/fastapi/api/v1/stripe/*
# 
# Example endpoints:
# - POST /stripe/fastapi/api/v1/stripe/checkout/create
# - POST /stripe/fastapi/api/v1/stripe/checkout/calculate-price
# - POST /stripe/fastapi/api/v1/stripe/payment/confirm
# - POST /stripe/fastapi/api/v1/stripe/checkout/status
# - GET  /stripe/fastapi/api/v1/stripe/payment-methods
# - GET  /stripe/fastapi/api/v1/stripe/credits/balance
#
# Documentation available at:
# - /stripe/fastapi/stripe/docs (Swagger UI)
# - /stripe/fastapi/stripe/redoc (ReDoc)
