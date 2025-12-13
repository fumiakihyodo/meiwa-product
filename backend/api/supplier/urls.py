# api/supplier/urls

from django.urls import path
from api.supplier.views import (
    SupplierListCreateView,
    SupplierDetailView,
    SupplierBranchListCreateView,
    SupplierBranchDetailView,
    SupplierContactListCreateView,
    SupplierContactDetailView,
    SupplierBulkImportView,
    SupplierCSVTemplateView,
    SupplierBranchBulkImportView,
    SupplierBranchCSVTemplateView,
    SupplierContactBulkImportView,
    SupplierContactCSVTemplateView,
)

app_name = 'supplier'

urlpatterns = [
    # サプライヤー関連
    path('suppliers/', SupplierListCreateView.as_view(), name='supplier_list_create'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(), name='supplier_detail'),
    path('suppliers/bulk-import/', SupplierBulkImportView.as_view(), name='supplier_bulk_import'),
    path('suppliers/csv-template/', SupplierCSVTemplateView.as_view(), name='supplier_csv_template'),

    # サプライヤー拠点関連
    path('branches/', SupplierBranchListCreateView.as_view(), name='branch_list_create'),
    path('branches/<int:pk>/', SupplierBranchDetailView.as_view(), name='branch_detail'),
    path('branches/bulk-import/', SupplierBranchBulkImportView.as_view(), name='branch_bulk_import'),
    path('branches/csv-template/', SupplierBranchCSVTemplateView.as_view(), name='branch_csv_template'),

    # サプライヤー担当者関連
    path('contacts/', SupplierContactListCreateView.as_view(), name='contact_list_create'),
    path('contacts/<int:pk>/', SupplierContactDetailView.as_view(), name='contact_detail'),
    path('contacts/bulk-import/', SupplierContactBulkImportView.as_view(), name='contact_bulk_import'),
    path('contacts/csv-template/', SupplierContactCSVTemplateView.as_view(), name='contact_csv_template'),
]
