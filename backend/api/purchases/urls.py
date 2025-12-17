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
    SuppliedItemListCreateView,
    SuppliedItemDetailView,
    SuppliedItemPriceHistoryListCreateView,
    SuppliedItemPriceHistoryDetailView,
    # 在庫管理用
    SuppliedItemListListCreateView,
    SuppliedItemListDetailView,
    SuppliedItemListItemListCreateView,
    SuppliedItemListItemDetailView,
    SuppliedItemListItemReceivingConfirmView,
    SuppliedItemListItemCountConfirmView,
    SuppliedItemReceivingListCreateView,
    SuppliedItemReceivingDetailView,
    SuppliedItemInventoryListCreateView,
    SuppliedItemInventoryDetailView,
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

    # 支給品関連（マスタ）
    path('supplied-items/', SuppliedItemListCreateView.as_view(), name='supplied_item_list_create'),
    path('supplied-items/<int:pk>/', SuppliedItemDetailView.as_view(), name='supplied_item_detail'),

    # 支給品価格履歴関連
    path('supplied-item-price-histories/', SuppliedItemPriceHistoryListCreateView.as_view(), name='supplied_item_price_history_list_create'),
    path('supplied-item-price-histories/<int:pk>/', SuppliedItemPriceHistoryDetailView.as_view(), name='supplied_item_price_history_detail'),

    # 支給品Quote file download
    path('supplied-item-price-histories/<int:pk>/quote-file/', views.download_supplied_item_quote_file, name='supplied_item-price-history-quote-file'),

    # ========== 在庫管理関連 ==========

    # 支給品リスト（納品リスト）
    path('supplied-item-lists/', SuppliedItemListListCreateView.as_view(), name='supplied_item_list_list_create'),
    path('supplied-item-lists/<int:pk>/', SuppliedItemListDetailView.as_view(), name='supplied_item_list_detail'),
    path('supplied-item-lists/<int:list_id>/import-csv/', views.import_supplied_item_list_csv, name='supplied_item_list_import_csv'),
    path('supplied-item-lists/<int:list_id>/register-inventory/', views.register_inventory_from_list, name='supplied_item_list_register_inventory'),

    # 支給品リスト項目
    path('supplied-item-list-items/', SuppliedItemListItemListCreateView.as_view(), name='supplied_item_list_item_list_create'),
    path('supplied-item-list-items/<int:pk>/', SuppliedItemListItemDetailView.as_view(), name='supplied_item_list_item_detail'),
    path('supplied-item-list-items/<int:pk>/receiving-confirm/', SuppliedItemListItemReceivingConfirmView.as_view(), name='supplied_item_list_item_receiving_confirm'),
    path('supplied-item-list-items/<int:pk>/count-confirm/', SuppliedItemListItemCountConfirmView.as_view(), name='supplied_item_list_item_count_confirm'),

    # 受入確認
    path('supplied-item-receivings/', SuppliedItemReceivingListCreateView.as_view(), name='supplied_item_receiving_list_create'),
    path('supplied-item-receivings/<int:pk>/', SuppliedItemReceivingDetailView.as_view(), name='supplied_item_receiving_detail'),
    path('supplied-item-receivings/<int:pk>/complete/', views.complete_receiving, name='supplied_item_receiving_complete'),

    # 在庫
    path('supplied-item-inventories/', SuppliedItemInventoryListCreateView.as_view(), name='supplied_item_inventory_list_create'),
    path('supplied-item-inventories/<int:pk>/', SuppliedItemInventoryDetailView.as_view(), name='supplied_item_inventory_detail'),
]
