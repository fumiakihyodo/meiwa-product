# api/supplier/urls

from django.urls import path
from api.supplier.views import (
    SupplierListCreateView,
    SupplierDetailView,
    SupplierBranchListCreateView,
    SupplierBranchDetailView,
    SupplierContactListCreateView,
    SupplierContactDetailView,
)

app_name = 'supplier'

urlpatterns = [
    # サプライヤー関連
    path('suppliers/', SupplierListCreateView.as_view(), name='supplier_list_create'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(), name='supplier_detail'),
    
    # サプライヤー拠点関連
    path('branches/', SupplierBranchListCreateView.as_view(), name='branch_list_create'),
    path('branches/<int:pk>/', SupplierBranchDetailView.as_view(), name='branch_detail'),
    
    # サプライヤー担当者関連
    path('contacts/', SupplierContactListCreateView.as_view(), name='contact_list_create'),
    path('contacts/<int:pk>/', SupplierContactDetailView.as_view(), name='contact_detail'),
]
