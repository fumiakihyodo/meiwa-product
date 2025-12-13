# api/products/admin.py

from django.contrib import admin
from api.products.models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'product_number', 'product_name', 'get_customer_name', 
        'get_branch_name', 'status', 'created_at'
    ]
    list_filter = [
        'status', 'created_at', 
        'customer_branch__customer', 
        'customer_branch__branch_type'
    ]
    search_fields = [
        'product_number', 'product_name', 'description', 
        'customer_branch__customer__company_name',
        'customer_branch__branch_name'
    ]
    ordering = ['product_number']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('product_number', 'product_name', 'description', 'customer_branch')
        }),
        ('ステータス', {
            'fields': ('status',)
        }),
        ('システム情報', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_customer_name(self, obj):
        """顧客名を取得"""
        return obj.customer_branch.customer.company_name if obj.customer_branch else '-'
    get_customer_name.short_description = '顧客名'
    get_customer_name.admin_order_field = 'customer_branch__customer__company_name'
    
    def get_branch_name(self, obj):
        """拠点名を取得"""
        return obj.customer_branch.branch_name if obj.customer_branch else '-'
    get_branch_name.short_description = '拠点名'
    get_branch_name.admin_order_field = 'customer_branch__branch_name'
    
    def parts_count(self, obj):
        """紐づく部品数"""
        return obj.parts.filter(is_active=True).count()
    parts_count.short_description = '部品数'
    
    def save_model(self, request, obj, form, change):
        """保存時に作成者を設定"""
        if not change:  # 新規作成時のみ
            obj.created_by = request.user
        super().save_model(request, obj, form, change)