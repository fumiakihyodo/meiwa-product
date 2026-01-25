# api/imports/admin.py
# 輸入管理 管理画面設定

from django.contrib import admin
from .models import (
    ImportPurchaseOrder,
    ImportPurchaseOrderItem,
    ImportInvoice,
    ImportInvoiceItem,
    ImportFile,
)


class ImportPurchaseOrderItemInline(admin.TabularInline):
    """輸入発注明細インライン"""
    model = ImportPurchaseOrderItem
    extra = 0
    fields = [
        'part_number',
        'description',
        'quantity',
        'unit',
        'unit_price',
        'amount',
        'material',
        'received_quantity',
        'is_received',
    ]
    readonly_fields = ['amount']


@admin.register(ImportPurchaseOrder)
class ImportPurchaseOrderAdmin(admin.ModelAdmin):
    """輸入発注管理"""
    list_display = [
        'po_number',
        'supplier_branch',
        'order_date',
        'expected_arrival_date',
        'status',
        'currency',
        'get_total_items',
        'created_at',
    ]
    list_filter = ['status', 'currency', 'supplier_branch__supplier', 'created_at']
    search_fields = ['po_number', 'notes', 'tracking_number']
    date_hierarchy = 'order_date'
    readonly_fields = ['po_number', 'created_at', 'updated_at']
    inlines = [ImportPurchaseOrderItemInline]

    fieldsets = (
        ('基本情報', {
            'fields': ('po_number', 'supplier_branch', 'status')
        }),
        ('日付', {
            'fields': (
                'order_date',
                ('expected_ship_date', 'expected_arrival_date'),
                ('actual_ship_date', 'actual_arrival_date'),
            )
        }),
        ('金額・通貨', {
            'fields': ('currency', 'exchange_rate')
        }),
        ('輸送情報', {
            'fields': ('shipping_method', 'tracking_number')
        }),
        ('その他', {
            'fields': ('notes', 'created_by', 'created_at', 'updated_at')
        }),
    )

    def get_total_items(self, obj):
        return obj.items.count()
    get_total_items.short_description = '品目数'


class ImportInvoiceItemInline(admin.TabularInline):
    """インボイス明細インライン"""
    model = ImportInvoiceItem
    extra = 0
    fields = [
        'part_number',
        'description',
        'quantity',
        'unit',
        'unit_price',
        'amount',
        'material',
        'registered_as_semi_finished',
    ]
    readonly_fields = ['amount']


class ImportFileInline(admin.TabularInline):
    """インポートファイルインライン"""
    model = ImportFile
    extra = 0
    fields = ['file_type', 'file', 'original_filename', 'file_size', 'uploaded_at']
    readonly_fields = ['file_size', 'uploaded_at']


@admin.register(ImportInvoice)
class ImportInvoiceAdmin(admin.ModelAdmin):
    """インボイス管理"""
    list_display = [
        'invoice_number',
        'supplier_branch',
        'invoice_date',
        'received_date',
        'status',
        'currency',
        'total_amount',
        'registered_as_semi_finished',
        'get_total_items',
        'created_at',
    ]
    list_filter = ['status', 'currency', 'registered_as_semi_finished', 'supplier_branch__supplier', 'created_at']
    search_fields = ['invoice_number', 'notes']
    date_hierarchy = 'invoice_date'
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['linked_pos']
    inlines = [ImportInvoiceItemInline, ImportFileInline]

    fieldsets = (
        ('基本情報', {
            'fields': ('invoice_number', 'supplier_branch', 'status')
        }),
        ('日付', {
            'fields': ('invoice_date', 'received_date')
        }),
        ('金額', {
            'fields': ('currency', 'subtotal', 'tax_amount', 'shipping_cost', 'total_amount')
        }),
        ('紐付け', {
            'fields': ('linked_pos',)
        }),
        ('在庫登録', {
            'fields': ('registered_as_semi_finished',)
        }),
        ('その他', {
            'fields': ('notes', 'created_by', 'created_at', 'updated_at')
        }),
    )

    def get_total_items(self, obj):
        return obj.items.count()
    get_total_items.short_description = '品目数'


@admin.register(ImportFile)
class ImportFileAdmin(admin.ModelAdmin):
    """インポートファイル管理"""
    list_display = [
        'original_filename',
        'file_type',
        'import_invoice',
        'file_size',
        'uploaded_at',
        'uploaded_by',
    ]
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['original_filename', 'import_invoice__invoice_number']
    readonly_fields = ['file_size', 'uploaded_at']
