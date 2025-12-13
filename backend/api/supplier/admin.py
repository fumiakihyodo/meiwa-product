from django.contrib import admin
from api.supplier.models import Supplier, SupplierBranch, SupplierContact


class SupplierBranchInline(admin.TabularInline):
    """サプライヤー拠点のインライン"""
    model = SupplierBranch
    extra = 0
    fields = ['branch_code', 'branch_name', 'branch_type', 'phone_number', 'email', 'is_active']
    readonly_fields = []


class SupplierContactInline(admin.TabularInline):
    """担当者のインライン"""
    model = SupplierContact
    extra = 0
    fields = ['name', 'department', 'email', 'phone_number', 'responsibility', 'is_primary', 'is_active']
    readonly_fields = []


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    """サプライヤー管理画面"""
    
    list_display = [
        'supplier_code', 'company_name', 'website',
        'active_branches_count', 'is_active', 'created_at'
    ]
    
    list_filter = ['is_active', 'created_at']
    
    search_fields = ['supplier_code', 'company_name']
    
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('supplier_code', 'company_name', 'website')
        }),
        ('その他', {
            'fields': ('notes', 'is_active')
        }),
        ('タイムスタンプ', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [SupplierBranchInline]
    
    def active_branches_count(self, obj):
        """有効な拠点数"""
        return obj.active_branches_count
    active_branches_count.short_description = '有効拠点数'


@admin.register(SupplierBranch)
class SupplierBranchAdmin(admin.ModelAdmin):
    """サプライヤー拠点管理画面"""
    
    list_display = [
        'branch_code', 'supplier', 'branch_name', 'branch_type',
        'phone_number', 'email', 'is_active', 'created_at'
    ]
    
    list_filter = ['branch_type', 'is_active', 'created_at', 'supplier']
    
    search_fields = [
        'branch_code', 'branch_name', 'supplier__company_name',
        'address', 'phone_number', 'email'
    ]
    
    readonly_fields = ['created_at', 'updated_at', 'display_name', 'full_address']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('supplier', 'branch_code', 'branch_name', 'branch_type', 'display_name')
        }),
        ('連絡先情報', {
            'fields': (
                'postal_code', 'address', 'full_address',
                'phone_number', 'fax_number', 'email'
            )
        }),
        ('その他', {
            'fields': ('notes', 'is_active')
        }),
        ('タイムスタンプ', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [SupplierContactInline]
    
    def get_queryset(self, request):
        """最適化されたクエリセット"""
        return super().get_queryset(request).select_related('supplier')


@admin.register(SupplierContact)
class SupplierContactAdmin(admin.ModelAdmin):
    """サプライヤー担当者管理画面"""
    
    list_display = [
        'name', 'branch', 'department', 'position',
        'email', 'phone_number', 'responsibility',
        'is_primary', 'is_active'
    ]
    
    list_filter = [
        'responsibility', 'is_primary', 'is_active',
        'branch__supplier', 'branch'
    ]
    
    search_fields = [
        'name', 'name_kana', 'email', 'phone_number',
        'department', 'branch__branch_name',
        'branch__supplier__company_name'
    ]
    
    readonly_fields = [
        'created_at', 'updated_at',
        'display_name_with_company'
    ]
    
    fieldsets = (
        ('所属情報', {
            'fields': ('branch', 'display_name_with_company')
        }),
        ('基本情報', {
            'fields': ('name', 'name_kana', 'department', 'position')
        }),
        ('連絡先', {
            'fields': (
                'email', 'phone_number',
                'extension_number', 'mobile_number'
            )
        }),
        ('担当業務', {
            'fields': ('responsibility', 'responsibility_detail')
        }),
        ('ステータス', {
            'fields': ('is_primary', 'is_active', 'notes')
        }),
        ('タイムスタンプ', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """最適化されたクエリセット"""
        return super().get_queryset(request).select_related(
            'branch__supplier'
        )
