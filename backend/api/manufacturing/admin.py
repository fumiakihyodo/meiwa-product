# api/manufacturing/admin.py

from django.contrib import admin
from api.manufacturing.models import (
    ManufacturingItem,
    ProductionPlan,
    ProductionSchedule,
    Material,
    MaterialDeliverySchedule,
    ManufacturingMaterial,
    MaterialPriceHistory,
    ManufacturingItemPriceHistory,
)


class ProductionScheduleInline(admin.TabularInline):
    """生産スケジュールインライン"""
    model = ProductionSchedule
    extra = 0
    fields = [
        'schedule_number', 'quantity', 'completed_quantity',
        'started_at', 'finished_at', 'status', 'assigned_to'
    ]
    readonly_fields = ['schedule_number']


class ManufacturingMaterialInline(admin.TabularInline):
    """制作品材料構成インライン"""
    model = ManufacturingMaterial
    extra = 0
    fields = ['material', 'quantity_required', 'notes']
    autocomplete_fields = ['material']


class MaterialDeliveryScheduleInline(admin.TabularInline):
    """材料納入予定インライン"""
    model = MaterialDeliverySchedule
    extra = 0
    fields = ['quantity', 'scheduled_date', 'status', 'actual_date', 'actual_quantity']


class MaterialPriceHistoryInline(admin.TabularInline):
    """材料価格履歴インライン"""
    model = MaterialPriceHistory
    extra = 0
    fields = ['price', 'start_date', 'end_date', 'is_active', 'change_reason']
    readonly_fields = ['created_at', 'created_by']


class ManufacturingItemPriceHistoryInline(admin.TabularInline):
    """製造品価格履歴インライン"""
    model = ManufacturingItemPriceHistory
    extra = 0
    fields = ['price', 'start_date', 'end_date', 'is_active', 'change_reason']
    readonly_fields = ['created_at', 'created_by']


