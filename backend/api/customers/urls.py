# api/customers/urls.py

from django.urls import path
from api.customers.views import (
    CustomerListCreateView,
    CustomerDetailView,
    CustomerBranchListCreateView,
    CustomerBranchDetailView,
    CustomerContactListCreateView,
    CustomerContactDetailView,
    CustomerBulkImportView,
    CustomerCSVTemplateView,
    CustomerBranchBulkImportView,
    CustomerBranchCSVTemplateView,
    CustomerContactBulkImportView,
    CustomerContactCSVTemplateView,
)

app_name = 'customers'

urlpatterns = [
    # カスタマー関連
    path('', CustomerListCreateView.as_view(), name='customer_list_create'),
    path('<int:pk>/', CustomerDetailView.as_view(), name='customer_detail'),
    path('bulk-import/', CustomerBulkImportView.as_view(), name='customer_bulk_import'),
    path('csv-template/', CustomerCSVTemplateView.as_view(), name='customer_csv_template'),

    # カスタマー拠点関連
    path('branches/', CustomerBranchListCreateView.as_view(), name='branch_list_create'),
    path('branches/<int:pk>/', CustomerBranchDetailView.as_view(), name='branch_detail'),
    path('branches/bulk-import/', CustomerBranchBulkImportView.as_view(), name='branch_bulk_import'),
    path('branches/csv-template/', CustomerBranchCSVTemplateView.as_view(), name='branch_csv_template'),

    # カスタマー担当者関連
    path('contacts/', CustomerContactListCreateView.as_view(), name='contact_list_create'),
    path('contacts/<int:pk>/', CustomerContactDetailView.as_view(), name='contact_detail'),
    path('contacts/bulk-import/', CustomerContactBulkImportView.as_view(), name='contact_bulk_import'),
    path('contacts/csv-template/', CustomerContactCSVTemplateView.as_view(), name='contact_csv_template'),
]