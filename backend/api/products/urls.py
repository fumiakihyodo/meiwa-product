# api/products/urls.py

from django.urls import path
from api.products.views import (
    ProductListCreateView,
    ProductDetailView,
    ProductBulkImportView,
    ProductCSVTemplateView,
)

app_name = 'products'

urlpatterns = [
    # 製品関連
    path('', ProductListCreateView.as_view(), name='product_list_create'),
    path('<int:pk>/', ProductDetailView.as_view(), name='product_detail'),
    path('bulk-import/', ProductBulkImportView.as_view(), name='product_bulk_import'),
    path('csv-template/', ProductCSVTemplateView.as_view(), name='product_csv_template'),
]