@admin.register(ManufacturingItem)
class ManufacturingItemAdmin(admin.ModelAdmin):
    """制作品管理"""
    list_display = [
        'manufacturing_number', 'manufacturing_name',
        'product', 'unit', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'product', 'created_at']
    search_fields = ['manufacturing_number', 'manufacturing_name', 'specification']
    ordering = ['manufacturing_number']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['product']
    inlines = [ManufacturingMaterialInline, ManufacturingItemPriceHistoryInline]

    fieldsets = (
        ('基本情報', {
            'fields': (
                'manufacturing_number', 'manufacturing_name',
                'product', 'specification'
            )
        }),
        ('製造情報', {
            'fields': ('unit', 'standard_production_time')
        }),
        ('ステータス', {
            'fields': ('is_active', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ProductionPlan)
class ProductionPlanAdmin(admin.ModelAdmin):
    """生産計画管理"""
    list_display = [
        'plan_number', 'manufacturing_item', 'product',
        'total_planned_quantity', 'completed_quantity',
        'status', 'priority', 'planned_start_date', 'planned_end_date'
    ]
    list_filter = ['status', 'priority', 'manufacturing_item', 'product', 'created_at']
    search_fields = ['plan_number', 'manufacturing_item__manufacturing_number', 'notes']
    ordering = ['priority', '-created_at']
    readonly_fields = ['plan_number', 'created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['manufacturing_item', 'product']
    inlines = [ProductionScheduleInline]

    fieldsets = (
        ('基本情報', {
            'fields': (
                'plan_number', 'manufacturing_item', 'product'
            )
        }),
        ('数量', {
            'fields': (
                'total_planned_quantity', 'completed_quantity'
            )
        }),
        ('計画日程', {
            'fields': (
                ('planned_start_date', 'planned_end_date'),
                ('actual_start_date', 'actual_end_date')
            )
        }),
        ('ステータス', {
            'fields': ('status', 'priority', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ProductionSchedule)
class ProductionScheduleAdmin(admin.ModelAdmin):
    """生産スケジュール管理"""
    list_display = [
        'schedule_number', 'plan',
        'quantity', 'completed_quantity',
        'status', 'started_at', 'finished_at', 'assigned_to'
    ]
    list_filter = ['status', 'plan__manufacturing_item', 'assigned_to', 'created_at']
    search_fields = ['schedule_number', 'plan__plan_number', 'notes']
    ordering = ['started_at', 'created_at']
    readonly_fields = ['schedule_number', 'created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['plan', 'assigned_to']

    fieldsets = (
        ('基本情報', {
            'fields': (
                'schedule_number', 'plan'
            )
        }),
        ('数量', {
            'fields': ('quantity', 'completed_quantity')
        }),
        ('日程', {
            'fields': (
                ('started_at', 'finished_at'),
                ('actual_started_at', 'actual_finished_at')
            )
        }),
        ('ステータス', {
            'fields': ('status', 'assigned_to', 'production_line', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    """材料管理"""
    list_display = [
        'material_code', 'material_name', 'material_type', 'category',
        'stock_quantity', 'minimum_stock', 'unit',
        'supplier_branch', 'is_active'
    ]
    list_filter = ['category', 'is_active', 'supplier_branch', 'created_at']
    search_fields = ['material_code', 'material_name', 'material_type', 'specification']
    ordering = ['material_code']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['supplier_branch']
    inlines = [MaterialDeliveryScheduleInline, MaterialPriceHistoryInline]

    fieldsets = (
        ('基本情報', {
            'fields': (
                'material_code', 'material_name',
                'material_type', 'category', 'specification'
            )
        }),
        ('在庫情報', {
            'fields': (
                'unit', 'stock_quantity',
                ('minimum_stock', 'maximum_stock')
            )
        }),
        ('仕入先', {
            'fields': ('supplier_branch', 'unit_price', 'lead_time_days')
        }),
        ('ステータス', {
            'fields': ('is_active', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(MaterialDeliverySchedule)
class MaterialDeliveryScheduleAdmin(admin.ModelAdmin):
    """材料納入予定管理"""
    list_display = [
        'material', 'quantity', 'scheduled_date',
        'status', 'actual_date', 'actual_quantity'
    ]
    list_filter = ['status', 'material', 'scheduled_date']
    search_fields = ['material__material_code', 'material__material_name', 'order_reference']
    ordering = ['scheduled_date']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['material']

    fieldsets = (
        ('納入情報', {
            'fields': (
                'material', 'quantity', 'scheduled_date'
            )
        }),
        ('実績', {
            'fields': ('status', 'actual_date', 'actual_quantity')
        }),
        ('その他', {
            'fields': ('order_reference', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ManufacturingMaterial)
class ManufacturingMaterialAdmin(admin.ModelAdmin):
    """制作品材料構成管理"""
    list_display = [
        'manufacturing_item', 'material',
        'quantity_required', 'created_at'
    ]
    list_filter = ['manufacturing_item', 'material']
    search_fields = [
        'manufacturing_item__manufacturing_number',
        'material__material_code'
    ]
    ordering = ['manufacturing_item', 'material']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['manufacturing_item', 'material']

    fieldsets = (
        ('構成情報', {
            'fields': (
                'manufacturing_item', 'material', 'quantity_required'
            )
        }),
        ('その他', {
            'fields': ('notes',)
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MaterialPriceHistory)
class MaterialPriceHistoryAdmin(admin.ModelAdmin):
    """材料価格履歴管理"""
    list_display = [
        'material', 'price', 'start_date', 'end_date',
        'is_active', 'is_current', 'created_at'
    ]
    list_filter = ['is_active', 'start_date', 'created_at']
    search_fields = ['material__material_code', 'material__material_name', 'change_reason', 'notes']
    ordering = ['-start_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['material']

    fieldsets = (
        ('価格情報', {
            'fields': (
                'material', 'price'
            )
        }),
        ('有効期間', {
            'fields': (
                'start_date', 'end_date', 'is_active'
            )
        }),
        ('変更理由', {
            'fields': ('change_reason', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def is_current(self, obj):
        """現在有効か"""
        return obj.is_current
    is_current.boolean = True
    is_current.short_description = '現在有効'


@admin.register(ManufacturingItemPriceHistory)
class ManufacturingItemPriceHistoryAdmin(admin.ModelAdmin):
    """製造品価格履歴管理"""
    list_display = [
        'manufacturing_item', 'price', 'start_date', 'end_date',
        'is_active', 'is_current', 'created_at'
    ]
    list_filter = ['is_active', 'start_date', 'created_at']
    search_fields = ['manufacturing_item__manufacturing_number', 'manufacturing_item__manufacturing_name', 'change_reason', 'notes']
    ordering = ['-start_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['manufacturing_item']

    fieldsets = (
        ('価格情報', {
            'fields': (
                'manufacturing_item', 'price'
            )
        }),
        ('有効期間', {
            'fields': (
                'start_date', 'end_date', 'is_active'
            )
        }),
        ('変更理由', {
            'fields': ('change_reason', 'notes')
        }),
        ('システム情報', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def is_current(self, obj):
        """現在有効か"""
        return obj.is_current
    is_current.boolean = True
    is_current.short_description = '現在有効'
