# api/products/urls.py

from django.urls import path
from api.products.views import (
    ProductListCreateView,
    ProductDetailView,
)

app_name = 'products'

urlpatterns = [
    # 製品関連
    path('', ProductListCreateView.as_view(), name='product_list_create'),
    path('<int:pk>/', ProductDetailView.as_view(), name='product_detail'),
]