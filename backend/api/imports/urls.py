# api/imports/urls.py
# 輸入管理URL設定

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ImportPurchaseOrderViewSet,
    ImportInvoiceViewSet,
    ImportFileViewSet,
    OCRViewSet,
)

router = DefaultRouter()
router.register(r'purchase-orders', ImportPurchaseOrderViewSet, basename='import-po')
router.register(r'invoices', ImportInvoiceViewSet, basename='import-invoice')
router.register(r'files', ImportFileViewSet, basename='import-file')
router.register(r'ocr', OCRViewSet, basename='ocr')

urlpatterns = [
    path('', include(router.urls)),
]
