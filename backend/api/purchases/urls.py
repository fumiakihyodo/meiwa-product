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
    # 購入品管理用
    PurchaseOrderListCreateView,
    PurchaseOrderDetailView,
    PurchaseOrderItemListCreateView,
    PurchaseOrderItemDetailView,
    PurchaseOrderItemReceivingConfirmView,
    PurchaseOrderItemCountConfirmView,
    PurchaseReceivingListCreateView,
    PurchaseReceivingDetailView,
    PurchasedItemInventoryListCreateView,
    PurchasedItemInventoryDetailView,
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

    # CSVインポート（新バージョン）
    path('supplied-item-lists/parse-csv/', views.parse_supplied_item_csv, name='parse_supplied_item_csv'),
    path('supplied-item-lists/create-from-csv/', views.create_supplied_item_list_from_csv, name='create_supplied_item_list_from_csv'),

    # 支給品リスト項目
    path('supplied-item-list-items/', SuppliedItemListItemListCreateView.as_view(), name='supplied_item_list_item_list_create'),
    path('supplied-item-list-items/<int:pk>/', SuppliedItemListItemDetailView.as_view(), name='supplied_item_list_item_detail'),
    path('supplied-item-list-items/<int:pk>/receiving-confirm/', SuppliedItemListItemReceivingConfirmView.as_view(), name='supplied_item_list_item_receiving_confirm'),
    path('supplied-item-list-items/<int:pk>/count-confirm/', SuppliedItemListItemCountConfirmView.as_view(), name='supplied_item_list_item_count_confirm'),

    # 受入確認
    path('supplied-item-receivings/', SuppliedItemReceivingListCreateView.as_view(), name='supplied_item_receiving_list_create'),
    path('supplied-item-receivings/<int:pk>/', SuppliedItemReceivingDetailView.as_view(), name='supplied_item_receiving_detail'),
    path('supplied-item-receivings/<int:pk>/complete/', views.complete_receiving, name='supplied_item_receiving_complete'),

    # リストと受入れ数量の比較・一括確認
    path('supplied-item-lists/<int:list_id>/compare-receiving/', views.compare_receiving_with_list, name='compare_receiving_with_list'),
    path('supplied-item-lists/<int:list_id>/bulk-confirm-receiving/', views.bulk_confirm_receiving, name='bulk_confirm_receiving'),
    path('supplied-item-lists/<int:list_id>/unregistered-items/', views.get_unregistered_receiving_items, name='get_unregistered_receiving_items'),
    path('supplied-item-lists/<int:list_id>/receiving-summary/', views.get_receiving_summary_for_list, name='get_receiving_summary_for_list'),
    path('supplied-item-lists/receiving-summaries/', views.get_receiving_summaries_bulk, name='get_receiving_summaries_bulk'),

    # 在庫
    path('supplied-item-inventories/', SuppliedItemInventoryListCreateView.as_view(), name='supplied_item_inventory_list_create'),
    path('supplied-item-inventories/<int:pk>/', SuppliedItemInventoryDetailView.as_view(), name='supplied_item_inventory_detail'),

    # 品番検索
    path('lookup-item/', views.lookup_item_by_number, name='lookup_item_by_number'),

    # 部品別受入一覧
    path('supplied-item-receiving-items/', views.get_receiving_items_list, name='get_receiving_items_list'),

    # ========== 購入品管理関連 ==========

    # 発注
    path('purchase-orders/', PurchaseOrderListCreateView.as_view(), name='purchase_order_list_create'),
    path('purchase-orders/<int:pk>/', PurchaseOrderDetailView.as_view(), name='purchase_order_detail'),
    path('purchase-orders/<int:pk>/update-status/', views.update_purchase_order_status, name='update_purchase_order_status'),
    path('purchase-orders/<int:pk>/bulk-confirm-receiving/', views.bulk_confirm_purchase_order_receiving, name='bulk_confirm_purchase_order_receiving'),
    path('purchase-orders/<int:pk>/bulk-confirm-count/', views.bulk_confirm_purchase_order_count, name='bulk_confirm_purchase_order_count'),

    # 発注明細
    path('purchase-order-items/', PurchaseOrderItemListCreateView.as_view(), name='purchase_order_item_list_create'),
    path('purchase-order-items/<int:pk>/', PurchaseOrderItemDetailView.as_view(), name='purchase_order_item_detail'),
    path('purchase-order-items/<int:pk>/receiving-confirm/', PurchaseOrderItemReceivingConfirmView.as_view(), name='purchase_order_item_receiving_confirm'),
    path('purchase-order-items/<int:pk>/count-confirm/', PurchaseOrderItemCountConfirmView.as_view(), name='purchase_order_item_count_confirm'),

    # 購入品受入確認
    path('purchase-receivings/', PurchaseReceivingListCreateView.as_view(), name='purchase_receiving_list_create'),
    path('purchase-receivings/<int:pk>/', PurchaseReceivingDetailView.as_view(), name='purchase_receiving_detail'),

    # 購入品在庫
    path('purchased-item-inventories/', PurchasedItemInventoryListCreateView.as_view(), name='purchased_item_inventory_list_create'),
    path('purchased-item-inventories/<int:pk>/', PurchasedItemInventoryDetailView.as_view(), name='purchased_item_inventory_detail'),

    # 発注作成サポート
    path('parts-by-supplier/', views.get_parts_grouped_by_supplier, name='parts_by_supplier'),
    path('create-orders-from-parts/', views.create_purchase_orders_from_parts, name='create_orders_from_parts'),
]
