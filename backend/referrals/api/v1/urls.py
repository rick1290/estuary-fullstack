from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.referrals.api.v1.views import (
    ReferralProgramViewSet, ReferralViewSet, ReferralCampaignViewSet
)

router = DefaultRouter()
router.register(r'programs', ReferralProgramViewSet, basename='referral-program')
router.register(r'campaigns', ReferralCampaignViewSet, basename='referral-campaign')
router.register(r'referrals', ReferralViewSet, basename='referral')

urlpatterns = [
    path('', include(router.urls)),
]
