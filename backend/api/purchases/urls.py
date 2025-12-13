# api/purchases/urls.py

from django.urls import path
from api.purchases.views import (
    PartListCreateView,
    PartDetailView,
    PriceHistoryListCreateView,
    PriceHistoryDetailView,
    PartBulkImportView,
    PartCSVTemplateView,
    PriceHistoryBulkImportView,
    PriceHistoryCSVTemplateView,
)
from api.purchases import views

app_name = 'purchases'

urlpatterns = [
    # 部品関連
    path('parts/', PartListCreateView.as_view(), name='part_list_create'),
    path('parts/<int:pk>/', PartDetailView.as_view(), name='part_detail'),
    path('parts/bulk-import/', PartBulkImportView.as_view(), name='part_bulk_import'),
    path('parts/csv-template/', PartCSVTemplateView.as_view(), name='part_csv_template'),

    # 価格履歴関連
    path('price-histories/', PriceHistoryListCreateView.as_view(), name='price_history_list_create'),
    path('price-histories/<int:pk>/', PriceHistoryDetailView.as_view(), name='price_history_detail'),
    path('price-histories/bulk-import/', PriceHistoryBulkImportView.as_view(), name='price_history_bulk_import'),
    path('price-histories/csv-template/', PriceHistoryCSVTemplateView.as_view(), name='price_history_csv_template'),

    # Quote file download
    path('price-histories/<int:pk>/quote-file/', views.download_quote_file, name='price-history-quote-file'),
]
