from django.urls import path, re_path
from . import views

app_name = 'marketplace'

urlpatterns = [
    path('', views.home, name='home'),
    path('practitioners/', views.practitioners_list, name='practitioners_list'),
    path('practitioners/<uuid:practitioner_id>/', views.practitioner_detail, name='practitioner_detail'),
]