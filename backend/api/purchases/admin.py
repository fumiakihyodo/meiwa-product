from django.contrib import admin
from api.purchases.models import Part, PriceHistory


class PriceHistoryInline(admin.TabularInline):
    """価格履歴のインライン"""
    model = PriceHistory
    extra = 0
    fields = ['price', 'start_date', 'end_date',
              'is_active', 'change_reason', 'created_by']
    readonly_fields = ['created_by']
    ordering = ['-start_date', '-created_at']


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    """部品管理画面"""

    list_display = [
        'part_number', 'part_name','supplier_part_name', 'order_type', 'product', 'supplier_branch',
        'unit', 'minimum_order_quantity', 'current_price',
         'is_active', 'created_at'
    ]

    list_filter = [
        'is_active', 'unit', 'product', 'supplier_branch__supplier',
        'created_at'
    ]

    search_fields = [
        'part_number', 'part_name', 'supplier_part_name','specification',
        'product__product_number', 'product__product_name',
        'supplier_branch__branch_name',
        'supplier_branch__supplier__company_name'
    ]

    readonly_fields = [
        'created_at', 'updated_at', 'current_price',
        'has_multiple_active_prices'
    ]

    autocomplete_fields = ['product', 'supplier_branch']

    fieldsets = (
        ('関連情報', {
            'fields': ('product', 'supplier_branch')
        }),
        ('基本情報', {
            'fields': ('part_number', 'part_name','supplier_part_name', 'specification')
        }),
        ('発注情報', {
            'fields': (
                'order_type', 'unit', 'minimum_order_quantity', 'lead_time_days'
            )
        }),
        ('価格情報', {
            'fields': (
                'current_price', 'has_multiple_active_prices'
            ),
            'classes': ('collapse',)
        }),
        ('その他', {
            'fields': ('is_active', 'notes')
        }),
        ('作成情報', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    inlines = [PriceHistoryInline]

    def get_queryset(self, request):
        """最適化されたクエリセット"""
        return super().get_queryset(request).select_related(
            'product',
            'supplier_branch__supplier',
            'created_by'
        ).prefetch_related('price_histories')

    def current_price(self, obj):
        """現在の価格"""
        price = obj.current_price
        return f"¥{price:,.2f}" if price else "-"
    current_price.short_description = '現在単価'

    def save_model(self, request, obj, form, change):
        """保存時に作成者を設定"""
        if not change:  # 新規作成時のみ
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        """インラインフォームセット保存時の処理"""
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, PriceHistory):
                if not instance.pk:  # 新規作成時のみ
                    instance.created_by = request.user
                instance.save()
        formset.save_m2m()


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    """価格履歴管理画面"""

    list_display = [
        'part', 'price', 'start_date', 'end_date',
        'is_active', 'is_current', 'is_future', 'is_expired',
        'created_by', 'created_at'
    ]

    list_filter = [
        'is_active', 'start_date', 'end_date',
        'part__product', 'part__supplier_branch__supplier',
        'created_at'
    ]

    search_fields = [
        'part__part_number', 'part__part_name',
        'part__product__product_number', 'part__product__product_name',
        'change_reason', 'notes'
    ]

    readonly_fields = [
        'created_at', 'updated_at', 'is_current',
        'is_future', 'is_expired', 'quote_file_name',
        'quote_file_size'
    ]

    autocomplete_fields = ['part']

    date_hierarchy = 'start_date'

    fieldsets = (
        ('関連情報', {
            'fields': ('part',)
        }),
        ('価格情報', {
            'fields': ('price', 'start_date', 'end_date')
        }),
        ('ステータス', {
            'fields': (
                'is_active', 'is_current', 'is_future', 'is_expired'
            )
        }),
        ('詳細情報', {
            'fields': ('change_reason', 'notes')
        }),
        ('見積書', {
            'fields': (
                'quote_file', 'quote_file_name', 'quote_file_size'
            ),
            'classes': ('collapse',)
        }),
        ('作成情報', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        """最適化されたクエリセット"""
        return super().get_queryset(request).select_related(
            'part__product',
            'part__supplier_branch__supplier',
            'created_by'
        )

    def save_model(self, request, obj, form, change):
        """保存時に作成者を設定"""
        if not change:  # 新規作成時のみ
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
