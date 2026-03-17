from django.urls import path, include
from rest_framework.routers import DefaultRouter
from journal.api.v1.views import JournalEntryViewSet

router = DefaultRouter()
router.register(r'journal', JournalEntryViewSet, basename='journal-entry')

urlpatterns = [
    path('', include(router.urls)),
]
