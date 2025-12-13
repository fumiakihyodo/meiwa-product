# api/customers/urls.py

from django.urls import path
from api.customers.views import (
    CustomerListCreateView,
    CustomerDetailView,
    CustomerBranchListCreateView,
    CustomerBranchDetailView,
    CustomerContactListCreateView,
    CustomerContactDetailView,
)

app_name = 'customers'

urlpatterns = [
    # カスタマー関連
    path('', CustomerListCreateView.as_view(), name='customer_list_create'),
    path('<int:pk>/', CustomerDetailView.as_view(), name='customer_detail'),
    
    # カスタマー拠点関連
    path('branches/', CustomerBranchListCreateView.as_view(), name='branch_list_create'),
    path('branches/<int:pk>/', CustomerBranchDetailView.as_view(), name='branch_detail'),
    
    # カスタマー担当者関連
    path('contacts/', CustomerContactListCreateView.as_view(), name='contact_list_create'),
    path('contacts/<int:pk>/', CustomerContactDetailView.as_view(), name='contact_detail'),
]